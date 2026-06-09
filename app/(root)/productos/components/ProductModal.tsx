'use client';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ProductForm, type ProductoData } from './ProductForm';
import type { VarianteInput } from './VarianteRow';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productoId?: string | null; // null/undefined = modo crear
}

export function ProductModal({ open, onClose, onSuccess, productoId }: Props) {
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [productoInicial, setProductoInicial] = useState<ProductoData | undefined>();

  useEffect(() => {
    if (!open) {
      setProductoInicial(undefined);
      return;
    }
    if (!productoId) return;

    setCargandoDatos(true);
    fetch(`/api/productos/${productoId}`)
      .then((r) => r.json())
      .then((d) => {
        const p = d.data;
        setProductoInicial({
          id: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion,
          imagenUrl: p.imagenUrl,
          categoriaId: p.categoriaId,
          costo: p.costo,
          precioVenta: p.precioVenta,
          variantes: p.variantes.map((v: VarianteInput & { id: string }) => ({
            id: v.id,
            sku: v.sku,
            talla: (v.talla as string) ?? '',
            color: (v.color as string) ?? '',
            colorHex: (v.colorHex as string) ?? '',
            stockActual: v.stockActual,
            stockMinimo: v.stockMinimo,
          })),
        });
      })
      .catch(() => {})
      .finally(() => setCargandoDatos(false));
  }, [open, productoId]);

  const modo = productoId ? 'editar' : 'crear';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[92vh] flex flex-col p-0 gap-0 rounded-2xl border border-[#F2C4CE] bg-white overflow-hidden">
        {/* Header fijo */}
        <DialogHeader className="px-6 py-4 border-b border-[#F2C4CE] bg-[#FAFAFA] flex-shrink-0">
          <DialogTitle className="font-playfair text-xl font-bold text-[#2C2C2C]">
            {modo === 'crear' ? 'Nuevo producto' : 'Editar producto'}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#9E9E9E]">
            {modo === 'crear'
              ? 'Completa los datos y agrega las variantes de talla y color.'
              : 'Modifica los datos del producto y guarda los cambios.'}
          </DialogDescription>
        </DialogHeader>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {cargandoDatos ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ProductForm
              modo={modo}
              productoInicial={productoInicial}
              onSuccess={onSuccess}
              onCancel={onClose}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
