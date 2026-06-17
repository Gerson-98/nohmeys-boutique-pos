'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { RotateCcw, RefreshCw, Search, Filter, ChevronLeft, ChevronRight, AlertCircle, AlertTriangle, Plus, Minus, X, Package } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatPrecio, CONSUMIDOR_FINAL_ID } from '@/lib/boutique';
import { DevolucionReceiptModal, type ComprobanteDevolucion } from './components/DevolucionReceiptModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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
  EFECTIVO: { label: 'Reembolso efectivo', cls: 'bg-boutique-success/20 text-boutique-success' },
  VALE: { label: 'Vale de crédito', cls: 'bg-gold/20 text-gold' },
  CAMBIO: { label: 'Cambio de prenda', cls: 'bg-boutique-info/20 text-boutique-info' },
};

function toDesdeISO(d: string) { return new Date(d + 'T00:00:00').toISOString(); }
function toHastaISO(d: string) { return new Date(d + 'T23:59:59.999').toISOString(); }
function hoyLocal() { return format(new Date(), 'yyyy-MM-dd'); }

// ── Tipos del flujo de búsqueda/devolución ─────────────────────────
interface DetalleItem {
  id: string;
  varianteId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  cantidadDevuelta: number;
  cantidadDisponible: number;
  variante: { id: string; sku: string; talla: string | null; color: string | null; producto: { nombre: string } };
}

interface VentaBuscada {
  id: string;
  numeroTicket: string;
  total: number;
  estado: string;
  createdAt: string;
  cliente: { id: string; nombre: string } | null;
  cajero: { nombre: string };
  pagos: { metodo: string; monto: number }[];
  detalles: DetalleItem[];
}

interface ItemCambio {
  varianteId: string;
  sku: string;
  nombre: string;
  talla: string | null;
  color: string | null;
  cantidad: number;
  precioUnitario: number;
  stockActual: number;
}

interface ProductoBusqueda {
  id: string;
  nombre: string;
  precioVenta: number;
  variantes: { id: string; sku: string; talla: string | null; color: string | null; precioVenta: number | null; stockActual: number }[];
}

const TIPOS_PAGO_ADICIONAL = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'] as const;

export default function DevolucionesPage() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [totalMonto, setTotalMonto] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);

  // Modal nueva devolución
  const [modalOpen, setModalOpen] = useState(false);
  const [modoBusqueda, setModoBusqueda] = useState<'ticket' | 'cliente'>('ticket');
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const [resultados, setResultados] = useState<VentaBuscada[]>([]);
  const [ventaSel, setVentaSel] = useState<VentaBuscada | null>(null);
  const [seleccion, setSeleccion] = useState<Record<string, number>>({});
  const [tipoRetorno, setTipoRetorno] = useState<'EFECTIVO' | 'VALE' | 'CAMBIO'>('VALE');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Cambio de prenda
  const [cambioQuery, setCambioQuery] = useState('');
  const [cambioResultados, setCambioResultados] = useState<ProductoBusqueda[]>([]);
  const [itemsCambio, setItemsCambio] = useState<ItemCambio[]>([]);
  const [pagoMetodo, setPagoMetodo] = useState<typeof TIPOS_PAGO_ADICIONAL[number]>('EFECTIVO');
  const [pagoBancoId, setPagoBancoId] = useState('');
  const [bancos, setBancos] = useState<{ id: string; nombre: string }[]>([]);

  const [comprobante, setComprobante] = useState<ComprobanteDevolucion | null>(null);
  const [errorLista, setErrorLista] = useState(false);
  const [buscandoCambio, setBuscandoCambio] = useState(false);
  const [errorCambio, setErrorCambio] = useState(false);
  const cambioDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargar = useCallback(async (pag = pagina) => {
    setCargando(true);
    setErrorLista(false);
    try {
      const p = new URLSearchParams({ pagina: pag.toString(), limite: '20' });
      if (desde) p.set('desde', toDesdeISO(desde));
      if (hasta) p.set('hasta', toHastaISO(hasta));
      const res = await fetch(`/api/reportes/devoluciones?${p}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setDevoluciones(d.data ?? []);
      setMeta(d.meta ?? null);
      setTotalMonto(d.totalMonto ?? 0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      toast.error('Error al cargar devoluciones: ' + msg);
      setErrorLista(true);
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, pagina]);

  useEffect(() => { cargar(1); }, [desde, hasta]);

  useEffect(() => {
    fetch('/api/bancos').then((r) => r.json()).then((d) => setBancos(d.data ?? [])).catch(() => toast.error('No se pudieron cargar los bancos'));
  }, []);

  // Atajo "Anular venta" desde Historial de ventas: preselecciona todos los productos disponibles
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticket = params.get('anular');
    if (!ticket) return;
    window.history.replaceState(null, '', '/reportes/devoluciones');
    setModalOpen(true);
    iniciarAnulacion(ticket);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function iniciarAnulacion(ticket: string) {
    setModoBusqueda('ticket');
    setBusqueda(ticket);
    setBuscando(true);
    setErrorBusqueda('');
    setResultados([]);
    setVentaSel(null);
    try {
      const res = await fetch(`/api/ventas/buscar?ticket=${encodeURIComponent(ticket)}`);
      const d = await res.json();
      if (!res.ok) {
        setErrorBusqueda(d.error || 'No se encontró la venta');
        toast.error(d.error || 'No se encontró la venta');
        return;
      }
      const venta: VentaBuscada = d.data;
      seleccionarVenta(venta);
      const seleccionCompleta: Record<string, number> = {};
      for (const det of venta.detalles) {
        if (det.cantidadDisponible > 0) seleccionCompleta[det.id] = det.cantidadDisponible;
      }
      setSeleccion(seleccionCompleta);
      setMotivo('Anulación de venta por error de cajero');
    } catch {
      setErrorBusqueda('Error de conexión');
      toast.error('Error de conexión al buscar la venta');
    } finally {
      setBuscando(false);
    }
  }

  function resetModal() {
    setBusqueda('');
    setResultados([]);
    setVentaSel(null);
    setSeleccion({});
    setTipoRetorno('VALE');
    setMotivo('');
    setErrorBusqueda('');
    setItemsCambio([]);
    setCambioQuery('');
    setCambioResultados([]);
    setPagoMetodo('EFECTIVO');
    setPagoBancoId('');
  }

  function cerrarModal() {
    setModalOpen(false);
    resetModal();
  }

  async function buscar() {
    if (!busqueda.trim()) return;
    setBuscando(true);
    setErrorBusqueda('');
    setResultados([]);
    setVentaSel(null);
    try {
      const param = modoBusqueda === 'ticket'
        ? `ticket=${encodeURIComponent(busqueda.trim())}`
        : `cliente=${encodeURIComponent(busqueda.trim())}`;
      const res = await fetch(`/api/ventas/buscar?${param}`);
      const d = await res.json();
      if (!res.ok) {
        setErrorBusqueda(d.error || 'No se encontró la venta');
        return;
      }
      if (Array.isArray(d.data)) {
        setResultados(d.data);
      } else {
        seleccionarVenta(d.data);
      }
    } catch {
      setErrorBusqueda('Error de conexión');
    } finally {
      setBuscando(false);
    }
  }

  function seleccionarVenta(venta: VentaBuscada) {
    setVentaSel(venta);
    setResultados([]);
    setSeleccion({});
    setItemsCambio([]);
    const fueEfectivo = venta.pagos.some((p) => p.metodo === 'EFECTIVO');
    const fueTarjeta = venta.pagos.some((p) => p.metodo === 'TARJETA');
    setTipoRetorno(fueEfectivo && !fueTarjeta ? 'EFECTIVO' : 'VALE');
  }

  function cambiarCantidad(detalle: DetalleItem, delta: number) {
    setSeleccion((prev) => {
      const actual = prev[detalle.id] ?? 0;
      const nueva = Math.min(Math.max(actual + delta, 0), detalle.cantidadDisponible);
      return { ...prev, [detalle.id]: nueva };
    });
  }

  function buscarCambio(q: string) {
    setCambioQuery(q);
    if (cambioDebounceRef.current) clearTimeout(cambioDebounceRef.current);
    if (!q.trim()) { setCambioResultados([]); setErrorCambio(false); return; }
    cambioDebounceRef.current = setTimeout(async () => {
      setBuscandoCambio(true);
      setErrorCambio(false);
      try {
        const res = await fetch(`/api/pos/buscar?q=${encodeURIComponent(q)}`);
        const d = await res.json();
        setCambioResultados(d.data ?? []);
      } catch {
        setErrorCambio(true);
        setCambioResultados([]);
      } finally {
        setBuscandoCambio(false);
      }
    }, 300);
  }

  function agregarItemCambio(producto: ProductoBusqueda, variante: ProductoBusqueda['variantes'][number]) {
    if (variante.stockActual < 1) {
      toast.error('Sin stock disponible para esa variante');
      return;
    }
    setItemsCambio((prev) => {
      const existente = prev.find((i) => i.varianteId === variante.id);
      if (existente) {
        if (existente.cantidad >= variante.stockActual) {
          toast.error('No hay más stock disponible de esa variante');
          return prev;
        }
        return prev.map((i) => i.varianteId === variante.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, {
        varianteId: variante.id,
        sku: variante.sku,
        nombre: producto.nombre,
        talla: variante.talla,
        color: variante.color,
        cantidad: 1,
        precioUnitario: variante.precioVenta ?? producto.precioVenta,
        stockActual: variante.stockActual,
      }];
    });
  }

  function cambiarCantidadCambio(varianteId: string, delta: number) {
    setItemsCambio((prev) => prev
      .map((i) => i.varianteId === varianteId
        ? { ...i, cantidad: Math.min(Math.max(i.cantidad + delta, 1), i.stockActual) }
        : i)
    );
  }

  function quitarItemCambio(varianteId: string) {
    setItemsCambio((prev) => prev.filter((i) => i.varianteId !== varianteId));
  }

  // ── Cálculos derivados ─────────────────────────────────────────
  const itemsSeleccionados = ventaSel?.detalles.filter((d) => (seleccion[d.id] ?? 0) > 0) ?? [];
  const montoDevuelto = itemsSeleccionados.reduce((s, d) => s + d.precioUnitario * (seleccion[d.id] ?? 0), 0);
  const fueEfectivo = ventaSel?.pagos.some((p) => p.metodo === 'EFECTIVO') ?? false;
  const fueTarjeta = ventaSel?.pagos.some((p) => p.metodo === 'TARJETA') ?? false;
  const tieneClienteReal = !!ventaSel?.cliente && ventaSel.cliente.id !== CONSUMIDOR_FINAL_ID;
  const montoCambio = itemsCambio.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0);
  const diferencia = Math.round((montoCambio - montoDevuelto) * 100) / 100;

  const requierePagoAdicional = tipoRetorno === 'CAMBIO' && diferencia > 0;
  const requiereBanco = requierePagoAdicional && pagoMetodo !== 'EFECTIVO';

  const puedeConfirmar = !!ventaSel
    && itemsSeleccionados.length > 0
    && motivo.trim().length > 0
    && (tipoRetorno !== 'EFECTIVO' || (fueEfectivo && !fueTarjeta))
    && (tipoRetorno !== 'VALE' || tieneClienteReal)
    && (tipoRetorno !== 'CAMBIO' || (itemsCambio.length > 0 && (!requierePagoAdicional || (pagoMetodo && (!requiereBanco || pagoBancoId)))));

  async function guardarDevolucion() {
    if (!ventaSel || !puedeConfirmar) return;
    setGuardando(true);
    try {
      const items = itemsSeleccionados.map((d) => ({ detalleVentaId: d.id, cantidad: seleccion[d.id] }));
      const body: Record<string, unknown> = { ventaId: ventaSel.id, motivo: motivo.trim(), tipoRetorno, items };

      if (tipoRetorno === 'CAMBIO') {
        body.itemsCambio = itemsCambio.map((i) => ({ varianteId: i.varianteId, cantidad: i.cantidad }));
        if (diferencia > 0) {
          body.pagoAdicional = {
            metodo: pagoMetodo,
            monto: diferencia,
            bancoId: pagoMetodo !== 'EFECTIVO' ? pagoBancoId : undefined,
          };
        }
      }

      const res = await fetch('/api/devoluciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error || 'Error al registrar la devolución');
        return;
      }

      const comp: ComprobanteDevolucion = {
        numeroTicketOriginal: ventaSel.numeroTicket,
        fecha: new Date().toISOString(),
        cajero: ventaSel.cajero.nombre,
        cliente: ventaSel.cliente?.nombre ?? null,
        motivo: motivo.trim(),
        tipoRetorno,
        itemsDevueltos: itemsSeleccionados.map((det) => ({
          nombre: det.variante.producto.nombre,
          talla: det.variante.talla,
          color: det.variante.color,
          sku: det.variante.sku,
          cantidad: seleccion[det.id],
          precioUnitario: det.precioUnitario,
          subtotal: det.precioUnitario * seleccion[det.id],
        })),
        montoDevuelto: d.data.montoDevuelto,
        itemsCambio: tipoRetorno === 'CAMBIO'
          ? itemsCambio.map((i) => ({ nombre: i.nombre, talla: i.talla, color: i.color, sku: i.sku, cantidad: i.cantidad, precioUnitario: i.precioUnitario, subtotal: i.precioUnitario * i.cantidad }))
          : undefined,
        montoCambio: d.data.montoCambio,
        diferencia: d.data.diferencia,
        pagoAdicional: diferencia > 0 ? { metodo: pagoMetodo, monto: d.data.diferencia } : null,
        vale: d.data.vale,
        efectivoDevuelto: d.data.efectivoDevuelto,
      };

      setComprobante(comp);
      cerrarModal();
      toast.success('Devolución registrada correctamente');
      cargar(1);
    } catch {
      toast.error('Error de conexión al registrar la devolución');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-boutique-dark">Devoluciones</h1>
          <p className="text-sm text-boutique-gray-mid mt-0.5">Gestión de cambios, reembolsos y vales de crédito</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => cargar(pagina)} aria-label="Actualizar lista de devoluciones" className="p-2 rounded-xl hover:bg-blush-light transition-colors min-w-[44px] min-h-[44px]">
            <RefreshCw size={16} className="text-boutique-gray-mid" aria-hidden="true" />
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-boutique-primary flex items-center gap-2 text-sm">
            <RotateCcw size={15} aria-hidden="true" /> Nueva devolución
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card-boutique p-4 flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-1 text-boutique-gray-mid self-center">
          <Filter size={14} />
          <span className="text-xs font-medium">Período</span>
        </div>
        <div>
          <label className="block text-xs font-medium text-boutique-gray-mid mb-0.5">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="input-boutique text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-boutique-gray-mid mb-0.5">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="input-boutique text-sm" />
        </div>
        {(desde || hasta) && (
          <button onClick={() => { setDesde(''); setHasta(''); }} className="text-xs text-boutique-gray-mid hover:text-boutique-danger mt-4">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* KPI monto */}
      {meta && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card-boutique p-4 text-center bg-boutique-danger/10 border-boutique-danger">
            <p className="text-xl font-mono font-bold text-boutique-danger">{formatPrecio(totalMonto)}</p>
            <p className="text-xs text-boutique-gray-mid mt-0.5">Total devuelto</p>
          </div>
          <div className="card-boutique p-4 text-center">
            <p className="text-xl font-mono font-bold text-boutique-dark">{meta.total}</p>
            <p className="text-xs text-boutique-gray-mid mt-0.5">Devoluciones registradas</p>
          </div>
        </div>
      )}

      {/* Lista */}
      {cargando ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-boutique px-4 py-3 animate-pulse motion-reduce:animate-none motion-reduce:opacity-50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-20 rounded bg-blush/40" />
                    <div className="h-4 w-24 rounded-full bg-blush/30" />
                  </div>
                  <div className="h-3 w-48 rounded bg-blush/20" />
                  <div className="h-3 w-32 rounded bg-blush/20" />
                </div>
                <div className="text-right space-y-1.5 flex-shrink-0">
                  <div className="h-4 w-16 rounded bg-blush/40" />
                  <div className="h-3 w-20 rounded bg-blush/20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : errorLista ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle size={28} className="text-boutique-danger mb-3" aria-hidden="true" />
          <p className="text-sm font-semibold text-boutique-dark mb-1">No pudimos cargar las devoluciones</p>
          <p className="text-xs text-[#757575] mb-4">Verifica tu conexión e intenta de nuevo.</p>
          <button
            onClick={() => cargar(pagina)}
            className="btn-boutique-primary text-sm px-4 py-2 flex items-center gap-2"
          >
            <RefreshCw size={14} aria-hidden="true" /> Reintentar
          </button>
        </div>
      ) : devoluciones.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <RotateCcw size={32} className="text-gold-light mb-3" aria-hidden="true" />
          <p className="text-sm text-boutique-gray-mid">Sin devoluciones registradas.</p>
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
                      <span className="font-mono text-xs font-bold text-boutique-dark">
                        {dev.venta.numeroTicket}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipo.cls}`}>
                        {tipo.label}
                      </span>
                    </div>
                    <p className="text-xs text-boutique-gray-mid truncate">{dev.motivo}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-boutique-gray-mid">
                      {dev.venta.cajero && <span>{dev.venta.cajero.nombre}</span>}
                      {dev.venta.cliente && <span className="text-gold">{dev.venta.cliente.nombre}</span>}
                      {dev.vale && (
                        <span className="font-mono text-gold">Vale: {dev.vale.codigo}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-bold text-sm text-boutique-danger">-{formatPrecio(dev.monto)}</p>
                    <p className="text-xs text-boutique-gray-mid mt-0.5">{fecha}</p>
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
          <p className="text-xs text-boutique-gray-mid">Página {meta.pagina} de {meta.totalPaginas}</p>
          <div className="flex items-center gap-1">
            <button disabled={pagina === 1} onClick={() => { setPagina(p => p - 1); cargar(pagina - 1); }}
              aria-label="Página anterior"
              className="p-1.5 rounded-lg border border-blush disabled:opacity-40 hover:bg-blush-light min-w-[44px] min-h-[44px]">
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <button disabled={pagina === meta.totalPaginas} onClick={() => { setPagina(p => p + 1); cargar(pagina + 1); }}
              aria-label="Página siguiente"
              className="p-1.5 rounded-lg border border-blush disabled:opacity-40 hover:bg-blush-light min-w-[44px] min-h-[44px]">
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Modal nueva devolución */}
      <Dialog open={modalOpen} onOpenChange={(v) => !v && cerrarModal()}>
        <DialogContent className="max-w-lg w-full max-h-[90vh] flex flex-col p-0 gap-0 rounded-2xl border border-blush bg-white overflow-hidden">
          <DialogHeader className="px-5 py-4 border-b border-blush bg-boutique-white flex-shrink-0">
            <DialogTitle className="font-playfair text-lg font-bold text-boutique-dark">Nueva devolución</DialogTitle>
            <DialogDescription className="text-xs text-boutique-gray-mid">Busca la venta por ticket o cliente para procesar el cambio o reembolso.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Buscar venta */}
              <div>
                <label className="block text-xs font-medium text-boutique-dark mb-1">Buscar venta</label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => { setModoBusqueda('ticket'); setBusqueda(''); setErrorBusqueda(''); setResultados([]); }}
                    aria-pressed={modoBusqueda === 'ticket'}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${modoBusqueda === 'ticket' ? 'bg-gold text-white' : 'bg-boutique-gray-soft text-boutique-dark'}`}
                  >
                    Por ticket
                  </button>
                  <button
                    onClick={() => { setModoBusqueda('cliente'); setBusqueda(''); setErrorBusqueda(''); setResultados([]); }}
                    aria-pressed={modoBusqueda === 'cliente'}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${modoBusqueda === 'cliente' ? 'bg-gold text-white' : 'bg-boutique-gray-soft text-boutique-dark'}`}
                  >
                    Por cliente
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && buscar()}
                    placeholder={modoBusqueda === 'ticket' ? 'TKT-20260609-0001' : 'Nombre del cliente'}
                    className={`flex-1 input-boutique text-sm ${modoBusqueda === 'ticket' ? 'font-mono' : ''}`}
                  />
                  <button onClick={buscar} disabled={buscando} aria-label="Buscar venta"
                    className="btn-boutique-secondary flex items-center gap-1 px-3 text-sm disabled:opacity-60">
                    {buscando ? <span role="status" aria-label="Buscando" className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin motion-reduce:animate-none" /> : <Search size={14} aria-hidden="true" />}
                  </button>
                </div>
                {errorBusqueda && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-boutique-danger">
                    <AlertCircle size={13} aria-hidden="true" /> {errorBusqueda}
                  </div>
                )}
              </div>

              {/* Resultados de búsqueda por cliente */}
              {resultados.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-boutique-dark">Selecciona la venta:</p>
                  {resultados.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => seleccionarVenta(v)}
                      className="w-full text-left bg-blush-light hover:bg-blush rounded-xl p-2.5 text-xs transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold">{v.numeroTicket}</span>
                        <span className="font-mono font-bold text-gold">{formatPrecio(v.total)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-0.5 text-boutique-gray-mid">
                        <span>{format(new Date(v.createdAt), "dd MMM yyyy HH:mm", { locale: es })}</span>
                        <span>{v.estado === 'DEVOLUCION_PARCIAL' ? 'Devolución parcial' : 'Completada'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Detalle de la venta seleccionada */}
              {ventaSel && (
                <>
                  <div className="bg-blush-light rounded-xl p-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-boutique-gray-mid">Ticket</span>
                      <span className="font-mono font-bold">{ventaSel.numeroTicket}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-boutique-gray-mid">Total venta</span>
                      <span className="font-mono font-bold text-gold">{formatPrecio(ventaSel.total)}</span>
                    </div>
                    {ventaSel.cliente && (
                      <div className="flex justify-between">
                        <span className="text-boutique-gray-mid">Cliente</span>
                        <span>{ventaSel.cliente.nombre}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-boutique-gray-mid">Pago original</span>
                      <span>{ventaSel.pagos.map((p) => p.metodo).join(', ')}</span>
                    </div>
                  </div>

                  {/* Selección de productos a devolver */}
                  <div>
                    <label className="block text-xs font-medium text-boutique-dark mb-1.5">Productos a devolver</label>
                    <div className="space-y-1.5">
                      {ventaSel.detalles.map((d) => {
                        const cant = seleccion[d.id] ?? 0;
                        const sinDisponible = d.cantidadDisponible <= 0;
                        return (
                          <div key={d.id} className={`flex items-center gap-2 rounded-xl border p-2 text-xs ${sinDisponible ? 'border-blush opacity-50' : 'border-blush'}`}>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-boutique-dark truncate">{d.variante.producto.nombre}</p>
                              <p className="text-boutique-gray-mid">
                                {[d.variante.talla, d.variante.color].filter(Boolean).join(' / ')} · {d.variante.sku} · {formatPrecio(d.precioUnitario)} c/u
                              </p>
                              <p className="text-boutique-gray-mid">
                                Comprado: {d.cantidad} · Disponible para devolver: {d.cantidadDisponible}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button onClick={() => cambiarCantidad(d, -1)} disabled={cant <= 0}
                                aria-label={`Quitar uno de ${d.variante.producto.nombre}`}
                                className="min-w-[44px] min-h-[44px] rounded-full border border-blush flex items-center justify-center disabled:opacity-30 hover:bg-blush-light">
                                <Minus size={12} aria-hidden="true" />
                              </button>
                              <span className="w-6 text-center font-mono font-bold" aria-live="polite">{cant}</span>
                              <button onClick={() => cambiarCantidad(d, 1)} disabled={cant >= d.cantidadDisponible}
                                aria-label={`Agregar uno de ${d.variante.producto.nombre}`}
                                className="min-w-[44px] min-h-[44px] rounded-full border border-blush flex items-center justify-center disabled:opacity-30 hover:bg-blush-light">
                                <Plus size={12} aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {itemsSeleccionados.length > 0 && (
                    <div className="flex justify-between items-center bg-blush-light rounded-xl p-3 text-sm">
                      <span className="font-medium text-boutique-dark">Monto a devolver</span>
                      <span className="font-mono font-bold text-boutique-danger">{formatPrecio(montoDevuelto)}</span>
                    </div>
                  )}

                  {/* Motivo */}
                  <div>
                    <label className="block text-xs font-medium text-boutique-dark mb-1">Motivo de devolución</label>
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      rows={2}
                      placeholder="Prenda defectuosa, talla incorrecta..."
                      className="w-full input-boutique resize-none text-sm"
                    />
                  </div>

                  {/* Tipo de retorno */}
                  <div>
                    <label className="block text-xs font-medium text-boutique-dark mb-1">Tipo de retorno</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setTipoRetorno('EFECTIVO')}
                        disabled={!fueEfectivo || fueTarjeta}
                        className={`px-2 py-2 rounded-xl text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tipoRetorno === 'EFECTIVO' ? 'bg-boutique-success text-white border-boutique-success' : 'border-blush text-boutique-dark'}`}
                      >
                        Efectivo
                      </button>
                      <button
                        onClick={() => setTipoRetorno('VALE')}
                        disabled={!tieneClienteReal}
                        className={`px-2 py-2 rounded-xl text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tipoRetorno === 'VALE' ? 'bg-gold text-white border-gold' : 'border-blush text-boutique-dark'}`}
                      >
                        Vale de crédito
                      </button>
                      <button
                        onClick={() => setTipoRetorno('CAMBIO')}
                        className={`px-2 py-2 rounded-xl text-xs font-medium border transition-colors ${tipoRetorno === 'CAMBIO' ? 'bg-boutique-info text-white border-boutique-info' : 'border-blush text-boutique-dark'}`}
                      >
                        Cambio
                      </button>
                    </div>
                    {tipoRetorno === 'EFECTIVO' && fueTarjeta && (
                      <p className="text-xs text-boutique-danger mt-1">El pago original incluyó tarjeta: solo se puede dar vale de tienda.</p>
                    )}
                    {tipoRetorno === 'VALE' && !tieneClienteReal && (
                      <p className="text-xs text-boutique-danger mt-1">Esta venta no tiene un cliente registrado, no se puede generar un vale.</p>
                    )}
                  </div>

                  {/* Cambio de prenda */}
                  {tipoRetorno === 'CAMBIO' && (
                    <div className="space-y-2 border border-blush rounded-xl p-3">
                      <label className="block text-xs font-medium text-boutique-dark">Buscar prenda de cambio</label>
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-boutique-gray-mid" aria-hidden="true" />
                        <input
                          type="text"
                          value={cambioQuery}
                          onChange={(e) => buscarCambio(e.target.value)}
                          placeholder="Buscar producto o SKU..."
                          aria-label="Buscar prenda de cambio por nombre o SKU"
                          className="w-full input-boutique pl-8 pr-8 text-sm"
                        />
                        {buscandoCambio && (
                          <span role="status" aria-label="Buscando" className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
                        )}
                      </div>
                      {errorCambio && (
                        <p className="text-xs text-boutique-danger mt-1 flex items-center gap-1">
                          <AlertCircle size={12} aria-hidden="true" /> Error al buscar. Intenta de nuevo.
                        </p>
                      )}
                      {cambioResultados.length > 0 && (
                        <div className="max-h-40 overflow-y-auto space-y-1 bg-boutique-gray-soft rounded-xl p-2">
                          {cambioResultados.map((p) => (
                            <div key={p.id}>
                              <p className="text-xs font-medium text-boutique-gray-mid px-1">{p.nombre}</p>
                              <div className="flex flex-wrap gap-1 px-1 pb-1">
                                {p.variantes.map((v) => (
                                  <button
                                    key={v.id}
                                    onClick={() => agregarItemCambio(p, v)}
                                    disabled={v.stockActual < 1}
                                    className="px-2 py-1 rounded-lg bg-white border border-blush text-xs hover:border-gold disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    {[v.talla, v.color].filter(Boolean).join(' / ') || v.sku} · {formatPrecio(v.precioVenta ?? p.precioVenta)} ({v.stockActual})
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {itemsCambio.length > 0 && (
                        <div className="space-y-1.5">
                          {itemsCambio.map((i) => (
                            <div key={i.varianteId} className="flex items-center gap-2 rounded-lg bg-blush-light p-2 text-xs">
                              <Package size={14} className="text-gold flex-shrink-0" aria-hidden="true" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-boutique-dark truncate">{i.nombre}</p>
                                <p className="text-boutique-gray-mid">{[i.talla, i.color].filter(Boolean).join(' / ')} · {i.sku} · {formatPrecio(i.precioUnitario)} c/u</p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => cambiarCantidadCambio(i.varianteId, -1)} disabled={i.cantidad <= 1}
                                  aria-label={`Quitar uno de ${i.nombre}`}
                                  className="min-w-[44px] min-h-[44px] rounded-full border border-blush flex items-center justify-center disabled:opacity-30 hover:bg-white">
                                  <Minus size={12} aria-hidden="true" />
                                </button>
                                <span className="w-6 text-center font-mono font-bold" aria-live="polite">{i.cantidad}</span>
                                <button onClick={() => cambiarCantidadCambio(i.varianteId, 1)} disabled={i.cantidad >= i.stockActual}
                                  aria-label={`Agregar uno de ${i.nombre}`}
                                  className="min-w-[44px] min-h-[44px] rounded-full border border-blush flex items-center justify-center disabled:opacity-30 hover:bg-white">
                                  <Plus size={12} aria-hidden="true" />
                                </button>
                                <button onClick={() => quitarItemCambio(i.varianteId)} aria-label={`Quitar ${i.nombre} del cambio`} className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-boutique-danger hover:bg-white">
                                  <X size={14} aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          ))}

                          <div className="flex justify-between text-xs pt-1">
                            <span className="text-boutique-gray-mid">Total nueva prenda</span>
                            <span className="font-mono font-bold">{formatPrecio(montoCambio)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-boutique-gray-mid">Valor devuelto</span>
                            <span className="font-mono font-bold">{formatPrecio(montoDevuelto)}</span>
                          </div>
                          <div className={`flex justify-between text-sm font-bold border-t border-blush pt-1 ${diferencia > 0 ? 'text-boutique-danger' : diferencia < 0 ? 'text-boutique-success' : 'text-boutique-dark'}`}>
                            <span>
                              {diferencia > 0
                                ? 'Cliente paga diferencia'
                                : diferencia < 0
                                ? (tieneClienteReal ? 'Vale por diferencia' : 'Efectivo a devolver')
                                : 'Sin diferencia'}
                            </span>
                            <span className="font-mono">{formatPrecio(Math.abs(diferencia))}</span>
                          </div>

                          {diferencia > 0 && (
                            <div className="space-y-2 pt-1">
                              <label className="block text-xs font-medium text-boutique-dark">Forma de pago de la diferencia</label>
                              <div className="grid grid-cols-3 gap-2">
                                {TIPOS_PAGO_ADICIONAL.map((m) => (
                                  <button
                                    key={m}
                                    onClick={() => { setPagoMetodo(m); setPagoBancoId(''); }}
                                    aria-pressed={pagoMetodo === m}
                                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${pagoMetodo === m ? 'bg-gold text-white border-gold' : 'border-blush text-boutique-dark'}`}
                                  >
                                    {m === 'EFECTIVO' ? 'Efectivo' : m === 'TARJETA' ? 'Tarjeta' : 'Transferencia'}
                                  </button>
                                ))}
                              </div>
                              {pagoMetodo !== 'EFECTIVO' && (
                                <select value={pagoBancoId} onChange={(e) => setPagoBancoId(e.target.value)} className="w-full input-boutique text-sm">
                                  <option value="">Selecciona un banco...</option>
                                  {bancos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                                </select>
                              )}
                            </div>
                          )}
                          {diferencia < 0 && !tieneClienteReal && (
                            <p className="text-xs text-boutique-success">Esta venta no tiene cliente registrado: la diferencia se devolverá en efectivo al cliente.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button onClick={cerrarModal} className="flex-1 btn-boutique-secondary text-sm py-2.5">
                      Cancelar
                    </button>
                    <button onClick={guardarDevolucion} disabled={guardando || !puedeConfirmar}
                      className="flex-1 btn-boutique-danger text-sm py-2.5 disabled:opacity-60 flex items-center justify-center gap-2">
                      {guardando ? <span role="status" aria-label="Guardando" className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin motion-reduce:animate-none" /> : <RotateCcw size={14} aria-hidden="true" />}
                      Confirmar devolución
                    </button>
                  </div>
                </>
              )}
          </div>
        </DialogContent>
      </Dialog>

      <DevolucionReceiptModal data={comprobante} onClose={() => setComprobante(null)} />
    </div>
  );
}
