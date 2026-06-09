'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Save, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { calcularMargen, generarSKU, formatPrecio } from '@/lib/boutique';
import { VarianteRow, type VarianteInput } from './VarianteRow';
import { ImageUploader } from '@/components/boutique/ImageUploader';

interface Categoria {
  id: string;
  nombre: string;
  icono: string | null;
}

export interface ProductoData {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  categoriaId: string;
  costo: number;
  precioVenta: number;
  variantes: (VarianteInput & { id?: string })[];
}

interface Props {
  modo: 'crear' | 'editar';
  productoInicial?: ProductoData;
  onSuccess: () => void;
  onCancel: () => void;
}

const varianteVacia = (): VarianteInput => ({
  sku: '',
  talla: '',
  color: '',
  colorHex: '#F2C4CE',
  stockActual: 0,
  stockMinimo: 2,
});

export function ProductForm({ modo, productoInicial, onSuccess, onCancel }: Props) {
  const [cargando, setCargando] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  const [nombre, setNombre] = useState(productoInicial?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(productoInicial?.descripcion ?? '');
  const [imagenUrl, setImagenUrl] = useState(productoInicial?.imagenUrl ?? '');
  const [categoriaId, setCategoriaId] = useState(productoInicial?.categoriaId ?? '');
  const [costo, setCosto] = useState<number>(productoInicial?.costo ?? 0);
  const [precioVenta, setPrecioVenta] = useState<number>(productoInicial?.precioVenta ?? 0);
  const [variantes, setVariantes] = useState<VarianteInput[]>(
    productoInicial?.variantes ?? [varianteVacia()]
  );

  const margen = calcularMargen(costo, precioVenta);

  useEffect(() => {
    fetch('/api/categorias')
      .then((r) => r.json())
      .then((d) => setCategorias(d.data ?? []))
      .catch(() => toast.error('No se pudieron cargar las categorías'));
  }, []);

  const handleVarianteChange = useCallback(
    (index: number, field: keyof VarianteInput, value: string | number) => {
      setVariantes((prev) => {
        const copia = [...prev];
        copia[index] = { ...copia[index], [field]: value };
        return copia;
      });
    },
    []
  );

  function autoGenerarSKUs() {
    const base = nombre.substring(0, 3).toUpperCase().replace(/\s/g, '') || 'PRD';
    setVariantes((prev) =>
      prev.map((v, i) => ({
        ...v,
        sku:
          v.talla || v.color
            ? generarSKU(
                `${base}${String(i + 1).padStart(3, '0')}`,
                v.color || 'XX',
                v.talla || ''
              )
            : v.sku,
      }))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const variantesConDatos = variantes.filter((v) => v.sku.trim());
    if (variantes.length > 0 && variantesConDatos.length === 0) {
      toast.error('Cada variante debe tener un SKU');
      return;
    }

    setCargando(true);
    try {
      const url =
        modo === 'crear' ? '/api/productos' : `/api/productos/${productoInicial?.id}`;
      const method = modo === 'crear' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          descripcion,
          imagenUrl,
          categoriaId,
          costo,
          precioVenta,
          variantes: variantesConDatos,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(
        modo === 'crear' ? 'Producto creado exitosamente' : 'Producto actualizado'
      );
      onSuccess();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Imagen */}
      <div>
        <label className="block text-xs font-medium text-[#2C2C2C] mb-1.5">
          Imagen del producto
        </label>
        <ImageUploader value={imagenUrl} onChange={setImagenUrl} />
      </div>

      {/* Datos básicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-[#2C2C2C] mb-1">
            Nombre *
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Vestido floral manga corta"
            required
            minLength={2}
            className="w-full input-boutique"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#2C2C2C] mb-1">
            Categoría *
          </label>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            required
            className="w-full input-boutique bg-white"
          >
            <option value="">Seleccionar...</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icono} {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#2C2C2C] mb-1">
            Descripción
          </label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Breve descripción"
            className="w-full input-boutique"
          />
        </div>
      </div>

      {/* Precios */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Costo (Q) *</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={costo}
            onChange={(e) => setCosto(parseFloat(e.target.value) || 0)}
            required
            className="w-full input-boutique font-mono text-center"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Precio venta (Q) *</label>
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={precioVenta}
            onChange={(e) => setPrecioVenta(parseFloat(e.target.value) || 0)}
            required
            className="w-full input-boutique font-mono text-center"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Margen</label>
          <div
            className={`input-boutique font-mono font-bold text-center ${
              margen < 0
                ? 'text-[#E57373]'
                : margen < 20
                ? 'text-[#F5C842]'
                : 'text-[#6DBF94]'
            }`}
          >
            {margen.toFixed(1)}%
          </div>
        </div>
      </div>
      {costo > 0 && precioVenta > 0 && (
        <p className="text-xs text-[#9E9E9E] -mt-3">
          Ganancia por unidad:{' '}
          <span className="font-mono font-medium text-[#2C2C2C]">
            {formatPrecio(precioVenta - costo)}
          </span>
        </p>
      )}

      {/* Variantes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-[#2C2C2C]">
            Variantes (Tallas / Colores)
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={autoGenerarSKUs}
              className="flex items-center gap-1 px-2.5 py-1 text-xs btn-boutique-secondary"
            >
              <RefreshCw size={11} />
              Auto SKU
            </button>
            <button
              type="button"
              onClick={() => setVariantes((p) => [...p, varianteVacia()])}
              className="flex items-center gap-1 px-2.5 py-1 text-xs btn-boutique-primary"
            >
              <Plus size={11} />
              Agregar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#F2C4CE]">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-[#F8E1E7]">
                <th className="px-2.5 py-2 text-left text-xs font-medium text-[#2C2C2C]">SKU *</th>
                <th className="px-2.5 py-2 text-left text-xs font-medium text-[#2C2C2C]">Talla</th>
                <th className="px-2.5 py-2 text-left text-xs font-medium text-[#2C2C2C]">Color</th>
                <th className="px-2.5 py-2 text-left text-xs font-medium text-[#2C2C2C]">HEX</th>
                <th className="px-2.5 py-2 text-center text-xs font-medium text-[#2C2C2C]">Stock</th>
                <th className="px-2.5 py-2 text-center text-xs font-medium text-[#2C2C2C]">Mín.</th>
                <th className="px-2.5 py-2" />
              </tr>
            </thead>
            <tbody>
              {variantes.map((v, i) => (
                <VarianteRow
                  key={i}
                  index={i}
                  variante={v}
                  onChange={handleVarianteChange}
                  onRemove={(idx) => setVariantes((p) => p.filter((_, j) => j !== idx))}
                />
              ))}
            </tbody>
          </table>
          {variantes.length === 0 && (
            <p className="text-center text-xs text-[#9E9E9E] py-5">
              Sin variantes. Haz clic en &quot;Agregar&quot; para añadir.
            </p>
          )}
        </div>
      </div>

      {/* Botones */}
      <div className="flex items-center gap-3 justify-end pt-2 border-t border-[#F2C4CE]">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-[#9E9E9E] hover:text-[#2C2C2C] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={cargando}
          className="flex items-center gap-2 btn-boutique-primary disabled:opacity-60"
        >
          {cargando ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={15} />
          )}
          {modo === 'crear' ? 'Crear producto' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
