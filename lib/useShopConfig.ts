'use client';
import { useState, useEffect } from 'react';

export interface ShopConfigData {
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

export function useShopConfig() {
  const [config, setConfig] = useState<ShopConfigData | null>(null);

  useEffect(() => {
    fetch('/api/configuracion')
      .then((r) => r.json())
      .then((d) => setConfig(d.data ?? null))
      .catch(() => setConfig(null));
  }, []);

  return config;
}
