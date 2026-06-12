'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, Printer, Plus, Minus, Trash2, Tag, Package, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatPrecio } from '@/lib/boutique';
import { BarcodeCanvas } from '@/components/boutique/BarcodeCanvas';

interface Variante {
  id: string;
  sku: string;
  talla: string | null;
  color: string | null;
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

// Cantidad de etiquetas por hoja tamaño carta (3 columnas x 8 filas)
const COLUMNAS = 3;
const FILAS = 8;
const POR_HOJA = COLUMNAS * FILAS;

function escapeHtml(texto: string): string {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

// Genera el código de barras de un SKU como imagen PNG (data URL) usando bwip-js
async function generarBarcodeDataUrl(sku: string): Promise<string> {
  try {
    const bwipjs = await import('bwip-js');
    const canvas = document.createElement('canvas');
    bwipjs.toCanvas(canvas, {
      bcid: 'code128',
      text: sku,
      scale: 3,
      height: 12,
      includetext: false,
      backgroundcolor: 'ffffff',
    });
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

export default function EtiquetasPage() {
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [etiquetas, setEtiquetas] = useState<EtiquetaItem[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Buscar productos
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      cargarProductos(busqueda);
    }, 250);
  }, [busqueda]);

  useEffect(() => { cargarProductos(''); }, []);

  async function cargarProductos(q: string) {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      const res = await fetch(`/api/pos/buscar?${params}`);
      const d = await res.json();
      setProductos(d.data ?? []);
    } finally {
      setCargando(false);
    }
  }

  function agregarVariante(prod: Producto, variante: Variante) {
    setEtiquetas((prev) => {
      const existe = prev.find((e) => e.sku === variante.sku);
      if (existe) {
        return prev.map((e) =>
          e.sku === variante.sku ? { ...e, cantidad: e.cantidad + 1 } : e
        );
      }
      return [
        ...prev,
        {
          productoNombre: prod.nombre,
          precioVenta: prod.precioVenta,
          sku: variante.sku,
          talla: variante.talla,
          color: variante.color,
          cantidad: 1,
        },
      ];
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

  function eliminar(sku: string) {
    setEtiquetas((prev) => prev.filter((e) => e.sku !== sku));
  }

  function expandirEtiquetas(): EtiquetaItem[] {
    const expandidas: EtiquetaItem[] = [];
    for (const e of etiquetas) {
      for (let i = 0; i < e.cantidad; i++) expandidas.push(e);
    }
    return expandidas;
  }

  // Genera y abre la vista de impresión en tamaño carta (3x8 etiquetas por hoja)
  async function imprimir() {
    if (etiquetas.length === 0) return;
    const expandidas = expandirEtiquetas();

    setGenerando(true);
    try {
      // Generar el código de barras de cada SKU único
      const barcodes = new Map<string, string>();
      for (const e of etiquetas) {
        barcodes.set(e.sku, await generarBarcodeDataUrl(e.sku));
      }

      const ventana = window.open('', '_blank', 'width=900,height=700');
      if (!ventana) {
        toast.error('El navegador bloqueó la ventana de impresión. Habilita las ventanas emergentes.');
        return;
      }

      // Agrupar etiquetas en hojas de POR_HOJA (3x8 = 24)
      const hojas: EtiquetaItem[][] = [];
      for (let i = 0; i < expandidas.length; i += POR_HOJA) {
        hojas.push(expandidas.slice(i, i + POR_HOJA));
      }

      const contenidoHojas = hojas
        .map(
          (hoja) => `
      <div class="hoja">
        ${hoja
          .map(
            (e) => `
        <div class="etiqueta">
          <p class="nombre">${escapeHtml(e.productoNombre)}</p>
          <p class="variante">${escapeHtml([e.talla, e.color].filter(Boolean).join(' / ') || '—')}</p>
          ${barcodes.get(e.sku) ? `<img class="barcode" src="${barcodes.get(e.sku)}" alt="${escapeHtml(e.sku)}" />` : ''}
          <p class="sku">${escapeHtml(e.sku)}</p>
          <p class="precio">${formatPrecio(e.precioVenta)}</p>
        </div>`
          )
          .join('')}
      </div>`
        )
        .join('');

      ventana.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Etiquetas — Nohemy's Boutique</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      background: white;
    }
    .hoja {
      display: grid;
      grid-template-columns: repeat(${COLUMNAS}, 1fr);
      grid-template-rows: repeat(${FILAS}, 1fr);
      width: 100%;
      height: 100vh;
      page-break-after: always;
    }
    .hoja:last-child { page-break-after: auto; }
    .etiqueta {
      border: 1px dashed #ccc;
      padding: 2mm;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .nombre {
      font-size: 8pt;
      font-weight: bold;
      line-height: 1.2;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .variante {
      font-size: 7pt;
      color: #555;
      margin-top: 1px;
    }
    .barcode {
      display: block;
      max-width: 90%;
      height: auto;
      margin: 2px auto;
    }
    .sku {
      font-size: 6.5pt;
      color: #777;
      letter-spacing: 0.5px;
    }
    .precio {
      font-size: 11pt;
      font-weight: bold;
      margin-top: 1px;
    }
    @page {
      size: letter;
      margin: 8mm;
    }
    @media print {
      .etiqueta { border: 1px dashed #999; }
    }
  </style>
</head>
<body>
  ${contenidoHojas}
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 300);
    });
  <\/script>
</body>
</html>`);
      ventana.document.close();
    } finally {
      setGenerando(false);
    }
  }

  // Genera un PDF tamaño carta con las etiquetas seleccionadas (3x8 por hoja)
  async function descargarPDF() {
    if (etiquetas.length === 0) return;
    const expandidas = expandirEtiquetas();

    setGenerando(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'letter' });

      const barcodes = new Map<string, string>();
      for (const e of etiquetas) {
        barcodes.set(e.sku, await generarBarcodeDataUrl(e.sku));
      }

      const margen = 8;
      const pageW = 215.9;
      const pageH = 279.4;
      const cellW = (pageW - margen * 2) / COLUMNAS;
      const cellH = (pageH - margen * 2) / FILAS;

      expandidas.forEach((e, idx) => {
        const posEnHoja = idx % POR_HOJA;
        if (idx > 0 && posEnHoja === 0) doc.addPage();

        const col = posEnHoja % COLUMNAS;
        const fila = Math.floor(posEnHoja / COLUMNAS);
        const x = margen + col * cellW;
        const y = margen + fila * cellH;

        doc.setDrawColor(204, 204, 204);
        doc.setLineDashPattern([1, 1], 0);
        doc.rect(x, y, cellW, cellH);
        doc.setLineDashPattern([], 0);

        const centroX = x + cellW / 2;

        doc.setFont('courier', 'bold');
        doc.setFontSize(8);
        const nombreCorto =
          e.productoNombre.length > 28 ? e.productoNombre.slice(0, 26) + '…' : e.productoNombre;
        doc.text(nombreCorto, centroX, y + 5, { align: 'center' });

        doc.setFont('courier', 'normal');
        doc.setFontSize(6.5);
        const variante = [e.talla, e.color].filter(Boolean).join(' / ') || '—';
        doc.text(variante, centroX, y + 9, { align: 'center' });

        const dataUrl = barcodes.get(e.sku);
        if (dataUrl) {
          const imgW = cellW - 10;
          const imgH = 10;
          doc.addImage(dataUrl, 'PNG', centroX - imgW / 2, y + 11, imgW, imgH);
        }

        doc.setFontSize(6);
        doc.text(e.sku, centroX, y + 24, { align: 'center' });

        doc.setFont('courier', 'bold');
        doc.setFontSize(11);
        doc.text(formatPrecio(e.precioVenta), centroX, y + 30, { align: 'center' });
      });

      const fecha = new Date().toISOString().slice(0, 10);
      doc.save(`etiquetas-${fecha}.pdf`);
    } catch {
      toast.error('No se pudo generar el PDF de etiquetas');
    } finally {
      setGenerando(false);
    }
  }

  const totalEtiquetas = etiquetas.reduce((s, e) => s + e.cantidad, 0);

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">
            Etiquetas de <span className="text-[#C9A84C]">códigos de barras</span>
          </h1>
          <p className="text-sm text-[#9E9E9E] mt-0.5">
            Seleccioná los productos y cantidades. Tamaño carta, {POR_HOJA} etiquetas por hoja ({COLUMNAS}x{FILAS}).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={descargarPDF}
            disabled={etiquetas.length === 0 || generando}
            className="btn-boutique-secondary flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={16} />
            Descargar PDF
          </button>
          <button
            onClick={imprimir}
            disabled={etiquetas.length === 0 || generando}
            className="btn-boutique-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Printer size={16} />
            Imprimir {totalEtiquetas > 0 ? `(${totalEtiquetas})` : ''}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Panel izquierdo: selector de productos */}
        <div className="card-boutique overflow-hidden flex flex-col" style={{ maxHeight: '75vh' }}>
          <div className="p-4 border-b border-[#F2C4CE]">
            <h2 className="font-playfair font-semibold text-[#2C2C2C] mb-3 flex items-center gap-2">
              <Package size={16} className="text-[#C9A84C]" /> Productos
            </h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full input-boutique pl-8 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#F2C4CE]">
            {cargando ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : productos.length === 0 ? (
              <p className="text-sm text-[#9E9E9E] text-center py-8">Sin productos</p>
            ) : (
              productos.map((prod) => (
                <div key={prod.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-[#2C2C2C]">{prod.nombre}</p>
                      <p className="text-xs font-mono text-[#C9A84C]">{formatPrecio(prod.precioVenta)}</p>
                    </div>
                    <button
                      onClick={() => agregarTodas(prod)}
                      className="text-[10px] font-medium text-[#C9A84C] hover:text-[#2C2C2C] border border-[#F2C4CE] rounded-lg px-2 py-1 hover:bg-[#F8E1E7] transition-colors"
                    >
                      + Todas
                    </button>
                  </div>
                  {/* Variantes */}
                  <div className="flex flex-wrap gap-1.5">
                    {prod.variantes.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => agregarVariante(prod, v)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[#F2C4CE] hover:border-[#C9A84C] hover:bg-[#F8E1E7] transition-colors text-[10px] group"
                        title={`SKU: ${v.sku}`}
                      >
                        <span className="text-[#2C2C2C]">
                          {[v.talla, v.color].filter(Boolean).join(' / ') || v.sku}
                        </span>
                        <Plus size={9} className="text-[#C9A84C] opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel derecho: cola de impresión */}
        <div className="card-boutique overflow-hidden flex flex-col" style={{ maxHeight: '75vh' }}>
          <div className="p-4 border-b border-[#F2C4CE] flex items-center justify-between">
            <h2 className="font-playfair font-semibold text-[#2C2C2C] flex items-center gap-2">
              <Tag size={16} className="text-[#C9A84C]" />
              Cola de impresión
              {etiquetas.length > 0 && (
                <span className="text-xs bg-[#C9A84C] text-white rounded-full px-2 py-0.5">
                  {totalEtiquetas} etiquetas
                </span>
              )}
            </h2>
            {etiquetas.length > 0 && (
              <button
                onClick={() => setEtiquetas([])}
                className="text-xs text-[#9E9E9E] hover:text-[#E57373] transition-colors"
              >
                Limpiar todo
              </button>
            )}
          </div>

          {etiquetas.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Tag size={32} className="text-[#E8D5A3] mb-3" />
              <p className="text-sm text-[#9E9E9E]">
                Seleccioná productos del panel izquierdo para agregar etiquetas
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* Preview de etiqueta (primera de la cola) */}
              <div className="p-4 bg-[#FAFAFA] border-b border-[#F2C4CE]">
                <p className="text-[10px] font-medium text-[#9E9E9E] mb-2 text-center">
                  PREVIEW — etiqueta tamaño carta ({COLUMNAS}x{FILAS})
                </p>
                <div className="bg-white border border-dashed border-[#C9A84C] rounded-xl p-3 max-w-[200px] mx-auto text-center">
                  <p className="text-[10px] font-bold text-[#2C2C2C] truncate mb-0.5">
                    {etiquetas[0].productoNombre}
                  </p>
                  <p className="text-[9px] text-[#9E9E9E] mb-1">
                    {[etiquetas[0].talla, etiquetas[0].color].filter(Boolean).join(' / ') || '—'}
                  </p>
                  <BarcodeCanvas value={etiquetas[0].sku} width={1} height={28} className="mx-auto" />
                  <p className="text-[8px] text-[#9E9E9E] mt-0.5 font-mono">{etiquetas[0].sku}</p>
                  <p className="text-sm font-mono font-bold text-[#2C2C2C] mt-1">
                    {formatPrecio(etiquetas[0].precioVenta)}
                  </p>
                </div>
              </div>

              {/* Lista de la cola */}
              <div className="divide-y divide-[#F2C4CE]">
                {etiquetas.map((e) => (
                  <div key={e.sku} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#2C2C2C] truncate">{e.productoNombre}</p>
                      <p className="text-[10px] font-mono text-[#9E9E9E]">
                        {e.sku}
                        {(e.talla || e.color) && (
                          <span className="ml-1 text-[#C9A84C]">
                            · {[e.talla, e.color].filter(Boolean).join('/')}
                          </span>
                        )}
                      </p>
                    </div>
                    {/* Cantidad */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => cambiarCantidad(e.sku, -1)}
                        className="w-6 h-6 rounded border border-[#F2C4CE] flex items-center justify-center hover:bg-[#F8E1E7] transition-colors"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="w-6 text-center text-sm font-mono font-bold text-[#2C2C2C]">
                        {e.cantidad}
                      </span>
                      <button
                        onClick={() => cambiarCantidad(e.sku, 1)}
                        className="w-6 h-6 rounded border border-[#F2C4CE] flex items-center justify-center hover:bg-[#F8E1E7] transition-colors"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    <button
                      onClick={() => eliminar(e.sku)}
                      className="text-[#9E9E9E] hover:text-[#E57373] transition-colors flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer con botones de acción */}
          {etiquetas.length > 0 && (
            <div className="p-4 border-t border-[#F2C4CE] bg-[#FAFAFA] space-y-2">
              <p className="text-[10px] text-[#9E9E9E] text-center">
                {totalEtiquetas} etiqueta{totalEtiquetas !== 1 ? 's' : ''} ·{' '}
                {Math.ceil(totalEtiquetas / POR_HOJA)} hoja{Math.ceil(totalEtiquetas / POR_HOJA) !== 1 ? 's' : ''} tamaño carta
              </p>
              <div className="flex gap-2">
                <button
                  onClick={descargarPDF}
                  disabled={generando}
                  className="flex-1 btn-boutique-secondary flex items-center justify-center gap-2 py-3 disabled:opacity-50"
                >
                  <Download size={16} />
                  PDF
                </button>
                <button
                  onClick={imprimir}
                  disabled={generando}
                  className="flex-1 btn-boutique-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50"
                >
                  {generando ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Printer size={16} />
                  )}
                  Imprimir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
