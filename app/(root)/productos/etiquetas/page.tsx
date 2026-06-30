'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, Printer, Plus, Minus, Trash2, Tag, Package, Download, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatPrecio } from '@/lib/boutique';
import { BarcodeCanvas } from '@/components/boutique/BarcodeCanvas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Variante {
  id: string;
  sku: string;
  talla: string | null;
  color: string | null;
  precioVenta: number | null;
  stockActual: number;
}

interface Producto {
  id: string;
  nombre: string;
  precioVenta: number;
  imagenUrl: string | null;
  variantes: Variante[];
}

interface EtiquetaItem {
  productoNombre: string;
  precioVenta: number;
  sku: string;
  talla: string | null;
  color: string | null;
  cantidad: number;
}

// Impresora térmica MUNBYN RealWriter 941: rollo continuo, ancho de etiqueta 40–104mm.
// Una etiqueta por "página" de 50×30mm (tamaño estándar para tags de precio/barcode).
const LABEL_W_MM = 50;
const LABEL_H_MM = 30;

function escapeHtml(texto: string): string {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

async function generarBarcodeDataUrl(sku: string): Promise<string> {
  try {
    const bwipjs = await import('bwip-js');
    const canvas  = document.createElement('canvas');
    bwipjs.toCanvas(canvas, { bcid: 'code128', text: sku, scale: 2, height: 8, includetext: false, backgroundcolor: 'ffffff' });
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

export default function EtiquetasPage() {
  const [busqueda,    setBusqueda]    = useState('');
  const [productos,   setProductos]   = useState<Producto[]>([]);
  const [cargando,    setCargando]    = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [generando,   setGenerando]   = useState(false);
  const [etiquetas,   setEtiquetas]   = useState<EtiquetaItem[]>([]);

  // inline quantity editor state
  const [editandoCantidad, setEditandoCantidad] = useState<string | null>(null);
  const [cantidadInput,    setCantidadInput]    = useState('');

  // confirmation for destructive "Limpiar todo"
  const [confirmandoLimpiar, setConfirmandoLimpiar] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Single fetch source — debounce useEffect handles both initial load and search changes.
  // P1 fix: removed the duplicate useEffect(() => cargarProductos(''), []) that caused
  // a race condition on mount (two concurrent requests to the same endpoint).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { cargarProductos(busqueda); }, 250);
  }, [busqueda]);

  async function cargarProductos(q: string) {
    setCargando(true);
    setErrorBusqueda(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      const res = await fetch(`/api/pos/buscar?${params}`);
      if (!res.ok) throw new Error(`Error ${res.status} al buscar productos`);
      const d = await res.json();
      setProductos(d.data ?? []);
    } catch (err: any) {
      setErrorBusqueda(err.message ?? 'Error al buscar productos');
    } finally {
      setCargando(false);
    }
  }

  function agregarVariante(prod: Producto, variante: Variante) {
    setEtiquetas((prev) => {
      const existe = prev.find((e) => e.sku === variante.sku);
      if (existe) return prev.map((e) => e.sku === variante.sku ? { ...e, cantidad: e.cantidad + 1 } : e);
      return [...prev, { productoNombre: prod.nombre, precioVenta: variante.precioVenta ?? prod.precioVenta, sku: variante.sku, talla: variante.talla, color: variante.color, cantidad: 1 }];
    });
  }

  function agregarTodas(prod: Producto) {
    prod.variantes.forEach((v) => agregarVariante(prod, v));
  }

  function cambiarCantidad(sku: string, delta: number) {
    setEtiquetas((prev) =>
      prev
        .map((e) => (e.sku === sku ? { ...e, cantidad: Math.max(0, e.cantidad + delta) } : e))
        .filter((e) => e.cantidad > 0)
    );
  }

  function iniciarEdicionCantidad(e: EtiquetaItem) {
    setEditandoCantidad(e.sku);
    setCantidadInput(String(e.cantidad));
  }

  function confirmarCantidad(sku: string) {
    const n = parseInt(cantidadInput, 10);
    if (!isNaN(n) && n > 0) {
      setEtiquetas((prev) => prev.map((e) => e.sku === sku ? { ...e, cantidad: n } : e));
    }
    setEditandoCantidad(null);
  }

  function eliminar(sku: string) {
    setEtiquetas((prev) => prev.filter((e) => e.sku !== sku));
  }

  function expandirEtiquetas(): EtiquetaItem[] {
    const expandidas: EtiquetaItem[] = [];
    for (const e of etiquetas) for (let i = 0; i < e.cantidad; i++) expandidas.push(e);
    return expandidas;
  }

  async function imprimir() {
    if (etiquetas.length === 0) return;
    const expandidas = expandirEtiquetas();
    setGenerando(true);
    try {
      const barcodes = new Map<string, string>();
      for (const e of etiquetas) barcodes.set(e.sku, await generarBarcodeDataUrl(e.sku));

      const ventana = window.open('', '_blank', 'width=900,height=700');
      if (!ventana) {
        toast.error('El navegador bloqueó la ventana de impresión. Habilita las ventanas emergentes.');
        return;
      }

      const contenidoEtiquetas = expandidas.map((e) => `
        <div class="etiqueta">
          <p class="nombre">${escapeHtml(e.productoNombre)}</p>
          <p class="variante">${escapeHtml([e.talla, e.color].filter(Boolean).join(' / ') || '—')}</p>
          ${barcodes.get(e.sku) ? `<img class="barcode" src="${barcodes.get(e.sku)}" alt="${escapeHtml(e.sku)}" />` : ''}
          <p class="sku">${escapeHtml(e.sku)}</p>
          <p class="precio">${formatPrecio(e.precioVenta)}</p>
        </div>`).join('');

      ventana.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Etiquetas — Nohemy's Boutique</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; background: white; }
    @page { size: ${LABEL_W_MM}mm ${LABEL_H_MM}mm; margin: 0; }
    .etiqueta {
      width: ${LABEL_W_MM}mm;
      height: ${LABEL_H_MM}mm;
      padding: 1.5mm 2mm;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      gap: 0;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
    }
    .etiqueta:last-child { page-break-after: auto; break-after: auto; }
    .nombre   { font-size: 7pt; font-weight: bold; line-height: 1.1; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 0.5mm; }
    .variante { font-size: 6pt; color: #555; line-height: 1.1; margin-bottom: 0.5mm; }
    .barcode  { display: block; max-width: 92%; max-height: 10mm; width: auto; height: auto; object-fit: contain; margin: 0.5mm auto; }
    .sku      { font-size: 5.5pt; color: #666; letter-spacing: 0.3px; margin-bottom: 0.5mm; }
    .precio   { font-size: 9pt; font-weight: bold; line-height: 1; }
  </style>
</head>
<body>
  ${contenidoEtiquetas}
  <script>window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 400); });<\/script>
</body>
</html>`);
      ventana.document.close();
    } finally {
      setGenerando(false);
    }
  }

  async function descargarPDF() {
    if (etiquetas.length === 0) return;
    const expandidas = expandirEtiquetas();
    setGenerando(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: [LABEL_W_MM, LABEL_H_MM] });

      const barcodes = new Map<string, string>();
      for (const e of etiquetas) barcodes.set(e.sku, await generarBarcodeDataUrl(e.sku));

      // Posiciones dentro de la etiqueta de 50×30mm.
      const BAR_H   = 7;   // altura del código de barras en mm
      const BAR_W   = LABEL_W_MM - 8;
      const cX        = LABEL_W_MM / 2;
      const Y_NOMBRE   = 5;
      const Y_VARIANTE = 9.5;
      const Y_BAR_TOP  = 11.5;
      const Y_SKU      = Y_BAR_TOP + BAR_H + 2;   // ~20.5
      const Y_PRECIO   = Y_SKU + 5.5;             // ~26

      expandidas.forEach((e, idx) => {
        if (idx > 0) doc.addPage([LABEL_W_MM, LABEL_H_MM]);

        doc.setFont('courier', 'bold'); doc.setFontSize(7);
        const nombreCorto = e.productoNombre.length > 30 ? e.productoNombre.slice(0, 28) + '…' : e.productoNombre;
        doc.text(nombreCorto, cX, Y_NOMBRE, { align: 'center' });

        doc.setFont('courier', 'normal'); doc.setFontSize(6);
        doc.text([e.talla, e.color].filter(Boolean).join(' / ') || '—', cX, Y_VARIANTE, { align: 'center' });

        const dataUrl = barcodes.get(e.sku);
        if (dataUrl) doc.addImage(dataUrl, 'PNG', cX - BAR_W / 2, Y_BAR_TOP, BAR_W, BAR_H);

        doc.setFontSize(5.5);
        doc.text(e.sku, cX, Y_SKU, { align: 'center' });

        doc.setFont('courier', 'bold'); doc.setFontSize(10);
        doc.text(formatPrecio(e.precioVenta), cX, Y_PRECIO, { align: 'center' });
      });

      doc.save(`etiquetas-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      toast.error('No se pudo generar el PDF de etiquetas');
    } finally {
      setGenerando(false);
    }
  }

  const totalEtiquetas = etiquetas.reduce((s, e) => s + e.cantidad, 0);

  return (
    <>
      <div className="space-y-5 max-w-6xl">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-playfair text-2xl font-bold text-boutique-dark">
              Etiquetas de <span className="text-gold">códigos de barras</span>
            </h1>
            <p className="text-sm text-boutique-gray-mid mt-0.5">
              Seleccioná los productos y cantidades. Etiquetas de {LABEL_W_MM}×{LABEL_H_MM}mm para impresora térmica (rollo continuo).
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={descargarPDF}
              disabled={etiquetas.length === 0 || generando}
              aria-label="Descargar etiquetas como PDF"
              className="btn-boutique-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={16} aria-hidden="true" /> Descargar PDF
            </button>
            <button
              onClick={imprimir}
              disabled={etiquetas.length === 0 || generando}
              aria-label={`Imprimir ${totalEtiquetas} etiquetas`}
              className="btn-boutique-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Printer size={16} aria-hidden="true" />
              Imprimir {totalEtiquetas > 0 ? `(${totalEtiquetas})` : ''}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">

          {/* ── Panel izquierdo: selector de productos ── */}
          <div className="card-boutique overflow-hidden flex flex-col" style={{ maxHeight: '75vh' }}>
            <div className="p-4 border-b border-blush">
              <h2 className="font-playfair font-semibold text-boutique-dark mb-3 flex items-center gap-2">
                <Package size={16} className="text-gold" aria-hidden="true" /> Productos
              </h2>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-boutique-gray-mid" aria-hidden="true" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar producto..."
                  aria-label="Buscar producto por nombre"
                  className="w-full input-boutique pl-8 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-blush">
              {cargando ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin motion-reduce:animate-none motion-reduce:opacity-50" />
                </div>
              ) : errorBusqueda ? (
                <div className="flex flex-col items-center py-12 gap-3 text-center px-4">
                  <AlertCircle size={24} className="text-boutique-danger" />
                  <p className="text-xs text-boutique-danger">{errorBusqueda}</p>
                  <button onClick={() => cargarProductos(busqueda)} className="btn-boutique-secondary text-xs px-3 py-1.5">
                    Reintentar
                  </button>
                </div>
              ) : productos.length === 0 ? (
                <p className="text-sm text-boutique-gray-mid text-center py-8">
                  {busqueda ? 'Sin resultados para esa búsqueda' : 'Sin productos en el catálogo'}
                </p>
              ) : (
                productos.map((prod) => (
                  <div key={prod.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Thumbnail — helps distinguish products with similar names */}
                        {prod.imagenUrl ? (
                          <img
                            src={prod.imagenUrl}
                            alt=""
                            aria-hidden="true"
                            className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-blush"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-blush flex items-center justify-center flex-shrink-0" aria-hidden="true">
                            <Package size={14} className="text-gold" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-boutique-dark truncate">{prod.nombre}</p>
                          <p className="text-xs font-mono text-gold">{formatPrecio(prod.precioVenta)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => agregarTodas(prod)}
                        aria-label={`Agregar todas las variantes de ${prod.nombre}`}
                        className="text-[10px] font-medium text-gold hover:text-boutique-dark border border-blush rounded-lg px-2 py-1 hover:bg-blush-light transition-colors flex-shrink-0 ml-2"
                      >
                        + Todas
                      </button>
                    </div>
                    {/* Variant chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {prod.variantes.map((v) => {
                        const varLabel = [v.talla, v.color].filter(Boolean).join(' / ') || v.sku;
                        return (
                          <button
                            key={v.id}
                            onClick={() => agregarVariante(prod, v)}
                            aria-label={`Agregar ${varLabel} de ${prod.nombre}`}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-blush hover:border-gold hover:bg-blush-light transition-colors text-[10px] group"
                          >
                            <span className="text-boutique-dark">{varLabel}</span>
                            <Plus size={9} className="text-gold opacity-0 group-hover:opacity-100" aria-hidden="true" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Panel derecho: cola de impresión ── */}
          <div className="card-boutique overflow-hidden flex flex-col" style={{ maxHeight: '75vh' }}>
            <div className="p-4 border-b border-blush flex items-center justify-between">
              <h2 className="font-playfair font-semibold text-boutique-dark flex items-center gap-2">
                <Tag size={16} className="text-gold" aria-hidden="true" />
                Cola de impresión
                {etiquetas.length > 0 && (
                  <span className="text-xs bg-gold text-white rounded-full px-2 py-0.5">
                    {totalEtiquetas} etiquetas
                  </span>
                )}
              </h2>
              {etiquetas.length > 0 && (
                <button
                  onClick={() => setConfirmandoLimpiar(true)}
                  className="text-xs text-boutique-gray-mid hover:text-boutique-danger transition-colors"
                >
                  Limpiar todo
                </button>
              )}
            </div>

            {etiquetas.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <Tag size={32} className="text-gold-light mb-3" aria-hidden="true" />
                <p className="text-sm text-boutique-gray-mid">
                  Seleccioná productos del panel izquierdo para agregar etiquetas
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {/* Label preview */}
                <div className="p-4 bg-boutique-white border-b border-blush">
                  <p className="text-[10px] font-medium text-boutique-gray-mid mb-2 text-center">
                    Vista previa · etiqueta térmica {LABEL_W_MM}×{LABEL_H_MM}mm
                  </p>
                  <div className="bg-white border border-dashed border-gold rounded-xl p-3 max-w-[200px] mx-auto text-center">
                    <p className="text-[10px] font-bold text-boutique-dark truncate mb-0.5">
                      {etiquetas[0].productoNombre}
                    </p>
                    <p className="text-[9px] text-boutique-gray-mid mb-1">
                      {[etiquetas[0].talla, etiquetas[0].color].filter(Boolean).join(' / ') || '—'}
                    </p>
                    <div role="img" aria-label={`Código de barras: ${etiquetas[0].sku}`}>
                      <BarcodeCanvas value={etiquetas[0].sku} width={1} height={28} className="mx-auto" />
                    </div>
                    {/* P3: upgraded from text-[8px] to text-[10px] for readability */}
                    <p className="text-[10px] text-boutique-gray-mid mt-0.5 font-mono">{etiquetas[0].sku}</p>
                    <p className="text-sm font-mono font-bold text-boutique-dark mt-1">
                      {formatPrecio(etiquetas[0].precioVenta)}
                    </p>
                  </div>
                </div>

                {/* Queue list */}
                <div className="divide-y divide-blush">
                  {etiquetas.map((e) => {
                    const varLabel = [e.talla, e.color].filter(Boolean).join('/');
                    return (
                      <div key={e.sku} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-boutique-dark truncate">{e.productoNombre}</p>
                          <p className="text-[10px] font-mono text-boutique-gray-mid">
                            {e.sku}
                            {varLabel && <span className="ml-1 text-gold">· {varLabel}</span>}
                          </p>
                        </div>

                        {/* Quantity stepper — minus disabled at 1; click number to type directly */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => cambiarCantidad(e.sku, -1)}
                            disabled={e.cantidad <= 1}
                            aria-label={`Reducir cantidad de ${e.productoNombre}`}
                            className="min-w-[44px] min-h-[44px] rounded border border-blush flex items-center justify-center hover:bg-blush-light transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Minus size={10} />
                          </button>

                          {/* Click to type quantity directly */}
                          {editandoCantidad === e.sku ? (
                            <input
                              type="number"
                              min="1"
                              value={cantidadInput}
                              autoFocus
                              onChange={(ev) => setCantidadInput(ev.target.value)}
                              onBlur={() => confirmarCantidad(e.sku)}
                              onKeyDown={(ev) => {
                                if (ev.key === 'Enter') confirmarCantidad(e.sku);
                                if (ev.key === 'Escape') setEditandoCantidad(null);
                              }}
                              aria-label={`Cantidad de etiquetas para ${e.productoNombre}`}
                              className="w-10 text-center text-sm font-mono font-bold text-boutique-dark border border-gold rounded px-1 py-0 focus:outline-none focus:ring-1 focus:ring-gold"
                            />
                          ) : (
                            <button
                              onClick={() => iniciarEdicionCantidad(e)}
                              aria-label={`Cantidad: ${e.cantidad}. Clic para editar`}
                              title="Clic para editar cantidad"
                              className="w-8 text-center text-sm font-mono font-bold text-boutique-dark hover:bg-blush-light rounded px-1 cursor-text transition-colors"
                            >
                              {e.cantidad}
                            </button>
                          )}

                          <button
                            onClick={() => cambiarCantidad(e.sku, 1)}
                            aria-label={`Aumentar cantidad de ${e.productoNombre}`}
                            className="min-w-[44px] min-h-[44px] rounded border border-blush flex items-center justify-center hover:bg-blush-light transition-colors"
                          >
                            <Plus size={10} />
                          </button>
                        </div>

                        <button
                          onClick={() => eliminar(e.sku)}
                          aria-label={`Eliminar ${e.productoNombre} de la cola`}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-boutique-gray-mid hover:text-boutique-danger transition-colors flex-shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer — print actions */}
            {etiquetas.length > 0 && (
              <div className="p-4 border-t border-blush bg-boutique-white space-y-2">
                <p className="text-[10px] text-boutique-gray-mid text-center">
                  {totalEtiquetas} etiqueta{totalEtiquetas !== 1 ? 's' : ''} de {LABEL_W_MM}×{LABEL_H_MM}mm
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={descargarPDF}
                    disabled={generando}
                    aria-label="Descargar etiquetas como PDF"
                    className="flex-1 btn-boutique-secondary flex items-center justify-center gap-2 py-3 disabled:opacity-50"
                  >
                    <Download size={16} aria-hidden="true" /> PDF
                  </button>
                  <button
                    onClick={imprimir}
                    disabled={generando}
                    aria-label="Imprimir etiquetas"
                    className="flex-1 btn-boutique-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50"
                  >
                    {generando
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
                      : <Printer size={16} aria-hidden="true" />
                    }
                    Imprimir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Confirmation: Limpiar todo ── */}
      <Dialog open={confirmandoLimpiar} onOpenChange={(v) => !v && setConfirmandoLimpiar(false)}>
        <DialogContent className="max-w-sm rounded-2xl border border-blush p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-blush bg-boutique-white">
            <DialogTitle className="font-playfair text-lg font-bold text-boutique-dark">¿Limpiar la cola?</DialogTitle>
            <DialogDescription className="text-xs text-boutique-gray-mid">
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <p className="text-sm text-boutique-dark">
              La cola tiene <span className="font-semibold">{totalEtiquetas} etiquetas</span> en {etiquetas.length} ítem{etiquetas.length !== 1 ? 's' : ''}.
              Se eliminarán todas.
            </p>
            <div className="flex gap-3 pt-1 border-t border-blush">
              <button
                onClick={() => setConfirmandoLimpiar(false)}
                className="flex-1 btn-boutique-secondary text-sm py-2.5"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setEtiquetas([]); setConfirmandoLimpiar(false); }}
                className="flex-1 btn-boutique-danger text-sm py-2.5"
              >
                Limpiar todo
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
