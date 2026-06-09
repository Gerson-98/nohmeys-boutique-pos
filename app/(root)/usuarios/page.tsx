'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Shield, ShieldCheck, ShieldAlert, Pencil, ToggleRight, ToggleLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Usuario {
  id: string;
  nombre: string;
  username: string;
  email: string | null;
  rol: string;
  isActive: boolean;
  createdAt: string;
}

const ROL_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  ADMIN:      { label: 'Administrador', icon: <ShieldAlert size={13} />,  cls: 'bg-[#F5C842]/20 text-[#2C2C2C]' },
  SUPERVISOR: { label: 'Supervisor',    icon: <ShieldCheck size={13} />, cls: 'bg-[#7EC8E3]/20 text-[#7EC8E3]' },
  CAJERO:     { label: 'Cajero',        icon: <Shield size={13} />,       cls: 'bg-[#6DBF94]/20 text-[#6DBF94]' },
};

interface FormUsuario {
  nombre: string; username: string; email: string; password: string; rol: string;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState<FormUsuario>({ nombre: '', username: '', email: '', password: '', rol: 'CAJERO' });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch('/api/usuarios');
      const d = await res.json();
      setUsuarios(d.data ?? []);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirCrear() {
    setEditandoId(null);
    setForm({ nombre: '', username: '', email: '', password: '', rol: 'CAJERO' });
    setShowPwd(false);
    setModalOpen(true);
  }

  function abrirEditar(u: Usuario) {
    setEditandoId(u.id);
    setForm({ nombre: u.nombre, username: u.username, email: u.email ?? '', password: '', rol: u.rol });
    setShowPwd(false);
    setModalOpen(true);
  }

  function setF(k: keyof FormUsuario, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const url = editandoId ? `/api/usuarios/${editandoId}` : '/api/usuarios';
      const method = editandoId ? 'PUT' : 'POST';
      const body: any = { ...form };
      if (!body.password) delete body.password;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(editandoId ? 'Usuario actualizado' : 'Usuario creado');
      setModalOpen(false);
      cargar();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function toggleActivo(u: Usuario) {
    try {
      const res = await fetch(`/api/usuarios/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setUsuarios((prev) => prev.map((x) => x.id === u.id ? { ...x, isActive: !u.isActive } : x));
      toast.success(u.isActive ? 'Usuario desactivado' : 'Usuario activado');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">Usuarios y roles</h1>
            <p className="text-sm text-[#9E9E9E] mt-0.5">Gestión del equipo de trabajo</p>
          </div>
          <button onClick={abrirCrear} className="btn-boutique-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> Nuevo usuario
          </button>
        </div>

        {cargando ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : usuarios.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Users size={32} className="text-[#E8D5A3] mb-3" />
            <p className="text-sm text-[#9E9E9E]">Sin usuarios registrados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {usuarios.map((u) => {
              const rolCfg = ROL_CONFIG[u.rol] ?? { label: u.rol, icon: null, cls: '' };
              return (
                <div key={u.id} className={`card-boutique p-4 flex items-center gap-4 transition-opacity ${!u.isActive ? 'opacity-60' : ''}`}>
                  <div className="w-11 h-11 rounded-full bg-[#F2C4CE] flex items-center justify-center flex-shrink-0">
                    <span className="font-playfair font-bold text-lg text-[#C9A84C]">{u.nombre.charAt(0).toUpperCase()}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[#2C2C2C] text-sm">{u.nombre}</p>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${rolCfg.cls}`}>
                        {rolCfg.icon}{rolCfg.label}
                      </span>
                      {!u.isActive && <span className="px-1.5 py-0.5 bg-[#9E9E9E]/20 text-[#9E9E9E] rounded-full text-[10px]">Inactivo</span>}
                    </div>
                    <p className="text-xs text-[#9E9E9E] mt-0.5">
                      @{u.username}{u.email && ` · ${u.email}`}
                    </p>
                    <p className="text-[10px] text-[#9E9E9E]">
                      Creado {isValid(new Date(u.createdAt)) ? format(new Date(u.createdAt), "d 'de' MMM yyyy", { locale: es }) : '—'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => abrirEditar(u)}
                      className="p-2 rounded-xl hover:bg-[#F8E1E7] text-[#9E9E9E] hover:text-[#C9A84C] transition-colors"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => toggleActivo(u)}
                      className="p-2 rounded-xl hover:bg-[#F8E1E7] text-[#9E9E9E] transition-colors"
                      title={u.isActive ? 'Desactivar' : 'Activar'}
                    >
                      {u.isActive ? <ToggleRight size={16} className="text-[#6DBF94]" /> : <ToggleLeft size={16} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={(v) => !v && setModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl border border-[#F2C4CE] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-[#F2C4CE] bg-[#FAFAFA]">
            <DialogTitle className="font-playfair text-lg font-bold text-[#2C2C2C]">
              {editandoId ? 'Editar usuario' : 'Nuevo usuario'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#9E9E9E]">
              {editandoId ? 'Deja la contraseña en blanco para no cambiarla.' : 'Completa los datos del nuevo colaborador.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={guardar} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Nombre completo *</label>
              <input type="text" value={form.nombre} onChange={(e) => setF('nombre', e.target.value)} required className="w-full input-boutique" placeholder="María González" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Usuario *</label>
                <input type="text" value={form.username} onChange={(e) => setF('username', e.target.value.toLowerCase())} required className="w-full input-boutique font-mono" placeholder="maria.g" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Rol *</label>
                <select value={form.rol} onChange={(e) => setF('rol', e.target.value)} className="w-full input-boutique">
                  <option value="CAJERO">Cajero</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Correo electrónico</label>
              <input type="email" value={form.email} onChange={(e) => setF('email', e.target.value)} className="w-full input-boutique" placeholder="maria@boutique.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">
                Contraseña {editandoId ? '(dejar en blanco para no cambiar)' : '*'}
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setF('password', e.target.value)}
                  required={!editandoId}
                  className="w-full input-boutique pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9E9E] hover:text-[#2C2C2C]">
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-[#F2C4CE]">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 btn-boutique-secondary text-sm py-2.5">Cancelar</button>
              <button type="submit" disabled={guardando} className="flex-1 btn-boutique-primary text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-60">
                {guardando ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Users size={14} />}
                {editandoId ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
