'use client';
import { Trash2 } from 'lucide-react';

export interface VarianteInput {
  sku: string;
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
}

export function VarianteRow({ index, variante, precioProducto, onChange, onRemove }: Props) {
  return (
    <tr className="border-b border-[#F2C4CE] hover:bg-[#F8E1E7]/40">
      <td className="px-3 py-2">
        <input
          type="text"
          value={variante.sku}
          onChange={(e) => onChange(index, 'sku', e.target.value.toUpperCase())}
          placeholder="VES001-AZM"
          className="w-full input-boutique font-mono text-xs uppercase"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={variante.talla}
          onChange={(e) => onChange(index, 'talla', e.target.value)}
          placeholder="S / M / L / XL"
          className="w-full input-boutique text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={variante.color}
          onChange={(e) => onChange(index, 'color', e.target.value)}
          placeholder="Azul marino"
          className="w-full input-boutique text-xs"
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={variante.colorHex || '#F2C4CE'}
            onChange={(e) => onChange(index, 'colorHex', e.target.value)}
            className="w-8 h-8 rounded-lg border border-[#E8D5A3] cursor-pointer p-0.5"
          />
          <span className="text-xs font-mono text-[#9E9E9E]">{variante.colorHex || '—'}</span>
        </div>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          step={0.01}
          value={variante.precioVenta ?? ''}
          onChange={(e) =>
            onChange(index, 'precioVenta', e.target.value === '' ? null : parseFloat(e.target.value))
          }
          placeholder={`Hereda: Q ${precioProducto.toFixed(2)}`}
          className="w-32 input-boutique text-xs text-center font-mono"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          value={variante.stockActual}
          onChange={(e) => onChange(index, 'stockActual', parseInt(e.target.value) || 0)}
          className="w-20 input-boutique text-xs text-center font-mono"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          value={variante.stockMinimo}
          onChange={(e) => onChange(index, 'stockMinimo', parseInt(e.target.value) || 0)}
          className="w-20 input-boutique text-xs text-center font-mono"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1.5 rounded-lg hover:bg-[#E57373]/10 text-[#E57373] transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}
