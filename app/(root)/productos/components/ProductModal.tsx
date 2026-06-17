'use client';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
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
  const [errorCarga, setErrorCarga] = useState(false);

  const cargarProducto = useCallback((id: string) => {
    setCargandoDatos(true);
    setErrorCarga(false);
    fetch(`/api/productos/${id}`)
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
            precioVenta: v.precioVenta ?? null,
            stockActual: v.stockActual,
            stockMinimo: v.stockMinimo,
          })),
        });
      })
      .catch(() => setErrorCarga(true))
      .finally(() => setCargandoDatos(false));
  }, []);

  useEffect(() => {
    if (!open) {
      setProductoInicial(undefined);
      setErrorCarga(false);
      return;
    }
    if (!productoId) return;
    cargarProducto(productoId);
  }, [open, productoId, cargarProducto]);

  const modo = productoId ? 'editar' : 'crear';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[92vh] flex flex-col p-0 gap-0 rounded-2xl border border-blush bg-white overflow-hidden">
        {/* Header fijo */}
        <DialogHeader className="px-6 py-4 border-b border-blush bg-boutique-white flex-shrink-0">
          <DialogTitle className="font-playfair text-xl font-bold text-boutique-dark">
            {modo === 'crear' ? 'Nuevo producto' : 'Editar producto'}
          </DialogTitle>
          <DialogDescription className="text-xs text-boutique-gray-mid">
            {modo === 'crear'
              ? 'Completa los datos y agrega las variantes de talla y color.'
              : 'Modifica los datos del producto y guarda los cambios.'}
          </DialogDescription>
        </DialogHeader>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {cargandoDatos ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-32 rounded-xl bg-blush/20" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-24 rounded bg-blush/40" />
                  <div className="h-9 rounded-xl bg-blush/20" />
                </div>
              ))}
            </div>
          ) : errorCarga ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <AlertTriangle size={28} className="text-boutique-danger" />
              <div>
                <p className="text-sm font-semibold text-boutique-dark">No pudimos cargar el producto</p>
                <p className="text-xs text-[#757575] mt-1">Verifica tu conexión e intenta de nuevo.</p>
              </div>
              <button
                onClick={() => productoId && cargarProducto(productoId)}
                className="btn-boutique-primary text-sm px-4 py-2 flex items-center gap-2"
              >
                <RefreshCw size={14} /> Reintentar
              </button>
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
