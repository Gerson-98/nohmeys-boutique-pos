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

// Module-level singleton — one network request regardless of how many components
// call this hook concurrently (layout + Sidebar both need nombreComercial on load).
// `cached` undefined = not yet fetched; `{ data: null }` = fetched but failed.
let cached: { data: ShopConfigData | null } | undefined;
let inflight: Promise<ShopConfigData | null> | undefined;

function fetchConfig(): Promise<ShopConfigData | null> {
  if (inflight) return inflight;
  inflight = fetch('/api/configuracion')
    .then((r) => r.json())
    .then((d) => d.data ?? null)
    .catch(() => null)
    .then((data) => {
      cached = { data };
      inflight = undefined;
      return data;
    });
  return inflight;
}

export function useShopConfig() {
  const [config, setConfig] = useState<ShopConfigData | null>(cached?.data ?? null);

  useEffect(() => {
    if (cached) {
      setConfig(cached.data);
      return;
    }
    let alive = true;
    fetchConfig().then((data) => { if (alive) setConfig(data); });
    return () => { alive = false; };
  }, []);

  return config;
}
