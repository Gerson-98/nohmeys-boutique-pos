'use client';
import Image from 'next/image';
import { Package, ShoppingCart, X } from 'lucide-react';
import { formatPrecio, badgeStock } from '@/lib/boutique';

export interface PreviewVariante {
  id: string;
  sku: string;
  talla: string | null;
  color: string | null;
  colorHex: string | null;
  stockActual: number;
  stockMinimo: number;
  precioVenta?: number | null;
}

export interface PreviewProducto {
  id: string;
  nombre: string;
  descripcion?: string | null;
  imagenUrl: string | null;
  precioVenta: number;
  categoria: { nombre: string; icono?: string | null };
  variantes: PreviewVariante[];
  stockTotal: number;
}

interface Props {
  producto: PreviewProducto | null;
  onClose: () => void;
  onAgregar?: (producto: PreviewProducto) => void;
}

export function ProductPreviewModal({ producto, onClose, onAgregar }: Props) {
  if (!producto) return null;

  const agotado = producto.stockTotal === 0;
  const stockMin = producto.variantes.length > 0
    ? Math.min(...producto.variantes.map((v) => v.stockMinimo))
    : 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-blush"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-blush flex-shrink-0">
          <div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blush text-gold rounded-full text-xs font-medium mb-1">
              {producto.categoria.icono && <span>{producto.categoria.icono}</span>}
              {producto.categoria.nombre}
            </span>
            <h2 className="font-playfair text-lg font-bold text-boutique-dark leading-snug">
              {producto.nombre}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-boutique-gray-mid hover:bg-blush-light hover:text-boutique-dark transition-colors flex-shrink-0 ml-3"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col sm:flex-row">
            {/* Imagen */}
            <div className="sm:w-64 flex-shrink-0 bg-boutique-gray-soft flex items-center justify-center p-4 min-h-[220px]">
              {producto.imagenUrl ? (
                <div className="relative w-full h-56 sm:h-full min-h-[200px]">
                  <Image
                    src={producto.imagenUrl}
                    alt={producto.nombre}
                    fill
                    sizes="256px"
                    className="object-contain"
                    unoptimized={producto.imagenUrl.startsWith('/')}
                    priority
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-boutique-gray-mid">
                  <Package size={48} />
                  <span className="text-xs">Sin imagen</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 p-5 flex flex-col gap-4">
              {/* Precio y stock */}
              <div className="flex items-center justify-between">
                <span className="font-playfair text-2xl font-bold text-gold">
                  {formatPrecio(producto.precioVenta)}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  agotado
                    ? 'bg-boutique-danger/10 text-boutique-danger'
                    : producto.stockTotal <= stockMin
                      ? 'bg-boutique-warning/20 text-amber-700'
                      : 'bg-boutique-success/15 text-emerald-700'
                }`}>
                  {agotado ? 'Agotado' : `${producto.stockTotal} en stock`}
                </span>
              </div>

              {/* Descripción */}
              {producto.descripcion && (
                <p className="text-sm text-boutique-gray-mid leading-relaxed">
                  {producto.descripcion}
                </p>
              )}

              {/* Variantes */}
              {producto.variantes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-boutique-dark mb-2 uppercase tracking-wide">
                    Variantes
                  </p>
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {producto.variantes.map((v) => {
                      const { label, color } = badgeStock(v.stockActual, v.stockMinimo);
                      return (
                        <div
                          key={v.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-boutique-gray-soft text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {v.colorHex && (
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-gold-light flex-shrink-0"
                                style={{ backgroundColor: v.colorHex }}
                              />
                            )}
                            <span className="font-mono text-boutique-dark">{v.sku}</span>
                            {v.talla && <span className="text-boutique-gray-mid">· {v.talla}</span>}
                            {v.color && <span className="text-boutique-gray-mid">· {v.color}</span>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {v.precioVenta != null && (
                              <span className="font-mono font-bold text-gold">{formatPrecio(v.precioVenta)}</span>
                            )}
                            <span className={`px-1.5 py-0.5 rounded-full font-medium ${color}`}>
                              {label} ({v.stockActual})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer — solo en POS cuando se puede agregar */}
        {onAgregar && (
          <div className="px-5 py-4 border-t border-blush flex-shrink-0 bg-boutique-white">
            <button
              onClick={() => { onAgregar(producto); onClose(); }}
              disabled={agotado}
              className="w-full btn-boutique-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={16} />
              {agotado ? 'Sin stock disponible' : 'Agregar al carrito'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
