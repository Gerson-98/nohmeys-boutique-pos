'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Save, RefreshCw, X, Check } from 'lucide-react';
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
  precioVenta: null,
  stockActual: 0,
  stockMinimo: 2,
});

export function ProductForm({ modo, productoInicial, onSuccess, onCancel }: Props) {
  const [cargando, setCargando] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [rol, setRol] = useState<string | null>(null);

  const [nombre, setNombre] = useState(productoInicial?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(productoInicial?.descripcion ?? '');
  const [imagenUrl, setImagenUrl] = useState(productoInicial?.imagenUrl ?? '');
  const [categoriaId, setCategoriaId] = useState(productoInicial?.categoriaId ?? '');
  const [costo, setCosto] = useState<number>(productoInicial?.costo ?? 0);
  const [precioVenta, setPrecioVenta] = useState<number>(productoInicial?.precioVenta ?? 0);
  const [variantes, setVariantes] = useState<VarianteInput[]>(
    productoInicial?.variantes ?? [varianteVacia()]
  );

  const [nuevaCategoria, setNuevaCategoria] = useState(false);
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('');
  const [nuevaCategoriaIcono, setNuevaCategoriaIcono] = useState('');
  const [creandoCategoria, setCreandoCategoria] = useState(false);

  const margen = calcularMargen(costo, precioVenta);

  const cargarCategorias = useCallback(() => {
    fetch('/api/categorias')
      .then((r) => r.json())
      .then((d) => setCategorias(d.data ?? []))
      .catch(() => toast.error('No se pudieron cargar las categorías'));
  }, []);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setRol(d.user?.rol ?? null))
      .catch(() => setRol(null));
  }, []);

  const puedeVerCosto = rol === 'ADMIN' || rol === 'SUPERVISOR';

  async function crearCategoria() {
    if (!nuevaCategoriaNombre.trim() || nuevaCategoriaNombre.trim().length < 2) {
      toast.error('El nombre de la categoría debe tener al menos 2 caracteres');
      return;
    }
    setCreandoCategoria(true);
    try {
      const res = await fetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevaCategoriaNombre.trim(), icono: nuevaCategoriaIcono.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      cargarCategorias();
      setCategoriaId(data.data.id);
      setNuevaCategoria(false);
      setNuevaCategoriaNombre('');
      setNuevaCategoriaIcono('');
      toast.success('Categoría creada correctamente');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setCreandoCategoria(false);
    }
  }

  const handleVarianteChange = useCallback(
    (index: number, field: keyof VarianteInput, value: string | number | null) => {
      setVariantes((prev) => {
        const copia = [...prev];
        copia[index] = { ...copia[index], [field]: value } as VarianteInput;
        return copia;
      });
    },
    []
  );

  function copiarPrecioATodas() {
    setVariantes((prev) => prev.map((v) => ({ ...v, precioVenta: precioVenta })));
  }

  function autoGenerarSKUs() {
    if (!nombre.trim()) {
      toast.error('Ingrese el nombre del producto antes de generar los SKU');
      return;
    }
    const catNombre = categorias.find((c) => c.id === categoriaId)?.nombre || '';
    const catCode = (catNombre.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ]/g, '').toUpperCase().substring(0, 3)) || 'CAT';
    const nameCode = (nombre.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ]/g, '').toUpperCase().substring(0, 3)) || 'PRD';
    const base = `${catCode}${nameCode}`;

    const skusUsados = new Set<string>();
    setVariantes((prev) =>
      prev.map((v) => {
        let sku = generarSKU(base, v.color || '', v.talla || '');
        let sufijo = 2;
        while (skusUsados.has(sku)) {
          sku = `${generarSKU(base, v.color || '', v.talla || '')}-${sufijo}`;
          sufijo++;
        }
        skusUsados.add(sku);
        return { ...v, sku };
      })
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
          {nuevaCategoria ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={nuevaCategoriaIcono}
                onChange={(e) => setNuevaCategoriaIcono(e.target.value)}
                placeholder="Ícono"
                maxLength={2}
                className="w-12 input-boutique text-center"
              />
              <input
                type="text"
                value={nuevaCategoriaNombre}
                onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), crearCategoria())}
                placeholder="Nombre"
                autoFocus
                className="flex-1 input-boutique"
              />
              <button
                type="button"
                onClick={crearCategoria}
                disabled={creandoCategoria}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#6DBF94] text-white disabled:opacity-50 flex-shrink-0"
              >
                <Check size={15} />
              </button>
              <button
                type="button"
                onClick={() => { setNuevaCategoria(false); setNuevaCategoriaNombre(''); setNuevaCategoriaIcono(''); }}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#E8D5A3] text-[#9E9E9E] flex-shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                required
                className="flex-1 input-boutique bg-white"
              >
                <option value="">Seleccionar...</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icono} {c.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setNuevaCategoria(true)}
                title="Nueva categoría"
                className="w-9 h-9 flex items-center justify-center rounded-xl border-2 border-[#E8D5A3] text-[#C9A84C] hover:border-[#C9A84C] transition-colors flex-shrink-0"
              >
                <Plus size={15} />
              </button>
            </div>
          )}
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
      <div className={`grid gap-3 ${puedeVerCosto ? 'grid-cols-3' : 'grid-cols-1'}`}>
        {puedeVerCosto && (
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
        )}
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
        {puedeVerCosto && (
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
        )}
      </div>
      {puedeVerCosto && costo > 0 && precioVenta > 0 && (
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
            {variantes.length > 1 && (
              <button
                type="button"
                onClick={copiarPrecioATodas}
                className="flex items-center gap-1 px-2.5 py-1 text-xs btn-boutique-secondary"
                title="Copiar el precio del producto a todas las variantes"
              >
                Copiar precio a todas
              </button>
            )}
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
                <th className="px-2.5 py-2 text-center text-xs font-medium text-[#2C2C2C]">Precio</th>
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
                  precioProducto={precioVenta}
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
