'use client';
import { useState, useEffect, useRef } from 'react';
import { Save, Building2, Phone, Globe, FileText, Image as ImageIcon, ShieldAlert, AlertCircle, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { ImageUploader } from '@/components/boutique/ImageUploader';

interface Config {
  id: string;
  nombreComercial: string;
  razonSocial: string | null;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
  logoUrl: string | null;
  politicaCambios: string | null;
  ivaPorcentaje: number;
}

type FormConfig = Omit<Config, 'id'>;

const DEFAULTS: FormConfig = {
  nombreComercial: "Nohemy's Boutique",
  razonSocial: '', nit: '', direccion: '', telefono: '', correo: '',
  instagram: '', facebook: '', whatsapp: '', logoUrl: null,
  politicaCambios: '', ivaPorcentaje: 12,
};

export default function ConfiguracionPage() {
  const [form, setForm] = useState<FormConfig>(DEFAULTS);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const lastFetchedRef = useRef<FormConfig | null>(null);

  // Auth check — if denied, stop waiting for config load
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        const ok = d.user?.rol === 'ADMIN' || d.user?.rol === 'SUPERVISOR';
        setAutorizado(ok);
        if (!ok) setCargando(false);
      })
      .catch(() => {
        setAutorizado(false);
        setCargando(false);
      });
  }, []);

  // Config load
  useEffect(() => {
    fetch('/api/configuracion')
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status} al cargar la configuración`);
        return r.json();
      })
      .then((d) => {
        if (d.data) {
          const loaded: FormConfig = {
            nombreComercial: d.data.nombreComercial ?? '',
            razonSocial: d.data.razonSocial ?? '',
            nit: d.data.nit ?? '',
            direccion: d.data.direccion ?? '',
            telefono: d.data.telefono ?? '',
            correo: d.data.correo ?? '',
            instagram: d.data.instagram ?? '',
            facebook: d.data.facebook ?? '',
            whatsapp: d.data.whatsapp ?? '',
            logoUrl: d.data.logoUrl ?? null,
            politicaCambios: d.data.politicaCambios ?? '',
            ivaPorcentaje: d.data.ivaPorcentaje ?? 12,
          };
          setForm(loaded);
          lastFetchedRef.current = loaded;
        }
      })
      .catch((err: any) => setErrorCarga(err.message ?? 'No se pudo cargar la configuración'))
      .finally(() => setCargando(false));
  }, []);

  // Warn on tab close / browser refresh when unsaved changes exist
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  function setF(k: keyof FormConfig, v: string | number | null) {
    setForm((p) => ({ ...p, [k]: v }));
    setIsDirty(true);
  }

  function cancelar() {
    if (lastFetchedRef.current) setForm(lastFetchedRef.current);
    setIsDirty(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      let d: any = {};
      try { d = await res.json(); } catch {}
      if (!res.ok) throw new Error(d.error ?? `Error ${res.status}`);
      lastFetchedRef.current = { ...form };
      setIsDirty(false);
      toast.success('Configuración guardada correctamente');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando || autorizado === null) {
    return (
      <div className="flex justify-center py-20">
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

  if (errorCarga) {
    return (
      <div className="flex flex-col items-center py-20 gap-3 text-center">
        <AlertCircle size={28} className="text-boutique-danger" />
        <p className="text-sm text-boutique-danger">{errorCarga}</p>
        <button onClick={() => window.location.reload()} className="btn-boutique-secondary text-xs px-3 py-1.5">
          Reintentar
        </button>
      </div>
    );
  }

  const politicaLen = form.politicaCambios?.length ?? 0;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-boutique-dark">Configuración general</h1>
          <p className="text-sm text-boutique-gray-mid mt-0.5">Datos del negocio que aparecen en tickets y reportes</p>
        </div>
        {isDirty && (
          <span className="flex-shrink-0 mt-1 text-xs text-gold font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" aria-hidden="true" />
            Cambios sin guardar
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Datos del negocio */}
        <section className="card-boutique p-5 space-y-4">
          <div>
            <h2 className="font-playfair text-base font-semibold text-boutique-dark flex items-center gap-2">
              <Building2 size={16} className="text-gold" aria-hidden="true" /> Datos del negocio
            </h2>
            <p className="text-xs text-boutique-gray-mid mt-0.5">Aparece en el encabezado de tickets y reportes fiscales.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cfg-nombre" className="block text-xs font-medium text-boutique-dark mb-1">Nombre comercial *</label>
              <input
                id="cfg-nombre"
                type="text"
                value={form.nombreComercial}
                onChange={(e) => setF('nombreComercial', e.target.value)}
                required
                maxLength={60}
                className="w-full input-boutique"
                placeholder="Nohemy's Boutique"
              />
            </div>
            <div>
              <label htmlFor="cfg-razon" className="block text-xs font-medium text-boutique-dark mb-1">
                Razón social
                <span className="ml-1 font-normal text-boutique-gray-mid">(para facturas)</span>
              </label>
              <input
                id="cfg-razon"
                type="text"
                value={form.razonSocial ?? ''}
                onChange={(e) => setF('razonSocial', e.target.value)}
                maxLength={100}
                className="w-full input-boutique"
                placeholder="Boutique Nohemy S.A."
              />
            </div>
            <div>
              <label htmlFor="cfg-nit" className="block text-xs font-medium text-boutique-dark mb-1">NIT</label>
              <input
                id="cfg-nit"
                type="text"
                inputMode="numeric"
                value={form.nit ?? ''}
                onChange={(e) => setF('nit', e.target.value)}
                maxLength={20}
                className="w-full input-boutique font-mono"
                placeholder="12345678-9"
              />
            </div>
            <div>
              <label htmlFor="cfg-iva" className="block text-xs font-medium text-boutique-dark mb-1">
                IVA (%)
                <span className="ml-1 font-normal text-boutique-gray-mid">(se aplica en tickets)</span>
              </label>
              <input
                id="cfg-iva"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form.ivaPorcentaje}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setF('ivaPorcentaje', isNaN(v) ? form.ivaPorcentaje : v);
                }}
                className="w-full input-boutique font-mono"
              />
            </div>
          </div>
          <div>
            <label htmlFor="cfg-direccion" className="block text-xs font-medium text-boutique-dark mb-1">Dirección</label>
            <input
              id="cfg-direccion"
              type="text"
              value={form.direccion ?? ''}
              onChange={(e) => setF('direccion', e.target.value)}
              maxLength={200}
              className="w-full input-boutique"
              placeholder="Zona 10, Ciudad de Guatemala"
            />
          </div>
        </section>

        {/* Contacto */}
        <section className="card-boutique p-5 space-y-4">
          <div>
            <h2 className="font-playfair text-base font-semibold text-boutique-dark flex items-center gap-2">
              <Phone size={16} className="text-gold" aria-hidden="true" /> Contacto
            </h2>
            <p className="text-xs text-boutique-gray-mid mt-0.5">Teléfono y correo que aparecen en el pie del ticket.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cfg-telefono" className="block text-xs font-medium text-boutique-dark mb-1">Teléfono</label>
              <input
                id="cfg-telefono"
                type="tel"
                value={form.telefono ?? ''}
                onChange={(e) => setF('telefono', e.target.value)}
                maxLength={20}
                className="w-full input-boutique"
                placeholder="5555-0000"
              />
            </div>
            <div>
              <label htmlFor="cfg-correo" className="block text-xs font-medium text-boutique-dark mb-1">Correo</label>
              <input
                id="cfg-correo"
                type="email"
                value={form.correo ?? ''}
                onChange={(e) => setF('correo', e.target.value)}
                maxLength={100}
                className="w-full input-boutique"
                placeholder="hola@boutique.gt"
              />
            </div>
          </div>
        </section>

        {/* Redes y mensajería — WhatsApp consolidado aquí */}
        <section className="card-boutique p-5 space-y-4">
          <div>
            <h2 className="font-playfair text-base font-semibold text-boutique-dark flex items-center gap-2">
              <Globe size={16} className="text-gold" aria-hidden="true" /> Redes y mensajería
            </h2>
            <p className="text-xs text-boutique-gray-mid mt-0.5">Canales digitales para que los clientes te encuentren.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cfg-instagram" className="block text-xs font-medium text-boutique-dark mb-1">Instagram</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-boutique-gray-mid text-sm select-none" aria-hidden="true">@</span>
                <input
                  id="cfg-instagram"
                  type="text"
                  value={form.instagram ?? ''}
                  onChange={(e) => setF('instagram', e.target.value)}
                  maxLength={60}
                  className="w-full input-boutique pl-7"
                  placeholder="nohemysboutique"
                />
              </div>
            </div>
            <div>
              <label htmlFor="cfg-facebook" className="block text-xs font-medium text-boutique-dark mb-1">Facebook</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-boutique-gray-mid text-sm select-none" aria-hidden="true">@</span>
                <input
                  id="cfg-facebook"
                  type="text"
                  value={form.facebook ?? ''}
                  onChange={(e) => setF('facebook', e.target.value)}
                  maxLength={60}
                  className="w-full input-boutique pl-7"
                  placeholder="nohemysboutique"
                />
              </div>
            </div>
            <div>
              <label htmlFor="cfg-whatsapp" className="block text-xs font-medium text-boutique-dark mb-1">WhatsApp</label>
              <input
                id="cfg-whatsapp"
                type="tel"
                value={form.whatsapp ?? ''}
                onChange={(e) => setF('whatsapp', e.target.value)}
                maxLength={20}
                className="w-full input-boutique"
                placeholder="502 5555-0000"
              />
            </div>
          </div>
        </section>

        {/* Logo */}
        <section className="card-boutique p-5 space-y-3">
          <div>
            <h2 className="font-playfair text-base font-semibold text-boutique-dark flex items-center gap-2">
              <ImageIcon size={16} className="text-gold" aria-hidden="true" /> Logo del negocio
            </h2>
            <p className="text-xs text-boutique-gray-mid mt-0.5">Se mostrará en los tickets impresos.</p>
          </div>
          <ImageUploader
            value={form.logoUrl ?? undefined}
            onChange={(url) => setF('logoUrl', url)}
          />
        </section>

        {/* Política de cambios */}
        <section className="card-boutique p-5 space-y-3">
          <div>
            <h2 className="font-playfair text-base font-semibold text-boutique-dark flex items-center gap-2">
              <FileText size={16} className="text-gold" aria-hidden="true" /> Política de cambios
            </h2>
            <p className="text-xs text-boutique-gray-mid mt-0.5">Aparece al pie de cada ticket impreso.</p>
          </div>
          <textarea
            id="cfg-politica"
            value={form.politicaCambios ?? ''}
            onChange={(e) => setF('politicaCambios', e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full input-boutique resize-none text-sm"
            placeholder="Cambios válidos dentro de 7 días con ticket. No se aceptan devoluciones en ropa de temporada..."
          />
          {politicaLen > 440 && (
            <p className="text-xs text-boutique-gray-mid text-right">{politicaLen}/500</p>
          )}
        </section>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pb-6">
          {isDirty && (
            <button
              type="button"
              onClick={cancelar}
              className="btn-boutique-secondary flex items-center gap-2 text-sm py-2.5 px-5"
            >
              <X size={15} /> Cancelar cambios
            </button>
          )}
          <button
            type="submit"
            disabled={guardando}
            className="btn-boutique-primary flex items-center gap-2 px-8 py-3 disabled:opacity-60"
          >
            {guardando
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
              : <Save size={16} />
            }
            Guardar configuración
          </button>
        </div>
      </form>
    </div>
  );
}
