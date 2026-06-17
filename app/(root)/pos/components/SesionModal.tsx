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
    <div className="fixed inset-0 z-50 bg-blush-light flex items-center justify-center p-4">
      <div className="card-boutique w-full max-w-sm p-8 text-center">
        <div aria-hidden="true" className="w-14 h-14 rounded-full bg-blush flex items-center justify-center mx-auto mb-4">
          <Store size={24} className="text-gold" aria-hidden="true" />
        </div>
        <h1 className="font-playfair text-2xl font-bold text-boutique-dark mb-1">
          {config?.nombreComercial ?? "Nohemy's Boutique"}
        </h1>
        <p className="text-sm text-boutique-gray-mid mb-6">Selecciona tu nombre para iniciar turno</p>

        {cargando ? (
          <div className="flex justify-center py-4">
            <div role="status" aria-label="Cargando operadores" className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin motion-reduce:animate-none motion-reduce:opacity-50" />
          </div>
        ) : (
          <div className="space-y-2">
            {cajeros.map((c) => (
              <button
                key={c.id}
                onClick={() => onSeleccionar(c)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gold-light hover:bg-blush-light hover:border-gold transition-all text-left"
              >
                <div>
                  <p className="font-medium text-boutique-dark text-sm">{c.nombre}</p>
                  <p className="text-xs text-boutique-gray-mid">{ROL_LABEL[c.rol] ?? c.rol}</p>
                </div>
                <div aria-hidden="true" className="w-8 h-8 rounded-full bg-blush flex items-center justify-center text-gold font-bold text-sm font-playfair">
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
