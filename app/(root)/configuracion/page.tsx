'use client';
import { useState, useEffect } from 'react';
import { Save, Building2, Phone, Globe, FileText, DollarSign, Image as ImageIcon } from 'lucide-react';
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

export default function ConfiguracionPage() {
  const [form, setForm] = useState<FormConfig>({
    nombreComercial: "Nohemy's Boutique",
    razonSocial: '', nit: '', direccion: '', telefono: '', correo: '',
    instagram: '', facebook: '', whatsapp: '', logoUrl: null,
    politicaCambios: '', ivaPorcentaje: 12,
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch('/api/configuracion')
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setForm({
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
          });
        }
      })
      .finally(() => setCargando(false));
  }, []);

  function setF(k: keyof FormConfig, v: string | number | null) {
    setForm((p) => ({ ...p, [k]: v }));
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
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success('Configuración guardada correctamente');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">Configuración general</h1>
        <p className="text-sm text-[#9E9E9E] mt-0.5">Datos del negocio que aparecen en tickets y reportes</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos del negocio */}
        <section className="card-boutique p-5 space-y-4">
          <h2 className="font-playfair text-base font-semibold text-[#2C2C2C] flex items-center gap-2">
            <Building2 size={16} className="text-[#C9A84C]" /> Datos del negocio
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Nombre comercial *</label>
              <input type="text" value={form.nombreComercial} onChange={(e) => setF('nombreComercial', e.target.value)} required className="w-full input-boutique" placeholder="Nohemy's Boutique" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Razón social</label>
              <input type="text" value={form.razonSocial ?? ''} onChange={(e) => setF('razonSocial', e.target.value)} className="w-full input-boutique" placeholder="Boutique Nohemy S.A." />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">NIT</label>
              <input type="text" value={form.nit ?? ''} onChange={(e) => setF('nit', e.target.value)} className="w-full input-boutique font-mono" placeholder="12345678-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">IVA (%)</label>
              <input
                type="number" min={0} max={100} step={0.1}
                value={form.ivaPorcentaje}
                onChange={(e) => setF('ivaPorcentaje', parseFloat(e.target.value) || 0)}
                className="w-full input-boutique font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Dirección</label>
            <input type="text" value={form.direccion ?? ''} onChange={(e) => setF('direccion', e.target.value)} className="w-full input-boutique" placeholder="Zona 10, Ciudad de Guatemala" />
          </div>
        </section>

        {/* Contacto */}
        <section className="card-boutique p-5 space-y-4">
          <h2 className="font-playfair text-base font-semibold text-[#2C2C2C] flex items-center gap-2">
            <Phone size={16} className="text-[#C9A84C]" /> Contacto
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Teléfono</label>
              <input type="tel" value={form.telefono ?? ''} onChange={(e) => setF('telefono', e.target.value)} className="w-full input-boutique" placeholder="5555-0000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Correo</label>
              <input type="email" value={form.correo ?? ''} onChange={(e) => setF('correo', e.target.value)} className="w-full input-boutique" placeholder="hola@boutique.gt" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">WhatsApp</label>
              <input type="tel" value={form.whatsapp ?? ''} onChange={(e) => setF('whatsapp', e.target.value)} className="w-full input-boutique" placeholder="502 5555-0000" />
            </div>
          </div>
        </section>

        {/* Redes sociales */}
        <section className="card-boutique p-5 space-y-4">
          <h2 className="font-playfair text-base font-semibold text-[#2C2C2C] flex items-center gap-2">
            <Globe size={16} className="text-[#C9A84C]" /> Redes sociales
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Instagram</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E] text-sm">@</span>
                <input type="text" value={form.instagram ?? ''} onChange={(e) => setF('instagram', e.target.value)} className="w-full input-boutique pl-7" placeholder="nohemysboutique" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Facebook</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E] text-sm">@</span>
                <input type="text" value={form.facebook ?? ''} onChange={(e) => setF('facebook', e.target.value)} className="w-full input-boutique pl-7" placeholder="nohemysboutique" />
              </div>
            </div>
          </div>
        </section>

        {/* Logo */}
        <section className="card-boutique p-5 space-y-3">
          <h2 className="font-playfair text-base font-semibold text-[#2C2C2C] flex items-center gap-2">
            <ImageIcon size={16} className="text-[#C9A84C]" /> Logo del negocio
          </h2>
          <p className="text-xs text-[#9E9E9E]">Se mostrará en los tickets impresos.</p>
          <ImageUploader
            value={form.logoUrl ?? undefined}
            onChange={(url) => setF('logoUrl', url)}
          />
        </section>

        {/* Política de cambios */}
        <section className="card-boutique p-5 space-y-3">
          <h2 className="font-playfair text-base font-semibold text-[#2C2C2C] flex items-center gap-2">
            <FileText size={16} className="text-[#C9A84C]" /> Política de cambios
          </h2>
          <p className="text-xs text-[#9E9E9E]">Aparece al pie de cada ticket impreso.</p>
          <textarea
            value={form.politicaCambios ?? ''}
            onChange={(e) => setF('politicaCambios', e.target.value)}
            rows={3}
            className="w-full input-boutique resize-none text-sm"
            placeholder="Cambios válidos dentro de 7 días con ticket. No se aceptan devoluciones en ropa de temporada..."
          />
        </section>

        {/* Botón guardar */}
        <div className="flex justify-end pb-6">
          <button
            type="submit"
            disabled={guardando}
            className="btn-boutique-primary flex items-center gap-2 px-8 py-3 disabled:opacity-60"
          >
            {guardando
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Save size={16} />
            }
            Guardar configuración
          </button>
        </div>
      </form>
    </div>
  );
}
