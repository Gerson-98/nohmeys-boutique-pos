'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Users, Phone, Mail, ToggleRight, ToggleLeft, Pencil, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { ClienteModal } from './components/ClienteModal';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  nit: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [errorLista, setErrorLista] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargar = useCallback(async (q: string) => {
    setCargando(true);
    setErrorLista(false);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      params.set('limite', '50');
      const res = await fetch(`/api/clientes?${params}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setClientes(d.data ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      toast.error('Error al cargar clientes: ' + msg);
      setErrorLista(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(''); }, [cargar]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => cargar(buscar), 300);
  }, [buscar, cargar]);

  async function toggleActivo(id: string, actual: boolean) {
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !actual }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setClientes((prev) => prev.map((c) => c.id === id ? { ...c, isActive: !actual } : c));
      toast.success(actual ? 'Cliente desactivado' : 'Cliente activado');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error desconocido');
    }
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-playfair text-2xl font-bold text-boutique-dark">Clientes</h1>
            <p className="text-sm text-boutique-gray-mid mt-0.5">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => { setEditandoId(null); setModalOpen(true); }} className="btn-boutique-primary flex items-center gap-2 self-start">
            <Plus size={16} /> Nuevo cliente
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-boutique-gray-mid" />
          <input type="text" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre, teléfono o NIT..." className="w-full input-boutique pl-9" />
        </div>

        {cargando ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-boutique flex flex-col animate-pulse">
                <div className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blush/40 flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3.5 w-32 rounded bg-blush/50" />
                    <div className="h-3 w-24 rounded bg-blush/30" />
                    <div className="h-3 w-20 rounded bg-blush/30" />
                  </div>
                </div>
                <div className="h-9 border-t border-blush/40 bg-blush/10" />
              </div>
            ))}
          </div>
        ) : errorLista ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertTriangle size={28} className="text-boutique-danger mb-3" />
            <p className="text-sm font-semibold text-boutique-dark mb-1">No pudimos cargar los clientes</p>
            <p className="text-xs text-[#757575] mb-4">Verifica tu conexión e intenta de nuevo.</p>
            <button onClick={() => cargar(buscar)} className="btn-boutique-primary text-sm px-4 py-2 flex items-center gap-2">
              <RefreshCw size={14} /> Reintentar
            </button>
          </div>
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-14 h-14 rounded-full bg-blush-light flex items-center justify-center mb-3">
              <Users size={24} className="text-blush-dark" />
            </div>
            <h3 className="font-playfair text-lg font-semibold text-boutique-dark mb-1">Sin clientes</h3>
            <p className="text-sm text-boutique-gray-mid">{buscar ? 'Sin resultados para tu búsqueda.' : 'Agrega el primer cliente.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientes.map((c) => (
              <div key={c.id} className={`card-boutique flex flex-col transition-opacity ${!c.isActive ? 'opacity-60' : ''}`}>
                <div className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blush flex items-center justify-center flex-shrink-0">
                    <span className="font-playfair font-bold text-gold">{c.nombre.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-boutique-dark text-sm leading-snug">{c.nombre}</p>
                      {!c.isActive && <span className="px-1.5 py-0.5 bg-boutique-gray-mid/20 text-boutique-gray-mid rounded-full text-xs flex-shrink-0">Inactivo</span>}
                    </div>
                    {c.telefono && (
                      <div className="flex items-center gap-1 mt-1">
                        <Phone size={11} className="text-boutique-gray-mid" />
                        <span className="text-xs text-boutique-gray-mid">{c.telefono}</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-1">
                        <Mail size={11} className="text-boutique-gray-mid" />
                        <span className="text-xs text-boutique-gray-mid truncate">{c.email}</span>
                      </div>
                    )}
                    {c.nit && <p className="text-xs text-[#757575] mt-0.5">NIT: {c.nit}</p>}
                    {c.createdAt && isValid(new Date(c.createdAt)) && (
                      <p className="text-xs text-boutique-gray-mid mt-1">
                        Cliente desde {format(new Date(c.createdAt), "MMM yyyy", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex border-t border-blush">
                  <Link href={`/clientes/${c.id}`} className="flex-1 py-2.5 text-center text-xs font-medium text-gold hover:bg-blush-light transition-colors">
                    Ver historial
                  </Link>
                  <div className="w-px bg-blush" />
                  <button onClick={() => { setEditandoId(c.id); setModalOpen(true); }} className="flex-1 py-2.5 flex items-center justify-center gap-1 text-xs font-medium text-boutique-gray-mid hover:bg-blush-light transition-colors">
                    <Pencil size={12} /> Editar
                  </button>
                  <div className="w-px bg-blush" />
                  <button onClick={() => toggleActivo(c.id, c.isActive)} className="flex-1 py-2.5 flex items-center justify-center gap-1 text-xs font-medium text-boutique-gray-mid hover:bg-blush-light transition-colors">
                    {c.isActive ? <ToggleRight size={13} className="text-boutique-success" /> : <ToggleLeft size={13} />}
                    {c.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ClienteModal
        open={modalOpen}
        clienteId={editandoId}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); cargar(buscar); }}
      />
    </>
  );
}
