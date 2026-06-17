'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Wifi, RefreshCw, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { formatPrecio } from '@/lib/boutique';
import { toast } from 'react-toastify';

interface Transferencia {
  id: string;
  monto: number;
  referencia: string | null;
  estado: 'PENDIENTE_VALIDACION' | 'VALIDADA';
  validadoEn: string | null;
  createdAt: string;
  venta: {
    numeroTicket: string;
    createdAt: string;
    cliente: { nombre: string } | null;
  };
  banco: { nombre: string; tipo: string };
  validadoPor: { nombre: string } | null;
}

const ESTADO_TABS = [
  { value: '', label: 'Todas' },
  { value: 'PENDIENTE_VALIDACION', label: 'Pendientes' },
  { value: 'VALIDADA', label: 'Validadas' },
] as const;

export default function TransferenciasPage() {
  const router = useRouter();
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [estado, setEstado] = useState('');
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState(false);
  const [validandoId, setValidandoId] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<{ nombre: string; rol: string } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const cargar = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setCargando(true);
    setErrorLista(false);
    try {
      const p = new URLSearchParams();
      if (estado) p.set('estado', estado);
      const res = await fetch(`/api/transferencias?${p}`, { signal: controller.signal });
      const d = await res.json();
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return; }
        throw new Error(d.error || 'Error al cargar transferencias');
      }
      setTransferencias(Array.isArray(d.data) ? d.data : []);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      toast.error('No se pudieron cargar las transferencias. Verifica tu conexión e intenta de nuevo.');
      setErrorLista(true);
    } finally {
      if (abortRef.current === controller) setCargando(false);
    }
  }, [estado, router]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.user) setUsuario(d.user); })
      .catch(() => {});
  }, []);

  const puedeValidar = usuario?.rol === 'ADMIN' || usuario?.rol === 'SUPERVISOR';

  async function validar(id: string) {
    if (validandoId) return;
    setValidandoId(id);
    try {
      const res = await fetch(`/api/transferencias/${id}`, { method: 'PATCH' });
      const d = await res.json();
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return; }
        toast.error(d.error || 'Error al validar transferencia');
        return;
      }
      toast.success('Transferencia validada correctamente');
      cargar();
    } catch {
      toast.error('Error de conexión al validar la transferencia. Intenta de nuevo.');
    } finally {
      setValidandoId(null);
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-boutique-dark">Transferencias</h1>
          <p className="text-sm text-boutique-gray-mid mt-0.5">Validación de pagos por transferencia bancaria</p>
        </div>
        <button onClick={cargar} className="p-2 rounded-xl hover:bg-blush-light transition-colors min-w-[44px] min-h-[44px]">
          <RefreshCw size={16} className="text-boutique-gray-mid" />
        </button>
      </div>

      {/* Tabs estado */}
      <div className="flex gap-2">
        {ESTADO_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setEstado(t.value)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border-2
              ${estado === t.value
                ? 'border-gold bg-blush-light text-gold'
                : 'border-gold-light text-boutique-dark hover:border-gold'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : errorLista ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle size={28} className="text-boutique-danger mb-3" />
          <p className="text-sm font-semibold text-boutique-dark mb-1">No pudimos cargar las transferencias</p>
          <p className="text-xs text-boutique-gray-mid mb-4">Verifica tu conexión e intenta de nuevo.</p>
          <button onClick={cargar} className="btn-boutique-primary text-sm px-4 py-2 flex items-center gap-2">
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      ) : transferencias.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Wifi size={32} className="text-gold-light mb-3" />
          <p className="text-sm text-boutique-gray-mid">
            {estado ? 'No hay transferencias en este estado.' : 'Sin transferencias registradas.'}
          </p>
        </div>
      ) : (
        <div className="card-boutique overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blush text-left text-boutique-gray-mid text-xs uppercase">
                <th className="px-4 py-2.5">Ticket</th>
                <th className="px-4 py-2.5">Fecha</th>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5">Banco</th>
                <th className="px-4 py-2.5">Referencia</th>
                <th className="px-4 py-2.5 text-right">Monto</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {transferencias.map((t) => {
                const fecha = isValid(new Date(t.venta.createdAt))
                  ? format(new Date(t.venta.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })
                  : '—';
                return (
                  <tr key={t.id} className="border-b border-blush last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-boutique-dark whitespace-nowrap">{t.venta.numeroTicket}</td>
                    <td className="px-4 py-2.5 text-xs text-boutique-gray-mid whitespace-nowrap">{fecha}</td>
                    <td className="px-4 py-2.5 text-xs max-w-[160px] truncate" title={t.venta.cliente?.nombre ?? undefined}>{t.venta.cliente?.nombre ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs max-w-[140px] truncate" title={t.banco.nombre}>{t.banco.nombre}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-boutique-gray-mid max-w-[140px] truncate" title={t.referencia ?? undefined}>{t.referencia ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-gold whitespace-nowrap">{formatPrecio(t.monto)}</td>
                    <td className="px-4 py-2.5">
                      {t.estado === 'VALIDADA' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-boutique-success/20 text-boutique-success">
                          <CheckCircle2 size={11} /> Validada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-boutique-warning/20 text-gold">
                          <Clock size={11} /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {t.estado === 'PENDIENTE_VALIDACION' && puedeValidar && (
                        <button
                          onClick={() => validar(t.id)}
                          disabled={validandoId !== null}
                          aria-busy={validandoId === t.id}
                          className="btn-boutique-primary text-xs px-3 py-1.5 disabled:opacity-60"
                        >
                          {validandoId === t.id ? '...' : 'Validar'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
