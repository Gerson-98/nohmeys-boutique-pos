'use client';
import { useState, useEffect } from 'react';
import {
  DollarSign, Lock, Unlock, RefreshCw, CreditCard, Banknote,
  AlertTriangle, CheckCircle, ChevronDown, Wifi, X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { formatPrecio } from '@/lib/boutique';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const SESSION_KEY = 'pos_cajero';

interface Pago { metodo: string; monto: number; referencia?: string | null }
interface DetalleItem {
  cantidad: number; subtotal: number;
  variante: { sku: string; talla: string | null; color: string | null; producto: { nombre: string } };
}
interface VentaCaja {
  id: string;
  numeroTicket: string;
  total: number;
  estado: string;
  metodoPago: string;
  createdAt: string;
  cajero: { nombre: string } | null;
  cliente: { nombre: string } | null;
  pagos: Pago[];
  detalles: DetalleItem[];
}

interface ResumenCaja {
  cantidadVentas: number;
  totalVentas: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  totalTransferenciaPendiente: number;
}

interface CajaActual {
  id: string;
  fondoInicial: number;
  abiertaEn: string;
  cajero: { nombre: string };
  resumen: ResumenCaja;
  ventas: VentaCaja[];
}

const METODO_ICON: Record<string, React.ReactNode> = {
  EFECTIVO: <Banknote size={13} className="text-[#6DBF94]" />,
  TARJETA: <CreditCard size={13} className="text-[#7EC8E3]" />,
  TRANSFERENCIA: <Wifi size={13} className="text-[#C9A84C]" />,
  MIXTO: <DollarSign size={13} className="text-[#9E9E9E]" />,
  VALE_CREDITO: <CheckCircle size={13} className="text-[#F2C4CE]" />,
};
const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Depósito/Transf.', MIXTO: 'Mixto', VALE_CREDITO: 'Vale',
};

export default function CajaPage() {
  const [caja, setCaja] = useState<CajaActual | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fondoInicial, setFondoInicial] = useState<number>(0);
  const [efectivoFisico, setEfectivoFisico] = useState<number | ''>('');
  const [notasCierre, setNotasCierre] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const cajeroStored = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
  const cajero = cajeroStored ? JSON.parse(cajeroStored) : null;

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await fetch('/api/caja');
      const d = await res.json();
      setCaja(d.data);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  async function abrirCaja() {
    if (!cajero) { toast.error('Debes seleccionar un cajero en el POS primero'); return; }
    setProcesando(true);
    try {
      const res = await fetch('/api/caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cajeroId: cajero.id, fondoInicial }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success('Caja abierta correctamente');
      cargar();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcesando(false);
    }
  }

  async function cerrarCaja() {
    if (!caja) return;
    setProcesando(true);
    setPreviewOpen(false);
    try {
      const res = await fetch(`/api/caja/${caja.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          efectivoFisico: efectivoFisico !== '' ? efectivoFisico : null,
          notas: notasCierre,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success('Caja cerrada correctamente');
      setCaja(null);
      setEfectivoFisico('');
      setNotasCierre('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcesando(false);
    }
  }

  const efectivoEsperado = caja ? caja.fondoInicial + caja.resumen.totalEfectivo : 0;
  const diferencia = efectivoFisico !== '' ? (efectivoFisico as number) - efectivoEsperado : null;

  return (
    <>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">Caja</h1>
            <p className="text-sm text-[#9E9E9E] mt-0.5">Gestión del turno de ventas</p>
          </div>
          <button onClick={cargar} className="p-2 rounded-xl hover:bg-[#F8E1E7] transition-colors">
            <RefreshCw size={16} className="text-[#9E9E9E]" />
          </button>
        </div>

        {cargando ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !caja ? (
          /* ── APERTURA DE CAJA ── */
          <div className="card-boutique p-6 max-w-sm mx-auto text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-[#F2C4CE] flex items-center justify-center mx-auto">
              <Unlock size={24} className="text-[#C9A84C]" />
            </div>
            <div>
              <h2 className="font-playfair text-lg font-semibold text-[#2C2C2C]">Caja cerrada</h2>
              <p className="text-sm text-[#9E9E9E] mt-1">Ingresa el fondo inicial para iniciar el turno.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1 text-left">Fondo inicial (Q)</label>
              <input
                type="number" min={0} step={0.01}
                value={fondoInicial}
                onChange={(e) => setFondoInicial(parseFloat(e.target.value) || 0)}
                className="w-full input-boutique font-mono text-center text-lg"
                placeholder="0.00" autoFocus
              />
            </div>
            {cajero && <p className="text-xs text-[#9E9E9E]">Cajero: <strong>{cajero.nombre}</strong></p>}
            <button
              onClick={abrirCaja} disabled={procesando || !cajero}
              className="w-full btn-boutique-primary py-3 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {procesando ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Unlock size={16} />}
              Abrir caja
            </button>
            {!cajero && <p className="text-xs text-[#E57373]">Ve al POS y selecciona tu nombre primero.</p>}
          </div>
        ) : (
          /* ── CAJA ABIERTA ── */
          <div className="space-y-4">
            {/* Estado */}
            <div className="card-boutique p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#6DBF94]/20 flex items-center justify-center">
                  <CheckCircle size={20} className="text-[#6DBF94]" />
                </div>
                <div>
                  <p className="font-semibold text-[#2C2C2C] text-sm">Caja abierta</p>
                  <p className="text-xs text-[#9E9E9E]">
                    {caja.cajero.nombre} · desde {isValid(new Date(caja.abiertaEn)) ? format(new Date(caja.abiertaEn), "HH:mm 'del' dd/MM", { locale: es }) : '—'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#9E9E9E]">Fondo inicial</p>
                <p className="font-mono font-bold text-[#2C2C2C]">{formatPrecio(caja.fondoInicial)}</p>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total ventas', value: formatPrecio(caja.resumen.totalVentas), icon: <DollarSign size={16} className="text-[#C9A84C]" />, highlight: true },
                { label: 'Transacciones', value: caja.resumen.cantidadVentas.toString(), icon: <CheckCircle size={16} className="text-[#6DBF94]" /> },
                { label: 'Efectivo en caja', value: formatPrecio(caja.resumen.totalEfectivo), icon: <Banknote size={16} className="text-[#9E9E9E]" /> },
                { label: 'Tarjeta/Transf. validadas', value: formatPrecio(caja.resumen.totalTarjeta + caja.resumen.totalTransferencia), icon: <CreditCard size={16} className="text-[#9E9E9E]" /> },
              ].map((k) => (
                <div key={k.label} className={`card-boutique p-4 ${k.highlight ? 'bg-[#F8E1E7]' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">{k.icon}<span className="text-xs text-[#9E9E9E]">{k.label}</span></div>
                  <p className="font-mono font-bold text-[#2C2C2C] text-lg">{k.value}</p>
                </div>
              ))}
            </div>

            {/* Transferencias pendientes (informativo) */}
            {caja.resumen.totalTransferenciaPendiente > 0 && (
              <div className="card-boutique p-4 flex items-center gap-3 bg-[#F5C842]/10 border border-[#F5C842]">
                <AlertTriangle size={18} className="text-[#F5C842] flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#2C2C2C]">
                    Transferencias pendientes de validación: <span className="font-mono font-bold">{formatPrecio(caja.resumen.totalTransferenciaPendiente)}</span>
                  </p>
                  <p className="text-xs text-[#9E9E9E]">Este monto es informativo y no se incluye en el cierre hasta validarse.</p>
                </div>
              </div>
            )}

            {/* Historial de movimientos */}
            <div className="card-boutique overflow-hidden">
              <div className="px-4 py-3 border-b border-[#F2C4CE] flex items-center justify-between bg-[#FAFAFA]">
                <h2 className="font-playfair text-base font-semibold text-[#2C2C2C]">Movimientos del turno</h2>
                <span className="text-xs text-[#9E9E9E]">{caja.ventas.length} transacción{caja.ventas.length !== 1 ? 'es' : ''}</span>
              </div>
              {caja.ventas.length === 0 ? (
                <p className="text-sm text-[#9E9E9E] text-center py-8">Sin ventas registradas en este turno.</p>
              ) : (
                <div className="divide-y divide-[#F2C4CE]">
                  {caja.ventas.map((v) => {
                    const abierto = expandido === v.id;
                    const hora = isValid(new Date(v.createdAt)) ? format(new Date(v.createdAt), 'HH:mm') : '—';
                    return (
                      <div key={v.id}>
                        <button
                          onClick={() => setExpandido(abierto ? null : v.id)}
                          className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs text-[#9E9E9E] flex-shrink-0 font-mono">{hora}</span>
                            <span className="font-mono text-xs font-bold text-[#2C2C2C] flex-shrink-0">{v.numeroTicket}</span>
                            {v.cliente && <span className="text-xs text-[#C9A84C] truncate hidden sm:block">{v.cliente.nombre}</span>}
                            <span className="hidden sm:flex items-center gap-1 text-[10px] text-[#9E9E9E]">
                              {METODO_ICON[v.metodoPago]} {METODO_LABEL[v.metodoPago] ?? v.metodoPago}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="font-mono font-bold text-sm text-[#C9A84C]">{formatPrecio(v.total)}</span>
                            <ChevronDown size={14} className={`text-[#9E9E9E] transition-transform ${abierto ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        {abierto && (
                          <div className="px-4 pb-3 pt-1 bg-[#FAFAFA] space-y-1">
                            {/* Prendas */}
                            {v.detalles.map((d, i) => (
                              <div key={i} className="flex justify-between text-xs">
                                <span className="text-[#2C2C2C]">
                                  {d.cantidad}× {d.variante.producto.nombre}
                                  {(d.variante.talla || d.variante.color) && (
                                    <span className="text-[#9E9E9E] ml-1">({[d.variante.talla, d.variante.color].filter(Boolean).join('/')})</span>
                                  )}
                                </span>
                                <span className="font-mono text-[#9E9E9E]">{formatPrecio(d.subtotal)}</span>
                              </div>
                            ))}
                            {/* Pagos desglosados */}
                            <div className="mt-2 pt-2 border-t border-[#F2C4CE] space-y-0.5">
                              {v.pagos.map((p, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1.5 text-[#9E9E9E]">
                                    {METODO_ICON[p.metodo]} {METODO_LABEL[p.metodo] ?? p.metodo}
                                    {p.referencia && <span className="font-mono text-[10px]">#{p.referencia}</span>}
                                  </span>
                                  <span className="font-mono text-[#2C2C2C]">{formatPrecio(p.monto)}</span>
                                </div>
                              ))}
                            </div>
                            {v.cajero && (
                              <p className="text-[10px] text-[#9E9E9E] pt-1">Atendido por: {v.cajero.nombre}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cierre de caja */}
            <div className="card-boutique p-5 space-y-4">
              <h2 className="font-playfair text-lg font-semibold text-[#2C2C2C] flex items-center gap-2">
                <Lock size={18} className="text-[#C9A84C]" /> Cerrar caja
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Efectivo físico contado (Q)</label>
                  <input
                    type="number" min={0} step={0.01}
                    value={efectivoFisico}
                    onChange={(e) => setEfectivoFisico(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full input-boutique font-mono text-center text-lg"
                    placeholder={formatPrecio(efectivoEsperado)}
                  />
                  <p className="text-xs text-[#9E9E9E] mt-1">
                    Esperado: <span className="font-mono">{formatPrecio(efectivoEsperado)}</span> (fondo + ventas en efectivo)
                  </p>
                </div>
                <div>
                  {diferencia !== null && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                      diferencia === 0 ? 'bg-[#6DBF94]/10 border-[#6DBF94]' : diferencia > 0 ? 'bg-[#7EC8E3]/10 border-[#7EC8E3]' : 'bg-[#E57373]/10 border-[#E57373]'
                    }`}>
                      <AlertTriangle size={20} className={diferencia < 0 ? 'text-[#E57373]' : diferencia > 0 ? 'text-[#7EC8E3]' : 'text-[#6DBF94]'} />
                      <div>
                        <p className="text-xs font-medium text-[#2C2C2C]">
                          {diferencia === 0 ? 'Caja cuadrada ✓' : diferencia > 0 ? 'Sobrante' : 'Faltante'}
                        </p>
                        <p className={`font-mono font-bold text-lg ${diferencia < 0 ? 'text-[#E57373]' : diferencia > 0 ? 'text-[#7EC8E3]' : 'text-[#6DBF94]'}`}>
                          {diferencia > 0 ? '+' : ''}{formatPrecio(Math.abs(diferencia))}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Notas del cierre (opcional)</label>
                <textarea
                  value={notasCierre} onChange={(e) => setNotasCierre(e.target.value)}
                  rows={2} className="w-full input-boutique resize-none text-sm"
                  placeholder="Observaciones del turno..."
                />
              </div>
              <button
                onClick={() => setPreviewOpen(true)} disabled={procesando}
                className="w-full btn-boutique-danger flex items-center justify-center gap-2 py-3 disabled:opacity-60"
              >
                {procesando ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock size={16} />}
                Cerrar caja del turno
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL VISTA PREVIA DE CIERRE ── */}
      {caja && (
        <Dialog open={previewOpen} onOpenChange={(v) => !v && setPreviewOpen(false)}>
          <DialogContent className="max-w-md rounded-2xl border border-[#F2C4CE] p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b border-[#F2C4CE] bg-[#FAFAFA] flex flex-row items-center justify-between">
              <DialogTitle className="font-playfair text-lg font-bold text-[#2C2C2C]">
                Resumen del turno
              </DialogTitle>
              <button onClick={() => setPreviewOpen(false)} className="p-1 rounded-lg hover:bg-[#F2C4CE] transition-colors">
                <X size={16} className="text-[#9E9E9E]" />
              </button>
            </DialogHeader>

            <div className="p-6 space-y-4">
              <p className="text-xs text-[#9E9E9E] text-center">
                ¿Estás seguro de cerrar la caja? Revisa el resumen antes de confirmar.
              </p>

              {/* Desglose por método */}
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide">Ingresos por método</h3>
                {[
                  { label: 'Efectivo (neto, sin cambio)', value: caja.resumen.totalEfectivo, icon: <Banknote size={14} className="text-[#6DBF94]" /> },
                  { label: 'Tarjeta', value: caja.resumen.totalTarjeta, icon: <CreditCard size={14} className="text-[#7EC8E3]" /> },
                  { label: 'Transf. validadas', value: caja.resumen.totalTransferencia, icon: <Wifi size={14} className="text-[#C9A84C]" /> },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-[#2C2C2C]">{r.icon}{r.label}</span>
                    <span className="font-mono text-sm">{formatPrecio(r.value)}</span>
                  </div>
                ))}
                <div className="border-t border-[#F2C4CE] pt-2 flex justify-between font-bold">
                  <span className="text-sm text-[#2C2C2C]">Total facturado</span>
                  <span className="font-mono text-[#C9A84C]">{formatPrecio(caja.resumen.totalVentas)}</span>
                </div>
                {caja.resumen.totalTransferenciaPendiente > 0 && (
                  <div className="flex items-center justify-between text-xs text-[#9E9E9E] pt-1">
                    <span>Transf. pendientes (informativo)</span>
                    <span className="font-mono">{formatPrecio(caja.resumen.totalTransferenciaPendiente)}</span>
                  </div>
                )}
              </div>

              {/* Conteo de efectivo */}
              <div className="bg-[#FAFAFA] border border-[#F2C4CE] rounded-xl p-4 space-y-1.5">
                <h3 className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide mb-2">Arqueo de efectivo</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-[#9E9E9E]">Fondo inicial</span>
                  <span className="font-mono">{formatPrecio(caja.fondoInicial)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#9E9E9E]">Cobrado en efectivo</span>
                  <span className="font-mono">+{formatPrecio(caja.resumen.totalEfectivo)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-[#F2C4CE] pt-1">
                  <span className="text-[#2C2C2C]">Efectivo esperado</span>
                  <span className="font-mono">{formatPrecio(efectivoEsperado)}</span>
                </div>
                {efectivoFisico !== '' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#9E9E9E]">Efectivo físico contado</span>
                      <span className="font-mono">{formatPrecio(efectivoFisico as number)}</span>
                    </div>
                    <div className={`flex justify-between text-sm font-bold border-t border-[#F2C4CE] pt-1 ${diferencia === 0 ? 'text-[#6DBF94]' : diferencia! > 0 ? 'text-[#7EC8E3]' : 'text-[#E57373]'}`}>
                      <span>{diferencia === 0 ? 'Caja cuadrada ✓' : diferencia! > 0 ? 'Sobrante' : 'Faltante'}</span>
                      <span className="font-mono">{diferencia! > 0 ? '+' : ''}{formatPrecio(Math.abs(diferencia ?? 0))}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setPreviewOpen(false)} className="flex-1 btn-boutique-secondary py-2.5 text-sm">
                  Cancelar
                </button>
                <button
                  onClick={cerrarCaja} disabled={procesando}
                  className="flex-1 btn-boutique-danger py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {procesando
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Lock size={15} />
                  }
                  Confirmar cierre
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
