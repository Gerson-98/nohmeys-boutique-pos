'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Search, Package, ScanLine, CheckCircle2, ShoppingCart, Eye } from 'lucide-react';
import { formatPrecio, badgeStock } from '@/lib/boutique';
import type { ProductoPOS } from '../types';
import { ProductPreviewModal } from '@/components/boutique/ProductPreviewModal';

interface Props {
  onAgregarProducto: (producto: ProductoPOS) => void;
  reloadKey?: number;
}

export function ProductSearch({ onAgregarProducto, reloadKey }: Props) {
  const [q, setQ] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [categorias, setCategorias] = useState<{ id: string; nombre: string; icono: string | null }[]>([]);
  const [productos, setProductos] = useState<ProductoPOS[]>([]);
  const [cargando, setCargando] = useState(false);
  const [preview, setPreview] = useState<ProductoPOS | null>(null);
  // Scan feedback
  const [scanFeedback, setScanFeedback] = useState<'ok' | 'error' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Barcode scanner detection: keystrokes arrive < 50ms apart → it's a scanner
  const lastKeyTimeRef = useRef<number>(0);
  const scanBufferRef = useRef<string>('');

  useEffect(() => {
    fetch('/api/categorias').then((r) => r.json()).then((d) => setCategorias(d.data ?? []));
    buscar('', '');
    inputRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresca el catálogo cuando se completa una venta
  useEffect(() => {
    if (reloadKey && reloadKey > 0) buscar(q, categoriaId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const buscar = useCallback(async (query: string, catId: string) => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (catId) params.set('categoriaId', catId);
      const res = await fetch(`/api/pos/buscar?${params}`);
      const d = await res.json();
      setProductos(d.data ?? []);
      return d.data ?? [];
    } finally {
      setCargando(false);
    }
    return [];
  }, []);

  function handleQ(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(value, categoriaId), 250);
  }

  function handleCat(id: string) {
    setCategoriaId(id);
    buscar(q, id);
  }

  // ── Lógica de escaneo ────────────────────────────────────
  // El escáner envía todos los chars en < 50ms luego un Enter.
  // Detectamos eso y agregamos automáticamente al carrito.
  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const now = Date.now();
    const timeSinceLast = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    if (e.key === 'Enter') {
      const sku = q.trim();
      if (!sku) return;

      // Cancelar debounce pendiente
      if (debounceRef.current) clearTimeout(debounceRef.current);

      // Buscar exactamente ese SKU
      const resultados = await buscar(sku, '');

      // Buscar la variante que coincide exactamente con el SKU
      let productoMatch: ProductoPOS | null = null;
      for (const prod of resultados) {
        const varExacta = prod.variantes.find(
          (v: { sku: string }) => v.sku.toLowerCase() === sku.toLowerCase()
        );
        if (varExacta) {
          productoMatch = prod;
          break;
        }
      }

      if (productoMatch) {
        onAgregarProducto(productoMatch);
        setScanFeedback('ok');
        setQ('');
        // Reload catálogo limpio
        buscar('', categoriaId);
      } else if (resultados.length === 1) {
        // Un único resultado aunque no sea match exacto
        onAgregarProducto(resultados[0]);
        setScanFeedback('ok');
        setQ('');
        buscar('', categoriaId);
      } else {
        setScanFeedback('error');
      }

      setTimeout(() => setScanFeedback(null), 1500);
      e.preventDefault();
      return;
    }

    // Acumular buffer del escáner para detectar velocidad
    if (timeSinceLast < 50) {
      scanBufferRef.current += e.key;
    } else {
      scanBufferRef.current = e.key;
    }
  }

  return (
    <>
    <div className="flex flex-col h-full">
      {/* Buscador */}
      <div className="px-4 pt-4 pb-3 border-b border-blush bg-white space-y-3 flex-shrink-0">
        <div className="relative">
          {/* Ícono: muestra feedback del scan */}
          {scanFeedback === 'ok' ? (
            <CheckCircle2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-boutique-success animate-pulse" />
          ) : scanFeedback === 'error' ? (
            <ScanLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-boutique-danger" />
          ) : (
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-boutique-gray-mid" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => handleQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar o escanear código de barras..."
            className={`w-full input-boutique pl-9 transition-colors ${
              scanFeedback === 'ok' ? 'border-boutique-success' : scanFeedback === 'error' ? 'border-boutique-danger' : ''
            }`}
          />
        </div>

        {scanFeedback === 'error' && (
          <p className="text-[11px] text-boutique-danger">
            Producto no encontrado. Verifica el código e intenta de nuevo.
          </p>
        )}

        {/* Chips de categoría */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          <button
            onClick={() => handleCat('')}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              categoriaId === '' ? 'bg-gold text-white' : 'bg-boutique-gray-soft text-boutique-dark hover:bg-blush-light'
            }`}
          >
            Todas
          </button>
          {categorias.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCat(c.id)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                categoriaId === c.id ? 'bg-gold text-white' : 'bg-boutique-gray-soft text-boutique-dark hover:bg-blush-light'
              }`}
            >
              {c.icono} {c.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de productos */}
      <div className="flex-1 overflow-y-auto p-3">
        {cargando ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-blush-light/50 animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 h-40" />
            ))}
          </div>
        ) : productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package size={32} className="text-blush-dark mb-3" />
            <p className="text-sm text-boutique-gray-dark">
              {q
                ? `Sin resultados para "${q}". Prueba con otro nombre o código.`
                : categoriaId
                  ? 'No hay productos en esta categoría.'
                  : 'No hay productos disponibles.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {productos.map((p) => {
              const agotado = p.stockTotal === 0;
              const stockMin = p.variantes.length > 0
                ? Math.min(...p.variantes.map((v) => v.stockMinimo))
                : 2;
              const { color: stockColor } = badgeStock(p.stockTotal, stockMin);
              return (
                <div
                  key={p.id}
                  className={`group flex flex-col text-left rounded-xl overflow-hidden border transition-all
                    ${agotado
                      ? 'border-[#E2E8F0] opacity-60'
                      : 'border-blush hover:border-gold hover:shadow-md'
                    }`}
                >
                  {/* Imagen — clic abre preview */}
                  <button
                    type="button"
                    onClick={() => setPreview(p)}
                    className="relative h-28 bg-boutique-white flex items-center justify-center overflow-hidden w-full"
                    aria-label={`Ver detalles de ${p.nombre}`}
                  >
                    {p.imagenUrl ? (
                      <Image
                        src={p.imagenUrl}
                        alt={p.nombre}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-contain p-1"
                        unoptimized={p.imagenUrl.startsWith('/')}
                      />
                    ) : (
                      <Package size={28} className="text-blush-dark" />
                    )}
                    {/* Badge stock */}
                    <div className={`absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${stockColor}`}>
                      {agotado ? 'Agotado' : p.stockTotal}
                    </div>
                    {/* Icono preview */}
                    <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                      <Eye size={10} className="text-boutique-dark" />
                    </div>
                  </button>

                  {/* Info — clic agrega al carrito */}
                  <button
                    type="button"
                    onClick={() => !agotado && onAgregarProducto(p)}
                    disabled={agotado}
                    className={`p-2 bg-white flex-1 text-left w-full active:scale-95 transition-all ${agotado ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-blush-light/30'}`}
                  >
                    <p className="text-[11px] font-medium text-boutique-dark leading-snug line-clamp-2 mb-1">
                      {p.nombre}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono font-bold text-gold">
                        {formatPrecio(p.precioVenta)}
                      </p>
                      {!agotado && (
                        <ShoppingCart size={11} className="text-boutique-gray-mid opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

    <ProductPreviewModal
      producto={preview}
      onClose={() => setPreview(null)}
      onAgregar={(p) => onAgregarProducto(p as ProductoPOS)}
    />
    </>
  );
}
