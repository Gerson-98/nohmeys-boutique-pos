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
  codigoBarras: string | null;
  talla: string | null;
  color: string | null;
  precioVenta: number | null;
  stockActual: number;
}

interface Producto {
  id: string;
  nombre: string;
  marca: string | null;
  precioVenta: number;
  imagenUrl: string | null;
  variantes: Variante[];
}

interface EtiquetaItem {
  productoNombre: string;
  marca: string | null;
  precioVenta: number;
  sku: string;
  codigoBarras: string | null;
  talla: string | null;
  color: string | null;
  cantidad: number;
}

// Aiyin E40 — etiqueta 50mm × 25mm (landscape)
const LABEL_W_MM = 50;
const LABEL_H_MM = 25;
const LABEL_W_IN = 1.969;
const LABEL_H_IN = 0.984;


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

// Rota una imagen 90° en sentido horario (CW) — el driver del Aiyin E40 rota 90° CCW,
// así que pre-rotamos el barcode CW para que el resultado final sea correcto.
async function rotarImagen90CW(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.height;
      c.height = img.width;
      const ctx = c.getContext('2d')!;
      ctx.translate(img.height, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
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
      return [...prev, {
        productoNombre: prod.nombre,
        marca: prod.marca ?? null,
        precioVenta: variante.precioVenta ?? prod.precioVenta,
        sku: variante.sku,
        codigoBarras: variante.codigoBarras ?? null,
        talla: variante.talla,
        color: variante.color,
        cantidad: 1,
      }];
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
      // Imprimimos como PNG para evitar que el driver rote el contenido.
      // 8 px/mm ≈ 203 DPI (resolución estándar de impresoras térmicas)
      const S = 8;
      const CW = LABEL_W_MM * S; // 400px = 50mm
      const CH = LABEL_H_MM * S; // 200px = 25mm

      const barcodes = new Map<string, string>();
      for (const e of etiquetas) {
        const val = e.codigoBarras || e.sku;
        barcodes.set(e.sku, await generarBarcodeDataUrl(val));
      }

      // Generamos todos los canvas primero y los enviamos en UN solo llamado
      const images: string[] = [];

      for (const e of expandidas) {
        const canvas = document.createElement('canvas');
        canvas.width  = CW;
        canvas.height = CH;
        const ctx = canvas.getContext('2d')!;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'middle';

        const varLabel = [e.talla, e.color].filter(Boolean).join(' / ');

        // --- Precio: lo medimos primero para calcular el espacio disponible para el nombre ---
        const pxPre = Math.round(9 * 0.353 * S);
        ctx.font = `bold ${pxPre}px Helvetica,Arial,sans-serif`;
        const precioStr = formatPrecio(e.precioVenta);
        const precioW = ctx.measureText(precioStr).width;
        // El nombre puede ocupar desde x=2mm hasta donde empieza el precio (con 2mm de separación)
        const maxNombreW = CW - precioW - 4 * S; // 4mm = margen izq 2mm + separación 2mm

        // Nombre: reducimos el font hasta que quepa en el espacio disponible
        let ptNom = 7;
        let pxNom = Math.round(ptNom * 0.353 * S);
        ctx.font = `bold ${pxNom}px Helvetica,Arial,sans-serif`;
        let nombreStr = e.productoNombre;
        while (ctx.measureText(nombreStr).width > maxNombreW && ptNom > 4.5) {
          ptNom -= 0.5;
          pxNom = Math.round(ptNom * 0.353 * S);
          ctx.font = `bold ${pxNom}px Helvetica,Arial,sans-serif`;
        }
        // Si aún no cabe con el font mínimo, truncamos con ellipsis
        if (ctx.measureText(nombreStr).width > maxNombreW) {
          while (nombreStr.length > 1 && ctx.measureText(nombreStr + '…').width > maxNombreW) {
            nombreStr = nombreStr.slice(0, -1);
          }
          nombreStr = nombreStr + '…';
        }

        ctx.textAlign = 'left';
        ctx.fillText(nombreStr, 2 * S, 5 * S);

        // Precio (derecha, fila 1)
        ctx.font = `bold ${pxPre}px Helvetica,Arial,sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText(precioStr, (LABEL_W_MM - 2) * S, 5 * S);

        // Variante (normal, izquierda, fila 2)
        if (varLabel) {
          const pxVar = Math.round(5.5 * 0.353 * S);
          ctx.font = `${pxVar}px Helvetica,Arial,sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillText(varLabel, 2 * S, 9.5 * S);
        }

        // Código de barras
        const barcodeUrl = barcodes.get(e.sku);
        if (barcodeUrl) {
          await new Promise<void>((resolve) => {
            const img = new window.Image();
            img.onload = () => {
              ctx.drawImage(img, 2 * S, 12 * S, (LABEL_W_MM - 4) * S, 8 * S);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = barcodeUrl;
          });
        }

        // SKU centrado debajo del barcode
        const pxSku = Math.round(4.5 * 0.353 * S);
        ctx.font = `${pxSku}px 'Courier New',monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(e.codigoBarras || e.sku, CW / 2, 21.5 * S);

        images.push(canvas.toDataURL('image/png').split(',')[1]);
      }

      // Un único fetch para todas las etiquetas → un único trabajo lp sin pausas
      const res = await fetch('/api/etiquetas/imprimir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Error al enviar a la impresora');
      }
      toast.success(`${expandidas.length} etiqueta${expandidas.length !== 1 ? 's' : ''} enviada${expandidas.length !== 1 ? 's' : ''} a la impresora`);
    } catch (err: any) {
      toast.error('Error al imprimir: ' + err.message);
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
      const W = LABEL_W_MM; // 50mm ancho
      const H = LABEL_H_MM; // 25mm alto
      const doc = new jsPDF({ unit: 'mm', format: [W, H] });

      const barcodes = new Map<string, string>();
      for (const e of etiquetas) {
        const val = e.codigoBarras || e.sku;
        barcodes.set(e.sku, await generarBarcodeDataUrl(val));
      }

      // Layout 50mm × 25mm
      // Fila 1: Nombre (izq) | Precio (der)
      // Fila 2: Variante (izq)
      // Fila 3: Barcode ancho completo
      // Fila 4: SKU texto
      const X_L  = 2;
      const X_R  = W - 2;
      const BAR_W = W - 4;
      const BAR_H = 8;
      const Y_NOM = 5;
      const Y_VAR = 9.5;
      const Y_BAR = 12;
      const Y_SKU = Y_BAR + BAR_H + 1.2;

      expandidas.forEach((e, idx) => {
        if (idx > 0) doc.addPage([W, H]);
        const nombreCorto = e.productoNombre.length > 18 ? e.productoNombre.slice(0, 16) + '…' : e.productoNombre;

        doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.text(nombreCorto, X_L, Y_NOM);
        doc.setFontSize(9);
        doc.text(formatPrecio(e.precioVenta), X_R, Y_NOM, { align: 'right' });

        const varLabel = [e.talla, e.color].filter(Boolean).join(' / ');
        if (varLabel) {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5);
          doc.text(varLabel, X_L, Y_VAR);
        }

        const dataUrl = barcodes.get(e.sku);
        if (dataUrl) doc.addImage(dataUrl, 'PNG', X_L, Y_BAR, BAR_W, BAR_H);

        doc.setFont('courier', 'normal'); doc.setFontSize(4.5);
        doc.text(e.codigoBarras || e.sku, W / 2, Y_SKU, { align: 'center' });
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
              Seleccioná productos y cantidades. Etiqueta 1.25″ × 2.25″ (portrait) · Impresora: <span className="font-medium text-boutique-dark">Aiyin E40</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
                    Vista previa · Aiyin E40 · 1.25″ × 2.25″
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
                  {totalEtiquetas} etiqueta{totalEtiquetas !== 1 ? 's' : ''} · 1.25″ × 2.25″ · Aiyin E40
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
