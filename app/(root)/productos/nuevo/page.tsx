'use client';
import { useRouter } from 'next/navigation';
import { ProductForm } from '../components/ProductForm';

export default function NuevoProductoPage() {
  const router = useRouter();
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
