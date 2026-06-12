'use client';
import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import type { CajeroPOS } from '../types';
import { useShopConfig } from '@/lib/useShopConfig';

interface Props {
  onSeleccionar: (cajero: CajeroPOS) => void;
}

const ROL_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  CAJERO: 'Cajero',
};

export function SesionModal({ onSeleccionar }: Props) {
  const config = useShopConfig();
  const [cajeros, setCajeros] = useState<CajeroPOS[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch('/api/sesion')
      .then((r) => r.json())
      .then((d) => setCajeros(d.data ?? []))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#F8E1E7] flex items-center justify-center p-4">
      <div className="card-boutique w-full max-w-sm p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-[#F2C4CE] flex items-center justify-center mx-auto mb-4">
          <Store size={24} className="text-[#C9A84C]" />
        </div>
        <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C] mb-1">
          {config?.nombreComercial ?? "Nohemy's Boutique"}
        </h1>
        <p className="text-sm text-[#9E9E9E] mb-6">Selecciona tu nombre para iniciar turno</p>

        {cargando ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {cajeros.map((c) => (
              <button
                key={c.id}
                onClick={() => onSeleccionar(c)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#E8D5A3] hover:bg-[#F8E1E7] hover:border-[#C9A84C] transition-all text-left"
              >
                <div>
                  <p className="font-medium text-[#2C2C2C] text-sm">{c.nombre}</p>
                  <p className="text-xs text-[#9E9E9E]">{ROL_LABEL[c.rol] ?? c.rol}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#F2C4CE] flex items-center justify-center text-[#C9A84C] font-bold text-sm font-playfair">
                  {c.nombre.charAt(0).toUpperCase()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
