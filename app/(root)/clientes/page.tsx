'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Users, Phone, Mail, ToggleRight, ToggleLeft, Pencil } from 'lucide-react';
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargar = useCallback(async (q: string) => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      params.set('limite', '50');
      const res = await fetch(`/api/clientes?${params}`);
      const d = await res.json();
      setClientes(d.data ?? []);
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
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">Clientes</h1>
            <p className="text-sm text-[#9E9E9E] mt-0.5">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => { setEditandoId(null); setModalOpen(true); }} className="btn-boutique-primary flex items-center gap-2 self-start">
            <Plus size={16} /> Nuevo cliente
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" />
          <input type="text" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre, teléfono o NIT..." className="w-full input-boutique pl-9" />
        </div>

        {cargando ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card-boutique h-32 animate-pulse" />)}
          </div>
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-14 h-14 rounded-full bg-[#F8E1E7] flex items-center justify-center mb-3">
              <Users size={24} className="text-[#E8A0B0]" />
            </div>
            <h3 className="font-playfair text-lg font-semibold text-[#2C2C2C] mb-1">Sin clientes</h3>
            <p className="text-sm text-[#9E9E9E]">{buscar ? 'Sin resultados para tu búsqueda.' : 'Agrega el primer cliente.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientes.map((c) => (
              <div key={c.id} className={`card-boutique flex flex-col transition-opacity ${!c.isActive ? 'opacity-60' : ''}`}>
                <div className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#F2C4CE] flex items-center justify-center flex-shrink-0">
                    <span className="font-playfair font-bold text-[#C9A84C]">{c.nombre.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-[#2C2C2C] text-sm leading-snug">{c.nombre}</p>
                      {!c.isActive && <span className="px-1.5 py-0.5 bg-[#9E9E9E]/20 text-[#9E9E9E] rounded-full text-[10px] flex-shrink-0">Inactivo</span>}
                    </div>
                    {c.telefono && (
                      <div className="flex items-center gap-1 mt-1">
                        <Phone size={11} className="text-[#9E9E9E]" />
                        <span className="text-xs text-[#9E9E9E]">{c.telefono}</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-1">
                        <Mail size={11} className="text-[#9E9E9E]" />
                        <span className="text-xs text-[#9E9E9E] truncate">{c.email}</span>
                      </div>
                    )}
                    {c.nit && <p className="text-[10px] text-[#9E9E9E] mt-0.5">NIT: {c.nit}</p>}
                    {c.createdAt && isValid(new Date(c.createdAt)) && (
                      <p className="text-[10px] text-[#9E9E9E] mt-1">
                        Cliente desde {format(new Date(c.createdAt), "MMM yyyy", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex border-t border-[#F2C4CE]">
                  <Link href={`/clientes/${c.id}`} className="flex-1 py-2.5 text-center text-xs font-medium text-[#C9A84C] hover:bg-[#F8E1E7] transition-colors">
                    Ver historial
                  </Link>
                  <div className="w-px bg-[#F2C4CE]" />
                  <button onClick={() => { setEditandoId(c.id); setModalOpen(true); }} className="flex-1 py-2.5 flex items-center justify-center gap-1 text-xs font-medium text-[#9E9E9E] hover:bg-[#F8E1E7] transition-colors">
                    <Pencil size={12} /> Editar
                  </button>
                  <div className="w-px bg-[#F2C4CE]" />
                  <button onClick={() => toggleActivo(c.id, c.isActive)} className="flex-1 py-2.5 flex items-center justify-center gap-1 text-xs font-medium text-[#9E9E9E] hover:bg-[#F8E1E7] transition-colors">
                    {c.isActive ? <ToggleRight size={13} className="text-[#6DBF94]" /> : <ToggleLeft size={13} />}
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
