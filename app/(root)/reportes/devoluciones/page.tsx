'use client';
import { useState, useEffect, useCallback } from 'react';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { RotateCcw, RefreshCw, Search, Filter, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { formatPrecio } from '@/lib/boutique';

interface Devolucion {
  id: string;
  motivo: string;
  tipoRetorno: string;
  monto: number;
  createdAt: string;
  venta: {
    numeroTicket: string;
    cajero: { nombre: string } | null;
    cliente: { nombre: string } | null;
  };
  vale: { codigo: string; saldoActual: number } | null;
}

interface Meta { total: number; pagina: number; totalPaginas: number }

const TIPO_RETORNO: Record<string, { label: string; cls: string }> = {
  EFECTIVO: { label: 'Reembolso efectivo', cls: 'bg-[#6DBF94]/20 text-[#6DBF94]' },
  VALE: { label: 'Vale de crédito', cls: 'bg-[#C9A84C]/20 text-[#C9A84C]' },
  CAMBIO: { label: 'Cambio de prenda', cls: 'bg-[#7EC8E3]/20 text-[#7EC8E3]' },
};

function toDesdeISO(d: string) { return new Date(d + 'T00:00:00').toISOString(); }
function toHastaISO(d: string) { return new Date(d + 'T23:59:59.999').toISOString(); }
function hoyLocal() { return format(new Date(), 'yyyy-MM-dd'); }

export default function DevolucionesPage() {
  const hoy = hoyLocal();
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [totalMonto, setTotalMonto] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);

  // Modal nueva devolución
  const [modalOpen, setModalOpen] = useState(false);
  const [busquedaTicket, setBusquedaTicket] = useState('');
  const [ventaEncontrada, setVentaEncontrada] = useState<any>(null);
  const [buscandoVenta, setBuscandoVenta] = useState(false);
  const [formData, setFormData] = useState({ motivo: '', tipoRetorno: 'EFECTIVO', monto: '' });
  const [guardando, setGuardando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');

  const cargar = useCallback(async (pag = pagina) => {
    setCargando(true);
    try {
      const p = new URLSearchParams({ pagina: pag.toString(), limite: '20' });
      if (desde) p.set('desde', toDesdeISO(desde));
      if (hasta) p.set('hasta', toHastaISO(hasta));
      const res = await fetch(`/api/reportes/devoluciones?${p}`);
      const d = await res.json();
      setDevoluciones(d.data ?? []);
      setMeta(d.meta ?? null);
      setTotalMonto(d.totalMonto ?? 0);
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, pagina]);

  useEffect(() => { cargar(1); }, [desde, hasta]);

  async function buscarVenta() {
    if (!busquedaTicket.trim()) return;
    setBuscandoVenta(true);
    setErrorBusqueda('');
    setVentaEncontrada(null);
    try {
      const res = await fetch(`/api/ventas/buscar?ticket=${encodeURIComponent(busquedaTicket.trim())}`);
      const d = await res.json();
      if (!res.ok || !d.data) {
        setErrorBusqueda('Ticket no encontrado o ya fue devuelto.');
      } else {
        setVentaEncontrada(d.data);
        setFormData((f) => ({ ...f, monto: d.data.total.toString() }));
      }
    } catch {
      setErrorBusqueda('Error de conexión');
    } finally {
      setBuscandoVenta(false);
    }
  }

  async function guardarDevolucion() {
    if (!ventaEncontrada || !formData.motivo || !formData.monto) return;
    setGuardando(true);
    try {
      const res = await fetch('/api/reportes/devoluciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ventaId: ventaEncontrada.id,
          motivo: formData.motivo,
          tipoRetorno: formData.tipoRetorno,
          monto: parseFloat(formData.monto),
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        alert(d.error || 'Error al guardar devolución');
        return;
      }
      setModalOpen(false);
      setBusquedaTicket('');
      setVentaEncontrada(null);
      setFormData({ motivo: '', tipoRetorno: 'EFECTIVO', monto: '' });
      cargar(1);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">Devoluciones</h1>
          <p className="text-sm text-[#9E9E9E] mt-0.5">Gestión de cambios, reembolsos y vales de crédito</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => cargar(pagina)} className="p-2 rounded-xl hover:bg-[#F8E1E7] transition-colors">
            <RefreshCw size={16} className="text-[#9E9E9E]" />
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-boutique-primary flex items-center gap-2 text-sm">
            <RotateCcw size={15} /> Nueva devolución
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card-boutique p-4 flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-1 text-[#9E9E9E] self-center">
          <Filter size={14} />
          <span className="text-xs font-medium">Período</span>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-[#9E9E9E] mb-0.5">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="input-boutique text-sm" />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-[#9E9E9E] mb-0.5">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="input-boutique text-sm" />
        </div>
        {(desde || hasta) && (
          <button onClick={() => { setDesde(''); setHasta(''); }} className="text-xs text-[#9E9E9E] hover:text-[#E57373] mt-4">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* KPI monto */}
      {meta && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card-boutique p-4 text-center bg-[#E57373]/10 border-[#E57373]">
            <p className="text-xl font-mono font-bold text-[#E57373]">{formatPrecio(totalMonto)}</p>
            <p className="text-xs text-[#9E9E9E] mt-0.5">Total devuelto</p>
          </div>
          <div className="card-boutique p-4 text-center">
            <p className="text-xl font-mono font-bold text-[#2C2C2C]">{meta.total}</p>
            <p className="text-xs text-[#9E9E9E] mt-0.5">Devoluciones registradas</p>
          </div>
        </div>
      )}

      {/* Lista */}
      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : devoluciones.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <RotateCcw size={32} className="text-[#E8D5A3] mb-3" />
          <p className="text-sm text-[#9E9E9E]">Sin devoluciones registradas.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {devoluciones.map((dev) => {
            const tipo = TIPO_RETORNO[dev.tipoRetorno] ?? { label: dev.tipoRetorno, cls: '' };
            const fecha = isValid(new Date(dev.createdAt))
              ? format(new Date(dev.createdAt), "dd MMM yyyy HH:mm", { locale: es })
              : '—';
            return (
              <div key={dev.id} className="card-boutique px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-[#2C2C2C]">
                        {dev.venta.numeroTicket}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${tipo.cls}`}>
                        {tipo.label}
                      </span>
                    </div>
                    <p className="text-xs text-[#9E9E9E] truncate">{dev.motivo}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[#9E9E9E]">
                      {dev.venta.cajero && <span>{dev.venta.cajero.nombre}</span>}
                      {dev.venta.cliente && <span className="text-[#C9A84C]">{dev.venta.cliente.nombre}</span>}
                      {dev.vale && (
                        <span className="font-mono text-[#C9A84C]">Vale: {dev.vale.codigo}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-bold text-sm text-[#E57373]">-{formatPrecio(dev.monto)}</p>
                    <p className="text-[10px] text-[#9E9E9E] mt-0.5">{fecha}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginador */}
      {meta && meta.totalPaginas > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-[#9E9E9E]">Página {meta.pagina} de {meta.totalPaginas}</p>
          <div className="flex items-center gap-1">
            <button disabled={pagina === 1} onClick={() => { setPagina(p => p - 1); cargar(pagina - 1); }}
              className="p-1.5 rounded-lg border border-[#F2C4CE] disabled:opacity-40 hover:bg-[#F8E1E7]">
              <ChevronLeft size={14} />
            </button>
            <button disabled={pagina === meta.totalPaginas} onClick={() => { setPagina(p => p + 1); cargar(pagina + 1); }}
              className="p-1.5 rounded-lg border border-[#F2C4CE] disabled:opacity-40 hover:bg-[#F8E1E7]">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal nueva devolución */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-boutique w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#F2C4CE]">
              <h2 className="font-playfair text-lg font-bold text-[#2C2C2C]">Nueva devolución</h2>
              <button onClick={() => { setModalOpen(false); setBusquedaTicket(''); setVentaEncontrada(null); setErrorBusqueda(''); }}
                className="text-[#9E9E9E] hover:text-[#E57373] transition-colors text-xl leading-none">×</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Buscar ticket */}
              <div>
                <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Número de ticket</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={busquedaTicket}
                    onChange={(e) => setBusquedaTicket(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && buscarVenta()}
                    placeholder="TKT-20260609-0001"
                    className="flex-1 input-boutique font-mono text-sm"
                  />
                  <button onClick={buscarVenta} disabled={buscandoVenta}
                    className="btn-boutique-secondary flex items-center gap-1 px-3 text-sm disabled:opacity-60">
                    {buscandoVenta ? <span className="w-4 h-4 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" /> : <Search size={14} />}
                  </button>
                </div>
                {errorBusqueda && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-[#E57373]">
                    <AlertCircle size={13} /> {errorBusqueda}
                  </div>
                )}
              </div>

              {/* Venta encontrada */}
              {ventaEncontrada && (
                <div className="bg-[#F8E1E7] rounded-xl p-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#9E9E9E]">Ticket</span>
                    <span className="font-mono font-bold">{ventaEncontrada.numeroTicket}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9E9E9E]">Total venta</span>
                    <span className="font-mono font-bold text-[#C9A84C]">{formatPrecio(ventaEncontrada.total)}</span>
                  </div>
                  {ventaEncontrada.cliente && (
                    <div className="flex justify-between">
                      <span className="text-[#9E9E9E]">Cliente</span>
                      <span>{ventaEncontrada.cliente.nombre}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Formulario */}
              {ventaEncontrada && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Motivo de devolución</label>
                    <textarea
                      value={formData.motivo}
                      onChange={(e) => setFormData((f) => ({ ...f, motivo: e.target.value }))}
                      rows={2}
                      placeholder="Prenda defectuosa, talla incorrecta..."
                      className="w-full input-boutique resize-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Tipo de retorno</label>
                    <select
                      value={formData.tipoRetorno}
                      onChange={(e) => setFormData((f) => ({ ...f, tipoRetorno: e.target.value }))}
                      className="w-full input-boutique text-sm"
                    >
                      <option value="EFECTIVO">Reembolso en efectivo</option>
                      <option value="VALE">Vale de crédito</option>
                      <option value="CAMBIO">Cambio de prenda</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Monto a devolver (Q)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={ventaEncontrada.total}
                      value={formData.monto}
                      onChange={(e) => setFormData((f) => ({ ...f, monto: e.target.value }))}
                      className="w-full input-boutique font-mono text-sm"
                    />
                    <p className="text-[10px] text-[#9E9E9E] mt-1">Máximo: {formatPrecio(ventaEncontrada.total)}</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { setModalOpen(false); setBusquedaTicket(''); setVentaEncontrada(null); }}
                      className="flex-1 btn-boutique-secondary text-sm py-2.5">
                      Cancelar
                    </button>
                    <button onClick={guardarDevolucion} disabled={guardando || !formData.motivo || !formData.monto}
                      className="flex-1 btn-boutique-danger text-sm py-2.5 disabled:opacity-60 flex items-center justify-center gap-2">
                      {guardando ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <RotateCcw size={14} />}
                      Confirmar devolución
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
