'use client';
import { useState, useEffect, useCallback } from 'react';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Wifi, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
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
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [estado, setEstado] = useState('');
  const [cargando, setCargando] = useState(true);
  const [validandoId, setValidandoId] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<{ nombre: string; rol: string } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const p = new URLSearchParams();
      if (estado) p.set('estado', estado);
      const res = await fetch(`/api/transferencias?${p}`);
      const d = await res.json();
      setTransferencias(d.data ?? []);
    } finally {
      setCargando(false);
    }
  }, [estado]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => { if (d.user) setUsuario(d.user); });
  }, []);

  const puedeValidar = usuario?.rol === 'ADMIN' || usuario?.rol === 'SUPERVISOR';

  async function validar(id: string) {
    setValidandoId(id);
    try {
      const res = await fetch(`/api/transferencias/${id}`, { method: 'PATCH' });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error || 'Error al validar transferencia');
        return;
      }
      toast.success('Transferencia validada correctamente');
      cargar();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setValidandoId(null);
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">Transferencias</h1>
          <p className="text-sm text-[#9E9E9E] mt-0.5">Validación de pagos por transferencia bancaria</p>
        </div>
        <button onClick={cargar} className="p-2 rounded-xl hover:bg-[#F8E1E7] transition-colors">
          <RefreshCw size={16} className="text-[#9E9E9E]" />
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
                ? 'border-[#C9A84C] bg-[#F8E1E7] text-[#C9A84C]'
                : 'border-[#E8D5A3] text-[#2C2C2C] hover:border-[#C9A84C]'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transferencias.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Wifi size={32} className="text-[#E8D5A3] mb-3" />
          <p className="text-sm text-[#9E9E9E]">Sin transferencias registradas.</p>
        </div>
      ) : (
        <div className="card-boutique overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F2C4CE] text-left text-[#9E9E9E] text-xs uppercase">
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
                  <tr key={t.id} className="border-b border-[#F2C4CE] last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-[#2C2C2C]">{t.venta.numeroTicket}</td>
                    <td className="px-4 py-2.5 text-xs text-[#9E9E9E]">{fecha}</td>
                    <td className="px-4 py-2.5 text-xs">{t.venta.cliente?.nombre ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs">{t.banco.nombre}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-[#9E9E9E]">{t.referencia ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-[#C9A84C]">{formatPrecio(t.monto)}</td>
                    <td className="px-4 py-2.5">
                      {t.estado === 'VALIDADA' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#6DBF94]/20 text-[#6DBF94]">
                          <CheckCircle2 size={11} /> Validada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F5C842]/20 text-[#C9A84C]">
                          <Clock size={11} /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {t.estado === 'PENDIENTE_VALIDACION' && puedeValidar && (
                        <button
                          onClick={() => validar(t.id)}
                          disabled={validandoId === t.id}
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
      )}
    </div>
  );
}
