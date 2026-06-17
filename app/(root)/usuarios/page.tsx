'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Shield, ShieldCheck, ShieldAlert, Pencil, ToggleRight, ToggleLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
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
  ADMIN:      { label: 'Administrador', icon: <ShieldAlert size={13} />,  cls: 'bg-boutique-warning/20 text-boutique-dark' },
  SUPERVISOR: { label: 'Supervisor',    icon: <ShieldCheck size={13} />, cls: 'bg-boutique-info/20 text-boutique-info' },
  CAJERO:     { label: 'Cajero',        icon: <Shield size={13} />,       cls: 'bg-boutique-success/20 text-boutique-success' },
};

const ROL_DESCRIPCIONES: Record<string, string> = {
  CAJERO:     'Solo ventas y caja — sin acceso a reportes ni configuración.',
  SUPERVISOR: 'Ventas, reportes e inventario. Sin acceso a usuarios ni configuración.',
  ADMIN:      'Acceso total al sistema, incluyendo configuración, usuarios y datos financieros.',
};

interface FormUsuario {
  nombre: string; username: string; email: string; password: string; rol: string;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [confirmandoDesactivar, setConfirmandoDesactivar] = useState<Usuario | null>(null);

  const [form, setForm] = useState<FormUsuario>({ nombre: '', username: '', email: '', password: '', rol: 'CAJERO' });

  // Auth check
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setAutorizado(d.user?.rol === 'ADMIN' || d.user?.rol === 'SUPERVISOR'))
      .catch(() => setAutorizado(false));
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const res = await fetch('/api/usuarios');
      if (!res.ok) throw new Error(`Error ${res.status} al cargar usuarios`);
      const d = await res.json();
      setUsuarios(d.data ?? []);
    } catch (err: any) {
      setErrorCarga(err.message ?? 'No se pudieron cargar los usuarios');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { if (autorizado) cargar(); }, [autorizado, cargar]);

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
      let d: any = {};
      try { d = await res.json(); } catch {}
      if (!res.ok) throw new Error(d.error ?? `Error ${res.status}`);
      toast.success(editandoId ? 'Usuario actualizado' : 'Usuario creado');
      setModalOpen(false);
      cargar();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  }

  // Deactivating requires confirmation; activating is safe and immediate
  function handleToggle(u: Usuario) {
    if (u.isActive) {
      setConfirmandoDesactivar(u);
    } else {
      ejecutarToggle(u);
    }
  }

  async function ejecutarToggle(u: Usuario) {
    setConfirmandoDesactivar(null);
    try {
      const res = await fetch(`/api/usuarios/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      let d: any = {};
      try { d = await res.json(); } catch {}
      if (!res.ok) throw new Error(d.error ?? `Error ${res.status}`);
      toast.success(u.isActive ? 'Usuario desactivado' : 'Usuario activado');
      cargar(); // refetch — avoids optimistic state drift on PATCH failure
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (autorizado === null) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin motion-reduce:animate-none motion-reduce:opacity-50" />
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="max-w-md mx-auto mt-12 card-boutique p-6 text-center space-y-3">
        <ShieldAlert size={32} className="mx-auto text-boutique-danger" aria-hidden="true" />
        <h1 className="font-playfair text-xl font-bold text-boutique-dark">Acceso restringido</h1>
        <p className="text-sm text-boutique-gray-mid">
          Esta sección está disponible solo para usuarios con rol Administrador o Supervisor.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-playfair text-2xl font-bold text-boutique-dark">Usuarios y roles</h1>
            <p className="text-sm text-boutique-gray-mid mt-0.5">Gestión del equipo de trabajo</p>
          </div>
          <button onClick={abrirCrear} className="btn-boutique-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> Nuevo usuario
          </button>
        </div>

        {cargando ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin motion-reduce:animate-none motion-reduce:opacity-50" />
          </div>
        ) : errorCarga ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <AlertCircle size={28} className="text-boutique-danger" />
            <p className="text-sm text-boutique-danger">{errorCarga}</p>
            <button onClick={cargar} className="btn-boutique-secondary text-xs px-3 py-1.5">Reintentar</button>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Users size={32} className="text-gold-light mb-3" />
            <p className="text-sm font-medium text-boutique-dark mb-1">Sin usuarios registrados</p>
            <p className="text-xs text-boutique-gray-mid">Crea el primer colaborador para comenzar a gestionar el equipo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {usuarios.map((u) => {
              const rolCfg = ROL_CONFIG[u.rol] ?? { label: u.rol, icon: null, cls: '' };
              return (
                <div key={u.id} className={`card-boutique p-4 flex items-center gap-4 transition-opacity ${!u.isActive ? 'opacity-60' : ''}`}>
                  <div className="w-11 h-11 rounded-full bg-blush flex items-center justify-center flex-shrink-0" aria-hidden="true">
                    <span className="font-playfair font-bold text-lg text-gold">
                      {u.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-boutique-dark text-sm">{u.nombre}</p>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${rolCfg.cls}`}>
                        <span aria-hidden="true">{rolCfg.icon}</span>
                        {rolCfg.label}
                      </span>
                      {!u.isActive && (
                        <span className="px-1.5 py-0.5 bg-boutique-gray-mid/20 text-boutique-gray-mid rounded-full text-[10px]">Inactivo</span>
                      )}
                    </div>
                    <p className="text-xs text-boutique-gray-mid mt-0.5">
                      @{u.username}{u.email && ` · ${u.email}`}
                    </p>
                    <p className="text-[10px] text-boutique-gray-mid">
                      Creado {isValid(new Date(u.createdAt)) ? format(new Date(u.createdAt), "d 'de' MMM yyyy", { locale: es }) : '—'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => abrirEditar(u)}
                      aria-label={`Editar usuario ${u.nombre}`}
                      className="p-2 rounded-xl hover:bg-blush-light text-boutique-gray-mid hover:text-gold transition-colors min-w-[44px] min-h-[44px]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleToggle(u)}
                      aria-label={u.isActive ? `Desactivar a ${u.nombre}` : `Activar a ${u.nombre}`}
                      className="p-2 rounded-xl hover:bg-blush-light text-boutique-gray-mid transition-colors min-w-[44px] min-h-[44px]"
                    >
                      {u.isActive
                        ? <ToggleRight size={16} className="text-boutique-success" />
                        : <ToggleLeft size={16} />
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation dialog — deactivation only */}
      <Dialog open={!!confirmandoDesactivar} onOpenChange={(v) => !v && setConfirmandoDesactivar(null)}>
        <DialogContent className="max-w-sm rounded-2xl border border-blush p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-blush bg-boutique-white">
            <DialogTitle className="font-playfair text-lg font-bold text-boutique-dark">¿Desactivar usuario?</DialogTitle>
            <DialogDescription className="text-xs text-boutique-gray-mid">
              El usuario perderá acceso al sistema de inmediato.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <p className="text-sm text-boutique-dark">
              ¿Desactivar a <span className="font-semibold">{confirmandoDesactivar?.nombre}</span>?
              {' '}Podrás volver a activarlo en cualquier momento.
            </p>
            <div className="flex gap-3 pt-1 border-t border-blush">
              <button
                onClick={() => setConfirmandoDesactivar(null)}
                className="flex-1 btn-boutique-secondary text-sm py-2.5"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmandoDesactivar && ejecutarToggle(confirmandoDesactivar)}
                className="flex-1 btn-boutique-danger text-sm py-2.5"
              >
                Desactivar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit user modal */}
      <Dialog open={modalOpen} onOpenChange={(v) => !v && setModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl border border-blush p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-blush bg-boutique-white">
            <DialogTitle className="font-playfair text-lg font-bold text-boutique-dark">
              {editandoId ? 'Editar usuario' : 'Nuevo usuario'}
            </DialogTitle>
            <DialogDescription className="text-xs text-boutique-gray-mid">
              {editandoId ? 'Deja la contraseña en blanco para no cambiarla.' : 'Completa los datos del nuevo colaborador.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={guardar} className="p-6 space-y-4">
            <div>
              <label htmlFor="usr-nombre" className="block text-xs font-medium text-boutique-dark mb-1">Nombre completo *</label>
              <input
                id="usr-nombre"
                type="text"
                value={form.nombre}
                onChange={(e) => setF('nombre', e.target.value)}
                required
                maxLength={60}
                className="w-full input-boutique"
                placeholder="María González"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="usr-username" className="block text-xs font-medium text-boutique-dark mb-1">Usuario *</label>
                <input
                  id="usr-username"
                  type="text"
                  value={form.username}
                  onChange={(e) => setF('username', e.target.value.toLowerCase().replace(/\s/g, ''))}
                  required
                  maxLength={30}
                  className="w-full input-boutique font-mono"
                  placeholder="maria.g"
                />
              </div>
              <div>
                <label htmlFor="usr-rol" className="block text-xs font-medium text-boutique-dark mb-1">Rol *</label>
                <select
                  id="usr-rol"
                  value={form.rol}
                  onChange={(e) => setF('rol', e.target.value)}
                  className="w-full input-boutique"
                >
                  <option value="CAJERO">Cajero</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>

            {/* Role description — updates with selection */}
            {ROL_DESCRIPCIONES[form.rol] && (
              <p className="text-xs text-boutique-gray-mid -mt-2 px-0.5">{ROL_DESCRIPCIONES[form.rol]}</p>
            )}

            <div>
              <label htmlFor="usr-email" className="block text-xs font-medium text-boutique-dark mb-1">Correo electrónico</label>
              <input
                id="usr-email"
                type="email"
                value={form.email}
                onChange={(e) => setF('email', e.target.value)}
                maxLength={100}
                className="w-full input-boutique"
                placeholder="maria@boutique.com"
              />
            </div>

            <div>
              <label htmlFor="usr-password" className="block text-xs font-medium text-boutique-dark mb-1">
                Contraseña {editandoId ? '(dejar en blanco para no cambiar)' : '*'}
              </label>
              <div className="relative">
                <input
                  id="usr-password"
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setF('password', e.target.value)}
                  required={!editandoId}
                  minLength={8}
                  maxLength={72}
                  className="w-full input-boutique pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPwd}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-boutique-gray-mid hover:text-boutique-dark transition-colors"
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {!editandoId && (
                <p className="text-[10px] text-boutique-gray-mid mt-0.5">Mínimo 8 caracteres.</p>
              )}
            </div>

            <div className="flex gap-3 pt-2 border-t border-blush">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 btn-boutique-secondary text-sm py-2.5">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 btn-boutique-primary text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {guardando
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
                  : <Users size={14} />
                }
                {editandoId ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
