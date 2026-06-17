'use client';
import Image from 'next/image';
import { X, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPrecio } from '@/lib/boutique';
import type { ProductoPOS, VariantePOS } from '../types';

interface Props {
  producto: ProductoPOS | null;
  onSeleccionar: (variante: VariantePOS) => void;
  onCerrar: () => void;
}

export function VariantSelectorModal({ producto, onSeleccionar, onCerrar }: Props) {
  if (!producto) return null;

  // Agrupar por talla para mostrar primero tallas, luego colores
  const tallas = Array.from(new Set(producto.variantes.map((v) => v.talla).filter((x): x is string => x !== null)));
  const colores = Array.from(new Set(producto.variantes.map((v) => v.color).filter((x): x is string => x !== null)));
  const soloVariantes = tallas.length === 0 && colores.length === 0;

  return (
    <Dialog open={!!producto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-w-md rounded-2xl border border-blush p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-blush bg-boutique-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blush-light flex items-center justify-center overflow-hidden flex-shrink-0">
              {producto.imagenUrl ? (
                <Image src={producto.imagenUrl} alt={producto.nombre} width={48} height={48} className="object-cover w-full h-full" unoptimized={producto.imagenUrl.startsWith('/')} />
              ) : (
                <Package size={20} className="text-blush-dark" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="font-semibold text-boutique-dark text-sm leading-snug">
                {producto.nombre}
              </DialogTitle>
              <p className="text-xs text-gold font-mono font-bold mt-0.5">
                {formatPrecio(producto.precioVenta)}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {soloVariantes ? (
            // Sin talla/color, mostrar variantes directamente
            <div className="grid grid-cols-2 gap-2">
              {producto.variantes.map((v) => (
                <VarianteBtn key={v.id} variante={v} label={v.sku} onSeleccionar={onSeleccionar} />
              ))}
            </div>
          ) : (
            <>
              {tallas.length > 0 && colores.length > 0 ? (
                // Matriz talla × color
                <MatrizVariantes
                  variantes={producto.variantes}
                  tallas={tallas as string[]}
                  colores={colores as string[]}
                  onSeleccionar={onSeleccionar}
                />
              ) : tallas.length > 0 ? (
                <SeccionVariantes titulo="Talla" variantes={producto.variantes} getLabel={(v) => v.talla ?? ''} onSeleccionar={onSeleccionar} />
              ) : (
                <SeccionVariantes titulo="Color" variantes={producto.variantes} getLabel={(v) => v.color ?? ''} onSeleccionar={onSeleccionar} esColor />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VarianteBtn({
  variante, label, onSeleccionar,
}: { variante: VariantePOS; label: string; onSeleccionar: (v: VariantePOS) => void }) {
  const agotado = variante.stockActual === 0;
  return (
    <button
      onClick={() => !agotado && onSeleccionar(variante)}
      disabled={agotado}
      className={`relative py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all
        ${agotado
          ? 'border-[#E2E8F0] text-boutique-gray-mid bg-boutique-gray-soft cursor-not-allowed line-through'
          : 'border-gold-light text-boutique-dark hover:border-gold hover:bg-blush-light active:scale-95'
        }`}
    >
      {label}
      {agotado && (
        <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-boutique-danger text-white rounded-full px-1 font-bold">
          0
        </span>
      )}
      {!agotado && (
        <span className="block text-xs text-boutique-gray-mid font-normal mt-0.5">
          {variante.stockActual} uds.
        </span>
      )}
    </button>
  );
}

function SeccionVariantes({
  titulo, variantes, getLabel, onSeleccionar, esColor = false,
}: {
  titulo: string;
  variantes: VariantePOS[];
  getLabel: (v: VariantePOS) => string;
  onSeleccionar: (v: VariantePOS) => void;
  esColor?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-boutique-dark mb-2">{titulo}</p>
      <div className="flex flex-wrap gap-2">
        {variantes.map((v) => {
          const agotado = v.stockActual === 0;
          if (esColor && v.colorHex) {
            return (
              <button
                key={v.id}
                onClick={() => !agotado && onSeleccionar(v)}
                disabled={agotado}
                title={`${getLabel(v)} — ${v.stockActual} uds.${agotado ? ' (Agotado)' : ''}`}
                aria-label={`${getLabel(v)} — ${v.stockActual} uds.${agotado ? ' (Agotado)' : ''}`}
                className={`w-10 h-10 rounded-full border-2 transition-all relative
                  ${agotado ? 'opacity-40 cursor-not-allowed' : 'hover:scale-110 border-gold-light hover:border-gold'}`}
                style={{ backgroundColor: v.colorHex }}
              />
            );
          }
          return <VarianteBtn key={v.id} variante={v} label={getLabel(v)} onSeleccionar={onSeleccionar} />;
        })}
      </div>
    </div>
  );
}

function MatrizVariantes({
  variantes, tallas, colores, onSeleccionar,
}: {
  variantes: VariantePOS[];
  tallas: string[];
  colores: string[];
  onSeleccionar: (v: VariantePOS) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left p-1.5 text-boutique-gray-mid font-medium">Talla \ Color</th>
            {colores.map((c) => (
              <th key={c} className="p-1.5 text-boutique-dark font-medium text-center">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tallas.map((talla) => (
            <tr key={talla}>
              <td className="p-1.5 font-medium text-boutique-dark">{talla}</td>
              {colores.map((color) => {
                const v = variantes.find((x) => x.talla === talla && x.color === color);
                if (!v) return <td key={color} className="p-1.5 text-center text-boutique-gray-mid">—</td>;
                const agotado = v.stockActual === 0;
                return (
                  <td key={color} className="p-1.5 text-center">
                    <button
                      onClick={() => !agotado && onSeleccionar(v)}
                      disabled={agotado}
                      aria-label={`Talla ${talla}, color ${color} — ${agotado ? 'agotado' : `${v.stockActual} uds.`}`}
                      className={`w-12 py-1.5 rounded-lg text-xs font-medium border transition-all
                        ${agotado
                          ? 'bg-boutique-gray-soft border-[#E2E8F0] text-boutique-gray-mid cursor-not-allowed'
                          : 'bg-white border-gold-light hover:border-gold hover:bg-blush-light active:scale-95'
                        }`}
                    >
                      {agotado ? '—' : v.stockActual}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
