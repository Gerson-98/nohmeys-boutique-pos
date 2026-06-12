'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { ProductForm } from '../components/ProductForm';

export default function NuevoProductoPage() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setAutorizado(d.user?.rol === 'ADMIN' || d.user?.rol === 'SUPERVISOR'))
      .catch(() => setAutorizado(false));
  }, []);

  if (autorizado === null) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="max-w-md mx-auto mt-12 card-boutique p-6 text-center space-y-3">
        <ShieldAlert size={32} className="mx-auto text-[#E57373]" />
        <h1 className="font-playfair text-xl font-bold text-[#2C2C2C]">Acceso restringido</h1>
        <p className="text-sm text-[#9E9E9E]">
          Esta sección está disponible solo para usuarios con rol Administrador o Supervisor.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">Nuevo producto</h1>
        <p className="text-sm text-[#9E9E9E] mt-0.5">
          Completa los datos y agrega las variantes de talla y color.
        </p>
      </div>
      <ProductForm
        modo="crear"
        onSuccess={() => router.push('/productos')}
        onCancel={() => router.back()}
      />
    </div>
  );
}
