'use client';
import { useState, useRef, useEffect } from 'react';
import { Search, UserPlus, X, User } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'react-toastify';
import type { ClientePOS } from '../types';

interface Props {
  cliente: ClientePOS | null;
  onSeleccionar: (c: ClientePOS | null) => void;
}

export function ClienteSelector({ cliente, onSeleccionar }: Props) {
  const [buscar, setBuscar] = useState('');
  const [resultados, setResultados] = useState<ClientePOS[]>([]);
  const [mostrando, setMostrando] = useState(false);
  const [modalNuevo, setModalNuevo] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMostrando(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function buscarClientes(q: string) {
    if (q.length < 1) { setResultados([]); return; }
    const res = await fetch(`/api/clientes?q=${encodeURIComponent(q)}`);
    const d = await res.json();
    setResultados(d.data ?? []);
  }

  function seleccionar(c: ClientePOS) {
    onSeleccionar(c);
    setBuscar('');
    setResultados([]);
    setMostrando(false);
  }

  if (cliente) {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blush-light border border-blush-dark">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blush flex items-center justify-center">
            <User size={13} className="text-gold" />
          </div>
          <div>
            <p className="text-xs font-medium text-boutique-dark">{cliente.nombre}</p>
            {cliente.telefono && <p className="text-[10px] text-boutique-gray-dark">{cliente.telefono}</p>}
          </div>
        </div>
        <button onClick={() => onSeleccionar(null)} aria-label="Quitar cliente seleccionado" className="p-1 hover:text-boutique-danger text-boutique-gray-mid transition-colors">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-boutique-gray-mid" />
          <input
            type="text"
            value={buscar}
            onFocus={() => setMostrando(true)}
            onChange={(e) => { setBuscar(e.target.value); buscarClientes(e.target.value); }}
            placeholder="Buscar cliente (opcional)..."
            className="w-full input-boutique pl-7 text-xs py-2"
          />
        </div>
        <button
          onClick={() => setModalNuevo(true)}
          title="Nuevo cliente rápido"
          aria-label="Nuevo cliente rápido"
          className="px-2.5 py-2 rounded-xl border border-gold-light text-gold hover:bg-blush-light transition-colors flex-shrink-0"
        >
          <UserPlus size={15} />
        </button>
      </div>

      {mostrando && resultados.length > 0 && (
        <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-blush rounded-xl shadow-lg overflow-hidden">
          {resultados.map((c) => (
            <button
              key={c.id}
              onClick={() => seleccionar(c)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blush-light transition-colors text-left"
            >
              <div className="w-6 h-6 rounded-full bg-blush flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-gold">{c.nombre.charAt(0)}</span>
              </div>
              <div>
                <p className="text-xs font-medium text-boutique-dark">{c.nombre}</p>
                {c.telefono && <p className="text-[10px] text-boutique-gray-dark">{c.telefono}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {modalNuevo && (
        <NuevoClienteRapido
          onCrear={(c) => { seleccionar(c); setModalNuevo(false); }}
          onCerrar={() => setModalNuevo(false)}
        />
      )}
    </div>
  );
}

function NuevoClienteRapido({
  onCrear, onCerrar,
}: { onCrear: (c: ClientePOS) => void; onCerrar: () => void }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, telefono }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Cliente creado y seleccionado para esta venta');
      onCrear(data.data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-w-xs rounded-2xl border border-blush p-5">
        <div className="flex items-center justify-between mb-4">
          <DialogTitle className="font-playfair font-bold text-boutique-dark">Nuevo cliente rápido</DialogTitle>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-boutique-gray-mid hover:text-boutique-danger transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-boutique-dark mb-1">Nombre *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
              required
              className="w-full input-boutique text-sm"
              placeholder="Nombre completo"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-boutique-dark mb-1">Teléfono</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full input-boutique text-sm"
              placeholder="5555-0000"
            />
          </div>
          <button type="submit" disabled={guardando} className="w-full btn-boutique-primary py-2 text-sm disabled:opacity-60">
            {guardando ? '...' : 'Crear'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
