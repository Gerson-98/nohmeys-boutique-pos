'use client';
import Image from 'next/image';
import { Minus, Plus, Trash2, Package } from 'lucide-react';
import { formatPrecio } from '@/lib/boutique';
import type { CartItem as CartItemType } from '../types';

interface Props {
  item: CartItemType;
  onCantidad: (varianteId: string, delta: number) => void;
  onDescuento: (varianteId: string, pct: number) => void;
  onEliminar: (varianteId: string) => void;
}

export function CartItemRow({ item, onCantidad, onDescuento, onEliminar }: Props) {
  const lineaBase = item.precio * item.cantidad;
  const descMonto = lineaBase * (item.descuentoPct / 100);
  const lineaFinal = lineaBase - descMonto;

  return (
    <div className="flex gap-3 py-3 border-b border-[#F2C4CE] last:border-0">
      {/* Imagen miniatura */}
      <div className="w-12 h-12 rounded-xl bg-[#F8E1E7] flex-shrink-0 overflow-hidden flex items-center justify-center">
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
          <Package size={16} className="text-[#E8A0B0]" />
        )}
      </div>

      {/* Info + controles */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#2C2C2C] leading-snug truncate">
              {item.nombre}
            </p>
            <p className="text-[10px] text-[#9E9E9E]">{item.varianteLabel} · {item.sku}</p>
          </div>
          <button
            onClick={() => onEliminar(item.varianteId)}
            className="p-1 text-[#9E9E9E] hover:text-[#E57373] transition-colors flex-shrink-0"
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
              className="w-6 h-6 rounded-lg border border-[#E8D5A3] flex items-center justify-center text-[#C9A84C] hover:bg-[#F8E1E7] disabled:opacity-40 transition-colors"
            >
              <Minus size={11} />
            </button>
            <span className="w-7 text-center text-sm font-mono font-bold text-[#2C2C2C]">
              {item.cantidad}
            </span>
            <button
              onClick={() => onCantidad(item.varianteId, 1)}
              disabled={item.cantidad >= item.stockActual}
              className="w-6 h-6 rounded-lg border border-[#E8D5A3] flex items-center justify-center text-[#C9A84C] hover:bg-[#F8E1E7] disabled:opacity-40 transition-colors"
            >
              <Plus size={11} />
            </button>
          </div>

          {/* Descuento ítem */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#9E9E9E]">Dto.</span>
            <input
              type="number"
              min={0}
              max={100}
              value={item.descuentoPct}
              onChange={(e) => onDescuento(item.varianteId, Math.min(100, Math.max(0, Number(e.target.value))))}
              className="w-10 text-center text-xs font-mono input-boutique py-0.5 px-1"
            />
            <span className="text-[10px] text-[#9E9E9E]">%</span>
          </div>

          {/* Total línea */}
          <span className="text-sm font-mono font-bold text-[#C9A84C] flex-shrink-0">
            {formatPrecio(lineaFinal)}
          </span>
        </div>
      </div>
    </div>
  );
}
