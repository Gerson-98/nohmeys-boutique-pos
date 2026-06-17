'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { toast } from 'react-toastify';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    toast.error('Ocurrió un error inesperado.');
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-boutique-gray-soft p-4">
      <div role="alert" className="card-boutique max-w-md w-full p-6 text-center space-y-4">
        <div aria-hidden="true" className="mx-auto w-12 h-12 rounded-full bg-boutique-danger/10 flex items-center justify-center">
          <AlertTriangle size={22} className="text-boutique-danger" />
        </div>
        <div className="space-y-1">
          <h1 className="font-playfair text-xl font-bold text-boutique-dark">Algo salió mal</h1>
          <p className="text-sm text-boutique-dark/70">
            Ocurrió un error inesperado al cargar esta página. Puedes intentarlo de nuevo o volver al inicio.
          </p>
          {error.digest && (
            <p className="text-xs text-boutique-gray-mid font-mono">Código: {error.digest}</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <button
            onClick={reset}
            className="btn-boutique-primary inline-flex items-center justify-center gap-2"
          >
            <RotateCcw size={15} aria-hidden="true" />
            Reintentar
          </button>
          <Link
            href="/home"
            className="btn-boutique-secondary inline-flex items-center justify-center gap-2"
          >
            <Home size={15} aria-hidden="true" />
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
