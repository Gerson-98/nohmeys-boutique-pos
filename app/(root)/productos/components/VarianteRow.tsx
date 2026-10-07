'use client';
import { Trash2 } from 'lucide-react';

export interface VarianteInput {
  sku: string;
  codigoBarras: string;
  talla: string;
  color: string;
  colorHex: string;
  precioVenta: number | null;
  stockActual: number;
  stockMinimo: number;
}

interface Props {
  index: number;
  variante: VarianteInput;
  precioProducto: number;
  onChange: (index: number, field: keyof VarianteInput, value: string | number | null) => void;
  onRemove: (index: number) => void;
  onAutoSku: (index: number) => void;
}

export function VarianteRow({ index, variante, precioProducto, onChange, onRemove, onAutoSku }: Props) {
  return (
    <div className="rounded-xl border border-blush bg-white p-3 space-y-2">
      {/* SKU + Código de barras externo + eliminar */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-medium text-boutique-gray-mid mb-0.5">SKU *</label>
          <input
            type="text"
            value={variante.sku}
            onChange={(e) => onChange(index, 'sku', e.target.value.toUpperCase())}
            onBlur={() => { if (!variante.sku.trim()) onAutoSku(index); }}
            placeholder="Auto-generado al salir"
            className="w-full input-boutique font-mono text-xs uppercase"
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-medium text-boutique-gray-mid mb-0.5">
            Cód. barras externo
          </label>
          <input
            type="text"
            value={variante.codigoBarras}
            onChange={(e) => onChange(index, 'codigoBarras', e.target.value)}
            placeholder="7501055300059 (opcional)"
            className="w-full input-boutique font-mono text-xs"
          />
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="mt-5 p-2 rounded-lg hover:bg-boutique-danger/10 text-boutique-danger transition-colors flex-shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Talla + Color + Precio + Stock + Mín */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div>
          <label className="block text-[10px] font-medium text-boutique-gray-mid mb-0.5">Talla</label>
          <input
            type="text"
            value={variante.talla}
            onChange={(e) => onChange(index, 'talla', e.target.value)}
            placeholder="S / M / XL"
            className="w-full input-boutique text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-boutique-gray-mid mb-0.5">Color</label>
          <input
            type="text"
            value={variante.color}
            onChange={(e) => onChange(index, 'color', e.target.value)}
            placeholder="Azul"
            className="w-full input-boutique text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-boutique-gray-mid mb-0.5">Precio (Q)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={variante.precioVenta ?? ''}
            onChange={(e) =>
              onChange(index, 'precioVenta', e.target.value === '' ? null : parseFloat(e.target.value))
            }
            placeholder={precioProducto.toFixed(2)}
            className="w-full input-boutique text-xs text-center font-mono"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-boutique-gray-mid mb-0.5">Stock</label>
          <input
            type="number"
            min={0}
            value={variante.stockActual}
            onChange={(e) => onChange(index, 'stockActual', parseInt(e.target.value) || 0)}
            className="w-full input-boutique text-xs text-center font-mono"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-boutique-gray-mid mb-0.5">Stock mín.</label>
          <input
            type="number"
            min={0}
            value={variante.stockMinimo}
            onChange={(e) => onChange(index, 'stockMinimo', parseInt(e.target.value) || 0)}
            className="w-full input-boutique text-xs text-center font-mono"
          />
        </div>
      </div>
    </div>
  );
}
