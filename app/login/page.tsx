'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then((r) => {
      if (r.ok) router.replace('/pos');
    });
  }, [router]);
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        return;
      }
      router.replace('/pos');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#F2C4CE] flex items-center justify-center mx-auto mb-4 shadow-md">
            <span className="font-playfair text-2xl font-bold text-[#C9A84C]">N</span>
          </div>
          <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">
            Nohemy&apos;s <span className="text-[#C9A84C]">Boutique</span>
          </h1>
          <p className="text-sm text-[#9E9E9E] mt-1">Sistema de Punto de Venta</p>
        </div>

        {/* Card */}
        <div className="card-boutique p-6 shadow-lg">
          <h2 className="font-playfair text-lg font-semibold text-[#2C2C2C] mb-5">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Usuario</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  autoFocus
                  className="w-full input-boutique pl-9"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Contraseña</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full input-boutique pl-9 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9E9E] hover:text-[#2C2C2C]"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-[#E57373]/10 border border-[#E57373] rounded-xl px-3 py-2">
                <p className="text-xs text-[#E57373]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-boutique-primary py-3 flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Lock size={16} />
              }
              Entrar
            </button>
          </form>

          <p className="text-[10px] text-[#9E9E9E] text-center mt-4">
            Usuario por defecto: <span className="font-mono">admin</span> · contraseña: cualquier texto la primera vez
          </p>
        </div>
      </div>
    </div>
  );
}
