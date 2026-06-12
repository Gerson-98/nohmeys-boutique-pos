'use client';
import Image from 'next/image';
import { Package, ToggleLeft, ToggleRight, Pencil } from 'lucide-react';
import { formatPrecio, badgeStock } from '@/lib/boutique';
import { toast } from 'react-toastify';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Variante {
  id: string;
  sku: string;
  talla: string | null;
  color: string | null;
  colorHex: string | null;
  stockActual: number;
  stockMinimo: number;
}

interface Props {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  categoria: { nombre: string; icono: string | null };
  costo: number;
  precioVenta: number;
  isActive: boolean;
  variantes: Variante[];
  stockTotal: number;
  onToggle: (id: string, nuevoEstado: boolean) => void;
  onEdit: (id: string) => void;
  puedeEditar?: boolean;
}

export function ProductCard({
  id, nombre, descripcion, imagenUrl, categoria,
  precioVenta, isActive, variantes, stockTotal, onToggle, onEdit, puedeEditar = true,
}: Props) {
  const [toggling, setToggling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const stockMinimo = variantes.length > 0
    ? Math.min(...variantes.map((v) => v.stockMinimo))
    : 2;
  const { label: stockLabel, color: stockColor } = badgeStock(stockTotal, stockMinimo);

  async function ejecutarToggle() {
    setToggling(true);
    try {
      const res = await fetch(`/api/productos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onToggle(id, !isActive);
      toast.success(isActive ? 'Producto desactivado' : 'Producto activado');
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setToggling(false);
    }
  }

  function handleToggle() {
    if (isActive) {
      setConfirmOpen(true);
    } else {
      ejecutarToggle();
    }
  }

  return (
    <div className={`card-boutique flex flex-col overflow-hidden transition-opacity ${!isActive ? 'opacity-60' : ''}`}>
      {/* Imagen */}
      <div className="relative h-44 bg-[#F8E1E7] flex items-center justify-center overflow-hidden">
        {imagenUrl ? (
          <Image src={imagenUrl} alt={nombre} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover" />
        ) : (
          <Package size={40} className="text-[#E8A0B0]" />
        )}
        {/* Badge estado */}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-[#6DBF94] text-white' : 'bg-[#9E9E9E] text-white'}`}>
            {isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Categoría badge */}
        <span className="inline-flex self-start items-center px-2 py-0.5 bg-[#F2C4CE] text-[#C9A84C] rounded-full text-xs font-medium">
          {categoria.icono && <span className="mr-1">{categoria.icono}</span>}
          {categoria.nombre}
        </span>

        <h3 className="font-semibold text-[#2C2C2C] text-sm leading-snug line-clamp-2">{nombre}</h3>

        {descripcion && (
          <p className="text-xs text-[#9E9E9E] line-clamp-2">{descripcion}</p>
        )}

        {/* Variantes colores */}
        {variantes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {variantes.slice(0, 5).map((v) => (
              <span key={v.id} title={`${v.color ?? ''} ${v.talla ?? ''} — SKU: ${v.sku}`}>
                {v.colorHex ? (
                  <span
                    className="inline-block w-4 h-4 rounded-full border border-[#E8D5A3]"
                    style={{ backgroundColor: v.colorHex }}
                  />
                ) : (
                  <span className="px-1.5 py-0.5 bg-[#F5F5F5] text-[#2C2C2C] rounded text-xs">
                    {v.talla ?? v.color ?? v.sku}
                  </span>
                )}
              </span>
            ))}
            {variantes.length > 5 && (
              <span className="text-xs text-[#9E9E9E]">+{variantes.length - 5}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#F2C4CE]">
          <span className="font-mono font-bold text-[#C9A84C] text-sm">
            {formatPrecio(precioVenta)}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stockColor}`}>
            {stockLabel} ({stockTotal})
          </span>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex border-t border-[#F2C4CE]">
        {puedeEditar && (
          <>
            <button
              onClick={() => onEdit(id)}
              className="flex-1 py-2.5 flex items-center justify-center gap-1 text-xs font-medium text-[#C9A84C] hover:bg-[#F8E1E7] transition-colors"
            >
              <Pencil size={13} />
              Editar
            </button>
            <div className="w-px bg-[#F2C4CE]" />
          </>
        )}
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="flex-1 py-2.5 flex items-center justify-center gap-1 text-xs font-medium text-[#9E9E9E] hover:bg-[#F8E1E7] transition-colors disabled:opacity-50"
        >
          {isActive ? <ToggleRight size={14} className="text-[#6DBF94]" /> : <ToggleLeft size={14} />}
          {isActive ? 'Desactivar' : 'Activar'}
        </button>
      </div>

      {/* Confirmación de desactivación */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{nombre}&quot; dejará de estar disponible para la venta en el Punto de Venta. Podrás
              reactivarlo en cualquier momento desde esta misma pantalla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={ejecutarToggle}>Desactivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
