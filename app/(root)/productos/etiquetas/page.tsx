'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, Printer, Plus, Minus, Trash2, Tag, Package } from 'lucide-react';
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

export default function EtiquetasPage() {
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [etiquetas, setEtiquetas] = useState<EtiquetaItem[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
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

  // Genera el HTML de etiquetas para imprimir
  function imprimir() {
    if (etiquetas.length === 0) return;

    // Construir etiquetas expandidas (repetir según cantidad)
    const expandidas: EtiquetaItem[] = [];
    for (const e of etiquetas) {
      for (let i = 0; i < e.cantidad; i++) expandidas.push(e);
    }

    // Abrir ventana de impresión con layout 80mm
    const ventana = window.open('', '_blank', 'width=600,height=700');
    if (!ventana) return;

    const contenido = expandidas
      .map(
        (e) => `
      <div class="etiqueta">
        <p class="nombre">${e.productoNombre}</p>
        <p class="variante">${[e.talla, e.color].filter(Boolean).join(' / ') || '—'}</p>
        <canvas id="bc-${e.sku}-${Math.random().toString(36).slice(2)}" class="barcode"></canvas>
        <p class="sku">${e.sku}</p>
        <p class="precio">Q ${e.precioVenta.toFixed(2)}</p>
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
      padding: 4px;
    }
    .etiqueta {
      width: 72mm;
      padding: 4px 4px 6px;
      margin-bottom: 4px;
      border-bottom: 1px dashed #ccc;
      page-break-inside: avoid;
      text-align: center;
    }
    .nombre {
      font-size: 9pt;
      font-weight: bold;
      line-height: 1.2;
      margin-bottom: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .variante {
      font-size: 7.5pt;
      color: #555;
      margin-bottom: 3px;
    }
    .barcode {
      display: block;
      margin: 2px auto;
      max-width: 100%;
    }
    .sku {
      font-size: 6.5pt;
      color: #777;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .precio {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 3px;
    }
    @page {
      size: 80mm auto;
      margin: 0;
    }
    @media print {
      body { padding: 2px; }
      .etiqueta { border-bottom: 1px dashed #999; }
    }
  </style>
</head>
<body>
  ${contenido}
  <script src="https://cdn.jsdelivr.net/npm/bwip-js@4/dist/bwip-js-min.js"><\/script>
  <script>
    window.addEventListener('load', function() {
      document.querySelectorAll('canvas[id^="bc-"]').forEach(function(canvas) {
        var sku = canvas.id.replace(/^bc-/, '').replace(/-[a-z0-9]+$/, '');
        // El id es bc-SKU-random, extraemos el SKU entre el primer y último guión
        var parts = canvas.id.split('-');
        // Reconstruir el SKU (todo excepto 'bc' prefijo y el sufijo random)
        var skuVal = parts.slice(1, parts.length - 1).join('-');
        try {
          bwipjs.toCanvas(canvas, {
            bcid: 'code128',
            text: skuVal || 'SKU',
            scale: 2,
            height: 30,
            includetext: false,
            backgroundcolor: 'ffffff'
          });
        } catch(e) {}
      });
      setTimeout(function() { window.print(); }, 800);
    });
  <\/script>
</body>
</html>`);
    ventana.document.close();
  }

  const totalEtiquetas = etiquetas.reduce((s, e) => s + e.cantidad, 0);

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">
            Etiquetas de <span className="text-[#C9A84C]">códigos de barras</span>
          </h1>
          <p className="text-sm text-[#9E9E9E] mt-0.5">
            Seleccioná los productos y cantidades, luego imprimí en la AON PR-250
          </p>
        </div>
        <button
          onClick={imprimir}
          disabled={etiquetas.length === 0}
          className="btn-boutique-primary flex items-center gap-2 disabled:opacity-50"
        >
          <Printer size={16} />
          Imprimir {totalEtiquetas > 0 ? `(${totalEtiquetas})` : ''}
        </button>
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
                <p className="text-[10px] font-medium text-[#9E9E9E] mb-2 text-center">PREVIEW — 80mm</p>
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

          {/* Footer con botón de impresión */}
          {etiquetas.length > 0 && (
            <div className="p-4 border-t border-[#F2C4CE] bg-[#FAFAFA]">
              <p className="text-[10px] text-[#9E9E9E] text-center mb-3">
                Se abrirá el diálogo de impresión. Seleccioná la <strong>AON PR-250</strong> como impresora.
              </p>
              <button
                onClick={imprimir}
                className="w-full btn-boutique-primary flex items-center justify-center gap-2 py-3"
              >
                <Printer size={16} />
                Imprimir {totalEtiquetas} etiqueta{totalEtiquetas !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
