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
  marca: string | null;
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
  codigoBarras: '',
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
  const [marca, setMarca] = useState(productoInicial?.marca ?? '');
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
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Error al cargar categorías');
        setCategorias(Array.isArray(d.data) ? d.data : []);
      })
      .catch(() => toast.error('No se pudieron cargar las categorías. Intenta recargar la página.'));
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
    if (creandoCategoria) return;
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
        toast.error(data.error || 'No se pudo crear la categoría');
        return;
      }
      cargarCategorias();
      setCategoriaId(data.data.id);
      setNuevaCategoria(false);
      setNuevaCategoriaNombre('');
      setNuevaCategoriaIcono('');
      toast.success('Categoría creada correctamente');
    } catch {
      toast.error('Error de conexión al crear la categoría. Intenta de nuevo.');
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

  function buildSkuBase() {
    const catNombre = categorias.find((c) => c.id === categoriaId)?.nombre || '';
    const catCode = (catNombre.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ]/g, '').toUpperCase().substring(0, 3)) || 'CAT';
    // Usar la última palabra del nombre para diferenciar productos de la misma categoría
    const palabras = nombre.trim().split(/\s+/).filter((p) => p.length > 0);
    const palabraClave = palabras.length > 1 ? palabras[palabras.length - 1] : palabras[0] || 'PRD';
    const nameCode = (palabraClave.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/g, '').toUpperCase().substring(0, 4)) || 'PRD';
    return `${catCode}${nameCode}`;
  }

  function autoSKUVariante(index: number) {
    if (!nombre.trim()) return;
    const base = buildSkuBase();
    setVariantes((prev) => {
      const existingSkus = new Set(prev.map((v, i) => i !== index ? v.sku : '').filter(Boolean));
      const v = prev[index];
      let sku = generarSKU(base, v.color || '', v.talla || '');
      let sufijo = 2;
      while (existingSkus.has(sku)) { sku = `${generarSKU(base, v.color || '', v.talla || '')}-${sufijo}`; sufijo++; }
      const copia = [...prev];
      copia[index] = { ...copia[index], sku };
      return copia;
    });
  }

  async function autoGenerarSKUs() {
    if (!nombre.trim()) {
      toast.error('Ingrese el nombre del producto antes de generar los SKU');
      return;
    }
    const base = buildSkuBase();
    let skusEnBd = new Set<string>();
    try {
      const r = await fetch('/api/productos?limite=1000');
      const d = await r.json();
      if (d.data) {
        for (const p of d.data) {
          if (p.variantes) for (const v of p.variantes) skusEnBd.add(v.sku?.toUpperCase());
        }
      }
    } catch { /* continuar sin verificación remota */ }

    const skusUsados = new Set<string>(Array.from(skusEnBd));
    setVariantes((prev) =>
      prev.map((v) => {
        if (v.sku.trim()) { skusUsados.add(v.sku.trim().toUpperCase()); return v; }
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
    if (cargando) return;

    if (!nombre.trim() || nombre.trim().length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres');
      return;
    }
    if (!categoriaId) {
      toast.error('Debe seleccionar una categoría');
      return;
    }
    if (puedeVerCosto && precioVenta <= costo) {
      toast.error('El precio de venta debe ser mayor al costo');
      return;
    }

    // Auto-generar SKU para variantes que no tienen uno al guardar
    const base = buildSkuBase();
    // Consultar SKUs ya existentes en la BD para evitar colisiones
    let skusEnBd = new Set<string>();
    try {
      const r = await fetch('/api/productos?limite=1000');
      const d = await r.json();
      if (d.data) {
        for (const p of d.data) {
          if (p.variantes) for (const v of p.variantes) skusEnBd.add(v.sku?.toUpperCase());
        }
      }
    } catch { /* si falla, seguimos sin la verificación remota */ }

    const skusUsados = new Set<string>(Array.from(skusEnBd));
    const variantesFinales = variantes.map((v) => {
      if (v.sku.trim()) {
        skusUsados.add(v.sku.trim().toUpperCase());
        return v;
      }
      let sku = generarSKU(base, v.color || '', v.talla || '');
      let sufijo = 2;
      while (skusUsados.has(sku)) {
        sku = `${generarSKU(base, v.color || '', v.talla || '')}-${sufijo}`;
        sufijo++;
      }
      skusUsados.add(sku);
      return { ...v, sku };
    });
    setVariantes(variantesFinales);

    const variantesConDatos = variantesFinales;
    const skus = variantesConDatos.map((v) => v.sku.trim().toUpperCase());
    const skusDuplicados = Array.from(new Set(skus.filter((s, i) => skus.indexOf(s) !== i)));
    if (skusDuplicados.length > 0) {
      toast.error(`SKUs duplicados en la lista: ${skusDuplicados.join(', ')}`);
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
          nombre: nombre.trim(),
          descripcion,
          marca: marca.trim() || null,
          imagenUrl,
          categoriaId,
          costo,
          precioVenta,
          variantes: variantesConDatos,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error('Respuesta inesperada del servidor');
      }
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar el producto');

      toast.success(
        modo === 'crear' ? 'Producto creado exitosamente' : 'Producto actualizado'
      );
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error de conexión al guardar el producto');
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Imagen */}
      <div>
        <label className="block text-xs font-medium text-boutique-dark mb-1.5">
          Imagen del producto
        </label>
        <ImageUploader value={imagenUrl} onChange={setImagenUrl} />
      </div>

      {/* Datos básicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-boutique-dark mb-1">
            Nombre *
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Vestido floral manga corta"
            required
            minLength={2}
            maxLength={80}
            className="w-full input-boutique"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-boutique-dark mb-1">
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
                maxLength={40}
                autoFocus
                className="flex-1 input-boutique"
              />
              <button
                type="button"
                onClick={crearCategoria}
                disabled={creandoCategoria}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-boutique-success text-white disabled:opacity-50 flex-shrink-0"
              >
                <Check size={15} />
              </button>
              <button
                type="button"
                onClick={() => { setNuevaCategoria(false); setNuevaCategoriaNombre(''); setNuevaCategoriaIcono(''); }}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gold-light text-boutique-gray-mid flex-shrink-0"
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
                className="w-9 h-9 flex items-center justify-center rounded-xl border-2 border-gold-light text-gold hover:border-gold transition-colors flex-shrink-0"
              >
                <Plus size={15} />
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-boutique-dark mb-1">
            Descripción
          </label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Breve descripción"
            maxLength={200}
            className="w-full input-boutique"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-boutique-dark mb-1">
            Marca <span className="text-boutique-gray-mid font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            placeholder="Ej: Nike, Zara, Sin marca"
            maxLength={60}
            className="w-full input-boutique"
          />
        </div>
      </div>

      {/* Precios */}
      <div className={`grid gap-3 ${puedeVerCosto ? 'grid-cols-3' : 'grid-cols-1'}`}>
        {puedeVerCosto && (
          <div>
            <label className="block text-xs font-medium text-boutique-dark mb-1">Costo (Q) *</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={costo}
              onChange={(e) => setCosto(Math.max(0, parseFloat(e.target.value) || 0))}
              required
              className="w-full input-boutique font-mono text-center"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-boutique-dark mb-1">Precio venta (Q) *</label>
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={precioVenta}
            onChange={(e) => setPrecioVenta(Math.max(0, parseFloat(e.target.value) || 0))}
            required
            className="w-full input-boutique font-mono text-center"
          />
        </div>
        {puedeVerCosto && (
          <div>
            <label className="block text-xs font-medium text-boutique-dark mb-1">Margen</label>
            <div
              className={`input-boutique font-mono font-bold text-center ${
                margen < 0
                  ? 'text-boutique-danger'
                  : margen < 20
                  ? 'text-boutique-warning'
                  : 'text-boutique-success'
              }`}
            >
              {margen.toFixed(1)}%
            </div>
          </div>
        )}
      </div>
      {puedeVerCosto && costo > 0 && precioVenta > 0 && (
        <p className="text-xs text-boutique-gray-mid -mt-3">
          Ganancia por unidad:{' '}
          <span className="font-mono font-medium text-boutique-dark">
            {formatPrecio(precioVenta - costo)}
          </span>
        </p>
      )}

      {/* Variantes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-boutique-dark">
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

        <div className="max-h-[420px] overflow-y-auto space-y-2 pr-0.5">
          {variantes.length === 0 ? (
            <p className="text-center text-xs text-boutique-gray-mid py-5 border border-dashed border-blush rounded-xl">
              Sin variantes. Haz clic en &quot;Agregar&quot; para añadir.
            </p>
          ) : (
            variantes.map((v, i) => (
              <VarianteRow
                key={i}
                index={i}
                variante={v}
                precioProducto={precioVenta}
                onChange={handleVarianteChange}
                onRemove={(idx) => setVariantes((p) => p.filter((_, j) => j !== idx))}
                onAutoSku={autoSKUVariante}
              />
            ))
          )}
        </div>
      </div>

      {/* Botones */}
      <div className="flex items-center gap-3 justify-end pt-2 border-t border-blush">
        <button
          type="button"
          onClick={onCancel}
          disabled={cargando}
          className="px-4 py-2 text-sm text-boutique-gray-mid hover:text-boutique-dark transition-colors disabled:opacity-60"
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
