'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UsuarioActual {
  id: string;
  nombre: string;
  rol: string;
}

interface UserContextValue {
  usuario: UsuarioActual | null;
  cargando: boolean;
}

const UserContext = createContext<UserContextValue>({
  usuario: null,
  cargando: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioActual | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUsuario(d.user ?? null))
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  return (
    <UserContext.Provider value={{ usuario, cargando }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  return useContext(UserContext);
}
