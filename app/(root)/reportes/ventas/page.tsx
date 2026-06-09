'use client';
import { useState, useEffect, useCallback } from 'react';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { RefreshCw, Search, Receipt, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatPrecio } from '@/lib/boutique';

interface DetalleVenta {
  cantidad: number;
  subtotal: number;
  variante: {
    sku: string;
    talla: string | null;
    color: string | null;
    producto: { nombre: string };
  };
}

interface PagoVenta {
  metodo: string;
  monto: number;
  referencia?: string | null;
}

interface Venta {
  id: string;
  numeroTicket: string;
  total: number;
  subtotal: number;
  descuentoGlobal: number;
  metodoPago: string;
  estado: string;
  createdAt: string;
  cajero: { nombre: string } | null;
  cliente: { nombre: string } | null;
  detalles: DetalleVenta[];
  pagos: PagoVenta[];
}

interface Resumen { total: number; cantidad: number; promedio: number }
interface Meta { total: number; pagina: number; limite: number; totalPaginas: number }

const ESTADOS: Record<string, { label: string; cls: string }> = {
  COMPLETADA: { label: 'Completada', cls: 'bg-[#6DBF94]/20 text-[#6DBF94]' },
  ANULADA: { label: 'Anulada', cls: 'bg-[#E57373]/20 text-[#E57373]' },
  DEVOLUCION_PARCIAL: { label: 'Dev. parcial', cls: 'bg-[#F5C842]/20 text-[#2C2C2C]' },
};
const METODOS = ['', 'EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO', 'VALE_CREDITO'];
const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transf.',
  MIXTO: 'Mixto', VALE_CREDITO: 'Vale', '': 'Todos',
};

function hoyLocal() {
  return format(new Date(), 'yyyy-MM-dd');
}

// Convert local date string to UTC-aware ISO — handles timezone correctly
function toDesdeISO(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toISOString();
}
function toHastaISO(dateStr: string) {
  const d = new Date(dateStr + 'T23:59:59.999');
  return d.toISOString();
}

export default function VentasReportePage() {
  const hoy = hoyLocal();
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [metodo, setMetodo] = useState('');
  const [pagina, setPagina] = useState(1);

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  const cargar = useCallback(async (pag = pagina) => {
    setCargando(true);
    try {
      const p = new URLSearchParams({
        desde: toDesdeISO(desde),
        hasta: toHastaISO(hasta),
        pagina: pag.toString(),
        limite: '20',
      });
      if (metodo) p.set('metodo', metodo);
      const res = await fetch(`/api/reportes/ventas?${p}`);
      const d = await res.json();
      setVentas(d.data ?? []);
      setResumen(d.resumen ?? null);
      setMeta(d.meta ?? null);
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, metodo, pagina]);

  useEffect(() => { cargar(1); setPagina(1); }, [desde, hasta, metodo]);

  function buscar() { cargar(1); setPagina(1); }

  function cambiarPagina(nueva: number) {
    setPagina(nueva);
    cargar(nueva);
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">Historial de ventas</h1>
          <p className="text-sm text-[#9E9E9E] mt-0.5">Consulta y filtra todas las transacciones</p>
        </div>
        <button onClick={() => cargar(pagina)} className="p-2 rounded-xl hover:bg-[#F8E1E7] transition-colors">
          <RefreshCw size={16} className="text-[#9E9E9E]" />
        </button>
      </div>

      {/* Filtros */}
      <div className="card-boutique p-4 flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-1 text-[#9E9E9E] self-center">
          <Filter size={14} />
          <span className="text-xs font-medium">Filtros</span>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-[#9E9E9E] mb-0.5">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="input-boutique text-sm" />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-[#9E9E9E] mb-0.5">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="input-boutique text-sm" />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-[#9E9E9E] mb-0.5">Método de pago</label>
          <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className="input-boutique text-sm">
            {METODOS.map((m) => <option key={m} value={m}>{METODO_LABEL[m]}</option>)}
          </select>
        </div>
        <button onClick={buscar} className="btn-boutique-primary flex items-center gap-2 text-sm py-2">
          <Search size={14} /> Buscar
        </button>
      </div>

      {/* Resumen KPIs */}
      {resumen && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total facturado', value: formatPrecio(resumen.total), gold: true },
            { label: 'Transacciones', value: resumen.cantidad.toString() },
            { label: 'Ticket promedio', value: formatPrecio(resumen.promedio) },
          ].map((k) => (
            <div key={k.label} className={`card-boutique p-4 text-center ${k.gold ? 'bg-[#F8E1E7]' : ''}`}>
              <p className={`text-xl font-mono font-bold ${k.gold ? 'text-[#C9A84C]' : 'text-[#2C2C2C]'}`}>{k.value}</p>
              <p className="text-xs text-[#9E9E9E] mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista */}
      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : ventas.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Receipt size={32} className="text-[#E8D5A3] mb-3" />
          <p className="text-sm text-[#9E9E9E]">Sin ventas para este período.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ventas.map((v) => {
            const estado = ESTADOS[v.estado] ?? { label: v.estado, cls: '' };
            const abierto = expandido === v.id;
            const fecha = isValid(new Date(v.createdAt))
              ? format(new Date(v.createdAt), 'dd/MM HH:mm', { locale: es })
              : '—';
            return (
              <div key={v.id} className="card-boutique overflow-hidden">
                <button
                  onClick={() => setExpandido(abierto ? null : v.id)}
                  className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-[#2C2C2C] flex-shrink-0">{v.numeroTicket}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${estado.cls}`}>{estado.label}</span>
                    <span className="text-xs text-[#9E9E9E] flex-shrink-0">{METODO_LABEL[v.metodoPago] ?? v.metodoPago}</span>
                    {v.cajero && <span className="text-xs text-[#9E9E9E] truncate hidden sm:block">{v.cajero.nombre}</span>}
                    {v.cliente && <span className="text-xs text-[#C9A84C] truncate hidden md:block">{v.cliente.nombre}</span>}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="font-mono font-bold text-sm text-[#C9A84C]">{formatPrecio(v.total)}</span>
                    <span className="text-[10px] text-[#9E9E9E]">{fecha}</span>
                    <svg className={`w-4 h-4 text-[#9E9E9E] transition-transform ${abierto ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {abierto && (
                  <div className="border-t border-[#F2C4CE] px-4 py-3 space-y-2 bg-[#FAFAFA]">
                    {/* Detalles de prendas */}
                    <div className="space-y-1.5">
                      {(v.detalles ?? []).map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-[#2C2C2C]">
                            {d.cantidad}× {d.variante.producto.nombre}
                            {(d.variante.talla || d.variante.color) && (
                              <span className="text-[#9E9E9E] ml-1">({[d.variante.talla, d.variante.color].filter(Boolean).join(' / ')})</span>
                            )}
                          </span>
                          <span className="font-mono text-[#9E9E9E]">{formatPrecio(d.subtotal)}</span>
                        </div>
                      ))}
                    </div>

                    {v.descuentoGlobal > 0 && (
                      <div className="flex justify-between text-xs text-[#E57373]">
                        <span>Descuento global</span>
                        <span className="font-mono">-{formatPrecio(v.descuentoGlobal)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-bold pt-1 border-t border-[#F2C4CE]">
                      <span className="text-[#2C2C2C]">Total</span>
                      <span className="font-mono text-[#C9A84C]">{formatPrecio(v.total)}</span>
                    </div>

                    {/* Pagos */}
                    {(v.pagos ?? []).length > 0 && (
                      <div className="pt-1 space-y-0.5">
                        {v.pagos.map((p, i) => (
                          <div key={i} className="flex justify-between text-xs text-[#9E9E9E]">
                            <span>{METODO_LABEL[p.metodo] ?? p.metodo}{p.referencia ? ` · ${p.referencia}` : ''}</span>
                            <span className="font-mono">{formatPrecio(p.monto)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Paginador */}
      {meta && meta.totalPaginas > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-[#9E9E9E]">
            {meta.total} ventas · página {meta.pagina} de {meta.totalPaginas}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={pagina === 1}
              onClick={() => cambiarPagina(pagina - 1)}
              className="p-1.5 rounded-lg border border-[#F2C4CE] disabled:opacity-40 hover:bg-[#F8E1E7] transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(meta.totalPaginas, 5) }, (_, i) => {
              const pg = pagina <= 3 ? i + 1 : pagina - 2 + i;
              if (pg < 1 || pg > meta.totalPaginas) return null;
              return (
                <button
                  key={pg}
                  onClick={() => cambiarPagina(pg)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${pg === pagina ? 'bg-[#C9A84C] text-white' : 'border border-[#F2C4CE] hover:bg-[#F8E1E7]'}`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              disabled={pagina === meta.totalPaginas}
              onClick={() => cambiarPagina(pagina + 1)}
              className="p-1.5 rounded-lg border border-[#F2C4CE] disabled:opacity-40 hover:bg-[#F8E1E7] transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
