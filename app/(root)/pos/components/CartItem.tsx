'use client';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Minus, Plus, Trash2, Package } from 'lucide-react';
import { formatPrecio } from '@/lib/boutique';
import type { CartItem as CartItemType } from '../types';

interface Props {
  item: CartItemType;
  onCantidad: (varianteId: string, delta: number) => void;
  onDescuento: (varianteId: string, monto: number) => void;
  onEliminar: (varianteId: string) => void;
}

export function CartItemRow({ item, onCantidad, onDescuento, onEliminar }: Props) {
  const lineaBase = item.precio * item.cantidad;
  const descMonto = Math.min(Math.max(item.descuentoMonto, 0), lineaBase);
  const lineaFinal = lineaBase - descMonto;

  const [descAjustado, setDescAjustado] = useState(false);
  const descAjustadoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (descAjustadoTimeoutRef.current) clearTimeout(descAjustadoTimeoutRef.current);
    };
  }, []);

  function handleDescuento(valorCrudo: number) {
    const clamped = Math.min(lineaBase, Math.max(0, valorCrudo || 0));
    if (clamped !== valorCrudo) {
      setDescAjustado(true);
      if (descAjustadoTimeoutRef.current) clearTimeout(descAjustadoTimeoutRef.current);
      descAjustadoTimeoutRef.current = setTimeout(() => setDescAjustado(false), 1500);
    }
    onDescuento(item.varianteId, clamped);
  }

  return (
    <div className="flex gap-3 py-3 border-b border-blush last:border-0">
      {/* Imagen miniatura */}
      <div className="w-12 h-12 rounded-xl bg-blush-light flex-shrink-0 overflow-hidden flex items-center justify-center">
        {item.imagenUrl ? (
          <Image
            src={item.imagenUrl}
            alt={item.nombre}
            width={48}
            height={48}
            className="object-cover w-full h-full"
            unoptimized={item.imagenUrl.startsWith('/')}
          />
        ) : (
          <Package size={16} className="text-blush-dark" />
        )}
      </div>

      {/* Info + controles */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-boutique-dark leading-snug truncate">
              {item.nombre}
            </p>
            <p className="text-[10px] text-boutique-gray-dark">{item.varianteLabel} · {item.sku}</p>
          </div>
          <button
            onClick={() => onEliminar(item.varianteId)}
            aria-label={`Eliminar ${item.nombre} del carrito`}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-boutique-gray-mid hover:text-boutique-danger transition-colors flex-shrink-0"
          >
            <Trash2 size={13} />
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 gap-2">
          {/* Cantidad */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onCantidad(item.varianteId, -1)}
              disabled={item.cantidad <= 1}
              className="min-w-[44px] min-h-[44px] rounded-lg border border-gold-light flex items-center justify-center text-gold hover:bg-blush-light disabled:opacity-40 transition-colors"
            >
              <Minus size={11} />
            </button>
            <span className="w-7 text-center text-sm font-mono font-bold text-boutique-dark">
              {item.cantidad}
            </span>
            <button
              onClick={() => onCantidad(item.varianteId, 1)}
              disabled={item.cantidad >= item.stockActual}
              className="min-w-[44px] min-h-[44px] rounded-lg border border-gold-light flex items-center justify-center text-gold hover:bg-blush-light disabled:opacity-40 transition-colors"
            >
              <Plus size={11} />
            </button>
          </div>

          {/* Descuento ítem en Q */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-boutique-gray-dark">Desc. Q</span>
            <input
              type="number"
              min={0}
              max={lineaBase}
              step={0.01}
              value={item.descuentoMonto || ''}
              onChange={(e) => handleDescuento(Number(e.target.value) || 0)}
              className={`w-16 text-center text-xs font-mono input-boutique py-0.5 px-1 transition-colors ${
                descAjustado ? 'border-boutique-danger' : ''
              }`}
              placeholder="0.00"
            />
          </div>

          {/* Total línea */}
          <div className="text-right flex-shrink-0">
            {descMonto > 0 && (
              <p className="text-[10px] font-mono text-boutique-gray-mid line-through">{formatPrecio(lineaBase)}</p>
            )}
            <span className={`text-sm font-mono font-bold ${descMonto > 0 ? 'text-boutique-success' : 'text-gold'}`}>
              {formatPrecio(lineaFinal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
