'use client';
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'react-toastify';

interface ClienteForm {
  nombre: string;
  telefono: string;
  email: string;
  nit: string;
  direccion: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clienteId?: string | null;
}

export function ClienteModal({ open, onClose, onSuccess, clienteId }: Props) {
  const [form, setForm] = useState<ClienteForm>({ nombre: '', telefono: '', email: '', nit: '', direccion: '' });
  const [guardando, setGuardando] = useState(false);
  const [cargandoEdicion, setCargandoEdicion] = useState(false);

  useEffect(() => {
    if (!open) { setForm({ nombre: '', telefono: '', email: '', nit: '', direccion: '' }); setCargandoEdicion(false); return; }
    if (!clienteId) return;
    setCargandoEdicion(true);
    fetch(`/api/clientes/${clienteId}`)
      .then((r) => r.json())
      .then((d) => {
        const c = d.data;
        setForm({
          nombre: c.nombre ?? '',
          telefono: c.telefono ?? '',
          email: c.email ?? '',
          nit: c.nit ?? '',
          direccion: c.direccion ?? '',
        });
      })
      .catch(() => {
        toast.error('No pudimos cargar los datos del cliente');
        onClose();
      })
      .finally(() => setCargandoEdicion(false));
  }, [open, clienteId]);

  function set(field: keyof ClienteForm, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const url = clienteId ? `/api/clientes/${clienteId}` : '/api/clientes';
      const method = clienteId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(clienteId ? 'Cliente actualizado' : 'Cliente creado');
      onSuccess();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-2xl border border-blush p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-blush bg-boutique-white">
          <DialogTitle className="font-playfair text-lg font-bold text-boutique-dark">
            {clienteId ? 'Editar cliente' : 'Nuevo cliente'}
          </DialogTitle>
          <DialogDescription className="text-xs text-boutique-gray-mid">
            Los campos marcados con * son obligatorios
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {cargandoEdicion ? (
            <div className="space-y-4 animate-pulse motion-reduce:animate-none motion-reduce:opacity-50">
              <div className="h-9 rounded-lg bg-blush/30" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-9 rounded-lg bg-blush/30" />
                <div className="h-9 rounded-lg bg-blush/30" />
              </div>
              <div className="h-9 rounded-lg bg-blush/30" />
              <div className="h-9 rounded-lg bg-blush/30" />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-boutique-dark mb-1">Nombre completo *</label>
                <input type="text" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required minLength={2} className="w-full input-boutique" placeholder="Ana García López" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-boutique-dark mb-1">Teléfono</label>
                  <input type="tel" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} className="w-full input-boutique" placeholder="5555-0000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-boutique-dark mb-1">NIT</label>
                  <input type="text" value={form.nit} onChange={(e) => set('nit', e.target.value)} className="w-full input-boutique" placeholder="CF / 12345678-9" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-boutique-dark mb-1">Correo electrónico</label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="w-full input-boutique" placeholder="cliente@email.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-boutique-dark mb-1">Dirección</label>
                <input type="text" value={form.direccion} onChange={(e) => set('direccion', e.target.value)} className="w-full input-boutique" placeholder="Zona 10, Guatemala" />
              </div>
            </>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-blush">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-boutique-gray-mid hover:text-boutique-dark transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando || cargandoEdicion} className="btn-boutique-primary flex items-center gap-2 disabled:opacity-60">
              {guardando ? <span role="status" aria-label="Guardando" className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin motion-reduce:animate-none" /> : <Save size={15} aria-hidden="true" />}
              {clienteId ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
