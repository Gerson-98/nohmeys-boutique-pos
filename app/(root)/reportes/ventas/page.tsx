'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { RefreshCw, Receipt, Filter, ChevronLeft, ChevronRight, Download, Ban, AlertTriangle, Printer, Search } from 'lucide-react';
import { ReceiptModal, type VentaDetalle } from '@/app/(root)/pos/components/ReceiptModal';
import { toast } from 'react-toastify';
import { formatPrecio } from '@/lib/boutique';
import { useShopConfig } from '@/lib/useShopConfig';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  impuesto: number;
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
  COMPLETADA: { label: 'Completada', cls: 'bg-boutique-success/20 text-boutique-success' },
  ANULADA: { label: 'Anulada', cls: 'bg-boutique-danger/20 text-boutique-danger' },
  DEVOLUCION_PARCIAL: { label: 'Dev. parcial', cls: 'bg-boutique-warning/20 text-boutique-dark' },
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
  const router = useRouter();
  const config = useShopConfig();
  const hoy = hoyLocal();
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [metodo, setMetodo] = useState('');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const [ventaImprimiendo, setVentaImprimiendo] = useState<VentaDetalle | null>(null);
  const [cargandoRecibo, setCargandoRecibo] = useState<string | null>(null);

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errorLista, setErrorLista] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [ventaAnular, setVentaAnular] = useState<Venta | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const rangoInvalido = desde > hasta;

  async function abrirRecibo(ventaId: string) {
    setCargandoRecibo(ventaId);
    try {
      const res = await fetch(`/api/ventas/${ventaId}`);
      const d = await res.json();
      if (res.ok) setVentaImprimiendo(d.data as VentaDetalle);
      else toast.error(d.error || 'No se pudo cargar el comprobante');
    } catch {
      toast.error('Error de conexión al cargar el comprobante');
    } finally {
      setCargandoRecibo(null);
    }
  }

  const cargar = useCallback(async (pag = pagina) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setCargando(true);
    setErrorLista(false);
    try {
      const p = new URLSearchParams({
        desde: toDesdeISO(desde),
        hasta: toHastaISO(hasta),
        pagina: pag.toString(),
        limite: '20',
      });
      if (metodo) p.set('metodo', metodo);
      if (q.trim()) p.set('q', q.trim());
      const res = await fetch(`/api/reportes/ventas?${p}`, { signal: controller.signal });
      const d = await res.json();
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return; }
        throw new Error(d.error || 'Error al cargar ventas');
      }
      setVentas(d.data ?? []);
      setResumen(d.resumen ?? null);
      setMeta(d.meta ?? null);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      console.error('Error al cargar ventas:', e);
      toast.error('No se pudieron cargar las ventas. Verifica tu conexión e intenta de nuevo.');
      setErrorLista(true);
    } finally {
      if (abortRef.current === controller) setCargando(false);
    }
  }, [desde, hasta, metodo, q, pagina, router]);

  const qDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleQ(value: string) {
    setQ(value);
    if (qDebounceRef.current) clearTimeout(qDebounceRef.current);
    qDebounceRef.current = setTimeout(() => { setPagina(1); cargar(1); }, 350);
  }

  useEffect(() => {
    setPagina(1);
    if (rangoInvalido) {
      abortRef.current?.abort();
      setVentas([]);
      setResumen(null);
      setMeta(null);
      setErrorLista(false);
      setCargando(false);
      return;
    }
    cargar(1);
  }, [desde, hasta, metodo]);

  useEffect(() => () => { if (qDebounceRef.current) clearTimeout(qDebounceRef.current); }, []);

  function irAAnular(venta: Venta) {
    router.push(`/reportes/devoluciones?anular=${encodeURIComponent(venta.numeroTicket)}`);
  }

  function cambiarPagina(nueva: number) {
    setPagina(nueva);
    cargar(nueva);
  }

  async function descargarExcel() {
    if (rangoInvalido) {
      toast.warning('Corrige el rango de fechas antes de exportar.');
      return;
    }
    setExportando(true);
    try {
      const p = new URLSearchParams({
        desde: toDesdeISO(desde),
        hasta: toHastaISO(hasta),
        exportar: 'true',
      });
      if (metodo) p.set('metodo', metodo);
      const res = await fetch(`/api/reportes/ventas?${p}`);
      const d = await res.json();
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return; }
        throw new Error(d.error || 'Error al exportar');
      }
      const todasVentas: Venta[] = d.data ?? [];

      if (todasVentas.length === 0) {
        toast.info('No hay ventas para exportar en este rango de fechas');
        return;
      }

      const filas = todasVentas.map((v) => {
        const fechaObj = new Date(v.createdAt);
        const productos = (v.detalles ?? [])
          .map((det) => {
            const variante = [det.variante.talla, det.variante.color].filter(Boolean).join('/');
            return `${det.cantidad}x ${det.variante.producto.nombre}${variante ? ` (${variante})` : ''}`;
          })
          .join('; ');

        return {
          'No. Ticket': v.numeroTicket,
          Fecha: isValid(fechaObj) ? format(fechaObj, 'dd/MM/yyyy') : '',
          Hora: isValid(fechaObj) ? format(fechaObj, 'HH:mm') : '',
          Cliente: v.cliente?.nombre ?? '',
          Cajero: v.cajero?.nombre ?? '',
          Productos: productos,
          'Método de Pago': METODO_LABEL[v.metodoPago] ?? v.metodoPago,
          Subtotal: v.subtotal,
          Descuento: v.descuentoGlobal,
          IVA: v.impuesto ?? 0,
          Total: v.total,
          Estado: ESTADOS[v.estado]?.label ?? v.estado,
        };
      });

      const xlsx = await import('xlsx');
      const nombreComercial = config?.nombreComercial ?? "Nohemy's Boutique";
      const hoja = xlsx.utils.aoa_to_sheet([
        [nombreComercial],
        [`Reporte de ventas · Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
        [],
      ]);
      xlsx.utils.sheet_add_json(hoja, filas, { origin: -1 });
      const libro = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(libro, hoja, 'Ventas');

      const fechaArchivo = format(new Date(), 'yyyy-MM-dd');
      xlsx.writeFile(libro, `Ventas_Nohemys_${fechaArchivo}.xlsx`);
    } catch (e) {
      console.error('Error al exportar ventas:', e);
      toast.error('No se pudo generar el archivo de Excel. Intenta de nuevo.');
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-boutique-dark">Historial de ventas</h1>
          <p className="text-sm text-boutique-gray-mid mt-0.5">Consulta y filtra todas las transacciones</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={descargarExcel}
            disabled={exportando || rangoInvalido}
            title={rangoInvalido ? 'Corrige el rango de fechas para exportar' : undefined}
            className="btn-boutique-secondary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportando ? (
              <span className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download size={15} />
            )}
            Descargar Excel
          </button>
          <button
            onClick={() => cargar(pagina)}
            disabled={cargando || rangoInvalido}
            aria-label="Actualizar lista"
            className="p-2 rounded-xl hover:bg-blush-light transition-colors min-w-[44px] min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={`text-boutique-gray-mid ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card-boutique p-4 flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-1 text-boutique-gray-mid self-center">
          <Filter size={14} />
          <span className="text-xs font-medium">Filtros</span>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-boutique-gray-mid mb-0.5">Buscar cliente o ticket</label>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-boutique-gray-mid pointer-events-none" />
            <input
              type="text"
              value={q}
              onChange={(e) => handleQ(e.target.value)}
              placeholder="Nombre de cliente o N° ticket…"
              className="w-full input-boutique text-sm pl-8"
            />
          </div>
        </div>
        <div>
          <label htmlFor="ventas-desde" className="block text-xs font-medium text-boutique-gray-mid mb-0.5">Desde</label>
          <input
            id="ventas-desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            aria-invalid={rangoInvalido}
            className={`input-boutique text-sm ${rangoInvalido ? '!border-boutique-danger' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="ventas-hasta" className="block text-xs font-medium text-boutique-gray-mid mb-0.5">Hasta</label>
          <input
            id="ventas-hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            aria-invalid={rangoInvalido}
            className={`input-boutique text-sm ${rangoInvalido ? '!border-boutique-danger' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="ventas-metodo" className="block text-xs font-medium text-boutique-gray-mid mb-0.5">Método de pago</label>
          <select id="ventas-metodo" value={metodo} onChange={(e) => setMetodo(e.target.value)} className="input-boutique text-sm">
            {METODOS.map((m) => <option key={m} value={m}>{METODO_LABEL[m]}</option>)}
          </select>
        </div>
        {rangoInvalido && (
          <p className="w-full text-xs text-boutique-danger" role="alert">
            La fecha &quot;Desde&quot; no puede ser posterior a la fecha &quot;Hasta&quot;.
          </p>
        )}
      </div>

      {/* Resumen KPIs */}
      {resumen && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total facturado', value: formatPrecio(resumen.total), gold: true },
            { label: 'Transacciones', value: resumen.cantidad.toString() },
            { label: 'Ticket promedio', value: formatPrecio(resumen.promedio) },
          ].map((k) => (
            <div key={k.label} className={`card-boutique p-4 text-center ${k.gold ? 'bg-blush-light' : ''}`}>
              <p className={`text-xl font-mono font-bold ${k.gold ? 'text-gold' : 'text-boutique-dark'}`}>{k.value}</p>
              <p className="text-xs text-boutique-gray-mid mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista */}
      <div aria-live="polite" aria-busy={cargando}>
      {rangoInvalido ? (
        <div className="flex flex-col items-center py-16 text-center">
          <AlertTriangle size={28} className="text-boutique-warning mb-3" />
          <p className="text-sm font-semibold text-boutique-dark mb-1">Rango de fechas inválido</p>
          <p className="text-xs text-boutique-gray-mid">Ajusta las fechas para ver resultados.</p>
        </div>
      ) : cargando ? (
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="card-boutique overflow-hidden animate-pulse">
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-28 rounded bg-blush/40" />
                  <div className="h-4 w-20 rounded-full bg-blush/30" />
                  <div className="h-3 w-14 rounded bg-blush/20 hidden sm:block" />
                  <div className="h-3 w-24 rounded bg-blush/20 hidden md:block" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-4 w-16 rounded bg-blush/40" />
                  <div className="h-3 w-12 rounded bg-blush/20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : errorLista ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle size={28} className="text-boutique-danger mb-3" />
          <p className="text-sm font-semibold text-boutique-dark mb-1">No pudimos cargar las ventas</p>
          <p className="text-xs text-[#757575] mb-4">Verifica tu conexión e intenta de nuevo.</p>
          <button
            onClick={() => cargar(pagina)}
            className="btn-boutique-primary text-sm px-4 py-2 flex items-center gap-2"
          >
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      ) : ventas.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Receipt size={32} className="text-gold-light mb-3" />
          <p className="text-sm text-boutique-gray-mid">Sin ventas para este período.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ventas.map((v) => {
            const estado = ESTADOS[v.estado] ?? { label: v.estado, cls: 'bg-boutique-gray-soft text-boutique-gray-mid' };
            const abierto = expandido === v.id;
            const fecha = isValid(new Date(v.createdAt))
              ? format(new Date(v.createdAt), 'dd/MM HH:mm', { locale: es })
              : '—';
            const panelId = `detalle-venta-${v.id}`;
            return (
              <div key={v.id} className="card-boutique overflow-hidden">
                <button
                  onClick={() => setExpandido(abierto ? null : v.id)}
                  aria-expanded={abierto}
                  aria-controls={panelId}
                  className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-boutique-white transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-boutique-dark flex-shrink-0 max-w-[140px] truncate" title={v.numeroTicket}>{v.numeroTicket}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${estado.cls}`}>{estado.label}</span>
                    <span className="text-xs text-boutique-gray-mid flex-shrink-0">{METODO_LABEL[v.metodoPago] ?? v.metodoPago}</span>
                    {v.cajero && <span className="text-xs text-boutique-gray-mid truncate hidden sm:block">{v.cajero.nombre}</span>}
                    {v.cliente && <span className="text-xs text-gold truncate hidden md:block">{v.cliente.nombre}</span>}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="font-mono font-bold text-sm text-gold">{formatPrecio(v.total)}</span>
                    <span className="text-xs text-boutique-gray-mid">{fecha}</span>
                    <svg className={`w-4 h-4 text-boutique-gray-mid transition-transform ${abierto ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {abierto && (
                  <div id={panelId} className="border-t border-blush px-4 py-3 space-y-2 bg-boutique-white">
                    {/* Detalles de prendas */}
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {(v.detalles ?? []).map((d, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 text-xs">
                          <span className="text-boutique-dark min-w-0 flex-1 break-words">
                            {d.cantidad}× {d.variante.producto.nombre}
                            {(d.variante.talla || d.variante.color) && (
                              <span className="text-boutique-gray-mid ml-1">({[d.variante.talla, d.variante.color].filter(Boolean).join(' / ')})</span>
                            )}
                          </span>
                          <span className="font-mono text-boutique-gray-mid flex-shrink-0">{formatPrecio(d.subtotal)}</span>
                        </div>
                      ))}
                    </div>

                    {v.descuentoGlobal > 0 && (
                      <div className="flex justify-between text-xs text-boutique-danger">
                        <span>Descuento global</span>
                        <span className="font-mono">-{formatPrecio(v.descuentoGlobal)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-bold pt-1 border-t border-blush">
                      <span className="text-boutique-dark">Total</span>
                      <span className="font-mono text-gold">{formatPrecio(v.total)}</span>
                    </div>

                    {/* Pagos */}
                    {(v.pagos ?? []).length > 0 && (
                      <div className="pt-1 space-y-0.5">
                        {v.pagos.map((p, i) => (
                          <div key={i} className="flex justify-between text-xs text-boutique-gray-mid">
                            <span>{METODO_LABEL[p.metodo] ?? p.metodo}{p.referencia ? ` · ${p.referencia}` : ''}</span>
                            <span className="font-mono">{formatPrecio(p.monto)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="pt-2 border-t border-blush flex items-center gap-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); abrirRecibo(v.id); }}
                        disabled={cargandoRecibo === v.id}
                        className="flex items-center gap-1.5 text-xs font-medium text-boutique-gray-dark hover:text-gold transition-colors disabled:opacity-60"
                      >
                        {cargandoRecibo === v.id
                          ? <span className="w-3 h-3 border border-gold border-t-transparent rounded-full animate-spin" />
                          : <Printer size={13} />
                        }
                        Reimprimir comprobante
                      </button>
                      {v.estado !== 'ANULADA' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setVentaAnular(v); }}
                          className="flex items-center gap-1.5 text-xs font-medium text-boutique-danger hover:underline"
                        >
                          <Ban size={13} />
                          Anular venta
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Paginador */}
      {meta && meta.totalPaginas > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-boutique-gray-mid">
            {meta.total} ventas · página {meta.pagina} de {meta.totalPaginas}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={pagina === 1 || cargando}
              onClick={() => cambiarPagina(pagina - 1)}
              aria-label="Página anterior"
              className="p-1.5 rounded-lg border border-blush disabled:opacity-40 hover:bg-blush-light transition-colors min-w-[44px] min-h-[44px]"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(meta.totalPaginas, 5) }, (_, i) => {
              const pg = pagina <= 3 ? i + 1 : pagina - 2 + i;
              if (pg < 1 || pg > meta.totalPaginas) return null;
              return (
                <button
                  key={pg}
                  disabled={cargando}
                  onClick={() => cambiarPagina(pg)}
                  aria-label={`Página ${pg}`}
                  aria-current={pg === pagina ? 'page' : undefined}
                  className={`min-w-[44px] min-h-[44px] rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${pg === pagina ? 'bg-gold text-white' : 'border border-blush hover:bg-blush-light'}`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              disabled={pagina === meta.totalPaginas || cargando}
              onClick={() => cambiarPagina(pagina + 1)}
              aria-label="Página siguiente"
              className="p-1.5 rounded-lg border border-blush disabled:opacity-40 hover:bg-blush-light transition-colors min-w-[44px] min-h-[44px]"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal reimprimir comprobante */}
      <ReceiptModal
        venta={ventaImprimiendo}
        onNuevaVenta={() => setVentaImprimiendo(null)}
        modoReimpresion
      />

      {/* Confirmación de anulación */}
      <AlertDialog open={!!ventaAnular} onOpenChange={(open) => !open && setVentaAnular(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular esta venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se abrirá el formulario de devolución para el ticket{' '}
              <strong>{ventaAnular?.numeroTicket}</strong> con todos los productos disponibles
              preseleccionados. Deberás confirmar la devolución para completar la anulación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => ventaAnular && irAAnular(ventaAnular)}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
