'use client';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      const res = await fetch(`/api/categorias/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      await cargar();
      onChange();
      toast.success('Categoría eliminada');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-2xl border border-[#F2C4CE] p-0 overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-[#F2C4CE] bg-[#FAFAFA]">
          <DialogTitle className="font-playfair text-lg font-bold text-[#2C2C2C]">
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
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : categorias.length === 0 ? (
            <p className="text-sm text-[#9E9E9E] text-center py-4">No hay categorías registradas.</p>
          ) : (
            <div className="space-y-1.5">
              {categorias.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#F2C4CE]">
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
                      <button onClick={() => guardarEdicion(cat.id)} className="text-[#6DBF94] p-1">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditandoId(null)} className="text-[#9E9E9E] p-1">
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-base w-6 text-center">{cat.icono || '🏷️'}</span>
                      <span className="flex-1 text-sm text-[#2C2C2C]">{cat.nombre}</span>
                      <span className="text-[10px] text-[#9E9E9E]">
                        {cat._count?.productos ?? 0} producto{(cat._count?.productos ?? 0) !== 1 ? 's' : ''}
                      </span>
                      <button onClick={() => iniciarEdicion(cat)} className="text-[#C9A84C] p-1 hover:bg-[#F8E1E7] rounded-lg">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => eliminar(cat.id)} className="text-[#E57373] p-1 hover:bg-[#F8E1E7] rounded-lg">
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
  );
}
