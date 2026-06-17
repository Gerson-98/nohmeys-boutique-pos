'use client';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

interface Categoria {
  id: string;
  nombre: string;
  icono: string | null;
  orden: number;
  _count?: { productos: number };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onChange: () => void;
}

export function CategoriasModal({ open, onClose, onChange }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoIcono, setNuevoIcono] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editIcono, setEditIcono] = useState('');
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  useEffect(() => {
    if (open) cargar();
  }, [open]);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch('/api/categorias');
      const data = await res.json();
      setCategorias(data.data ?? []);
    } catch {
      toast.error('Error al cargar categorías');
    } finally {
      setCargando(false);
    }
  }

  async function crear() {
    if (!nuevoNombre.trim() || nuevoNombre.trim().length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres');
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoNombre.trim(), icono: nuevoIcono.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      setNuevoNombre('');
      setNuevoIcono('');
      await cargar();
      onChange();
      toast.success('Categoría creada correctamente');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setGuardando(false);
    }
  }

  function iniciarEdicion(cat: Categoria) {
    setEditandoId(cat.id);
    setEditNombre(cat.nombre);
    setEditIcono(cat.icono || '');
  }

  async function guardarEdicion(id: string) {
    if (!editNombre.trim() || editNombre.trim().length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres');
      return;
    }
    try {
      const res = await fetch(`/api/categorias/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: editNombre.trim(), icono: editIcono.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      setEditandoId(null);
      await cargar();
      onChange();
      toast.success('Categoría actualizada');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  }

  async function eliminar(id: string) {
    try {
      const res = await fetch(`/api/categorias/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      setEliminandoId(null);
      await cargar();
      onChange();
      toast.success('Categoría eliminada');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error: ' + msg);
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-2xl border border-blush p-0 overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-blush bg-boutique-white">
          <DialogTitle className="font-playfair text-lg font-bold text-boutique-dark">
            Gestionar categorías
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Nueva categoría */}
          <div className="flex gap-2">
            <input
              type="text"
              value={nuevoIcono}
              onChange={(e) => setNuevoIcono(e.target.value)}
              placeholder="Ícono"
              maxLength={2}
              className="w-16 input-boutique text-center text-sm"
            />
            <input
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && crear()}
              placeholder="Nombre de la categoría"
              className="flex-1 input-boutique text-sm"
            />
            <button
              onClick={crear}
              disabled={guardando}
              className="btn-boutique-primary px-3 disabled:opacity-50"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Lista */}
          {cargando ? (
            <div className="space-y-1.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 rounded-xl animate-pulse bg-blush/20" />
              ))}
            </div>
          ) : categorias.length === 0 ? (
            <p className="text-sm text-boutique-gray-mid text-center py-4">No hay categorías registradas.</p>
          ) : (
            <div className="space-y-1.5">
              {categorias.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-blush">
                  {editandoId === cat.id ? (
                    <>
                      <input
                        type="text"
                        value={editIcono}
                        onChange={(e) => setEditIcono(e.target.value)}
                        maxLength={2}
                        className="w-12 input-boutique text-center text-sm py-1"
                      />
                      <input
                        type="text"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && guardarEdicion(cat.id)}
                        className="flex-1 input-boutique text-sm py-1"
                        autoFocus
                      />
                      <button onClick={() => guardarEdicion(cat.id)} className="text-boutique-success p-1">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditandoId(null)} className="text-boutique-gray-mid p-1">
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-base w-6 text-center">{cat.icono || '🏷️'}</span>
                      <span className="flex-1 text-sm text-boutique-dark">{cat.nombre}</span>
                      <span className="text-[10px] text-boutique-gray-mid">
                        {cat._count?.productos ?? 0} producto{(cat._count?.productos ?? 0) !== 1 ? 's' : ''}
                      </span>
                      <button onClick={() => iniciarEdicion(cat)} className="text-gold p-1 hover:bg-blush-light rounded-lg">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setEliminandoId(cat.id)} className="text-boutique-danger p-1 hover:bg-blush-light rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={eliminandoId !== null} onOpenChange={(v) => !v && setEliminandoId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
          <AlertDialogDescription>
            {(() => {
              const cat = categorias.find((c) => c.id === eliminandoId);
              const count = cat?._count?.productos ?? 0;
              return count > 0
                ? `"${cat?.nombre}" tiene ${count} producto${count !== 1 ? 's' : ''}. Al eliminarla, esos productos quedarán sin categoría. Esta acción no se puede deshacer.`
                : `"${cat?.nombre}" no tiene productos asignados. Esta acción no se puede deshacer.`;
            })()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => eliminandoId && eliminar(eliminandoId)}>
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
