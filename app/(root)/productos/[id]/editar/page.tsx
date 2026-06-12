'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { ProductForm, type ProductoData } from '../../components/ProductForm';

interface Props {
  params: { id: string };
}

export default function EditarProductoPage({ params }: Props) {
  const router = useRouter();
  const [producto, setProducto] = useState<ProductoData | undefined>();
  const [cargando, setCargando] = useState(true);
  const [autorizado, setAutorizado] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setAutorizado(d.user?.rol === 'ADMIN' || d.user?.rol === 'SUPERVISOR'))
      .catch(() => setAutorizado(false));
  }, []);

  useEffect(() => {
    fetch(`/api/productos/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        const p = d.data;
        setProducto({
          id: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion,
          imagenUrl: p.imagenUrl,
          categoriaId: p.categoriaId,
          costo: p.costo,
          precioVenta: p.precioVenta,
          variantes: p.variantes.map((v: ProductoData['variantes'][number]) => ({
            id: v.id,
            sku: v.sku,
            talla: v.talla ?? '',
            color: v.color ?? '',
            colorHex: v.colorHex ?? '',
            stockActual: v.stockActual,
            stockMinimo: v.stockMinimo,
          })),
        });
      })
      .finally(() => setCargando(false));
  }, [params.id]);

  if (cargando || autorizado === null) {
    return (
      <div className="flex items-center justify-center py-20">
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
        <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">Editar producto</h1>
        <p className="text-sm text-[#9E9E9E] mt-0.5">{producto?.nombre}</p>
      </div>
      <ProductForm
        modo="editar"
        productoInicial={producto}
        onSuccess={() => router.push('/productos')}
        onCancel={() => router.back()}
      />
    </div>
  );
}
