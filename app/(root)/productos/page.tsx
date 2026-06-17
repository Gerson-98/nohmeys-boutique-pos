'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Package, Settings2, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { CategoriasModal } from './components/CategoriasModal';

interface Variante {
  id: string;
  sku: string;
  talla: string | null;
  color: string | null;
  colorHex: string | null;
  stockActual: number;
  stockMinimo: number;
}

interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  categoria: { id: string; nombre: string; icono: string | null };
  costo: number;
  precioVenta: number;
  isActive: boolean;
  variantes: Variante[];
  stockTotal: number;
}

interface Categoria {
  id: string;
  nombre: string;
  icono: string | null;
}

const FILTROS_STOCK = [
  { value: 'todos', label: 'Todo el stock' },
  { value: 'bajo', label: 'Stock bajo' },
  { value: 'agotado', label: 'Agotado' },
];

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [rol, setRol] = useState<string | null>(null);

  const [errorProductos, setErrorProductos] = useState(false);

  const [buscar, setBuscar] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [filtroStock, setFiltroStock] = useState('todos');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [categoriasModalOpen, setCategoriasModalOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargarProductos = useCallback(
    async (busqueda: string, catId: string, stock: string) => {
      setCargando(true);
      try {
        const params = new URLSearchParams();
        if (busqueda) params.set('buscar', busqueda);
        if (catId) params.set('categoriaId', catId);
        if (stock !== 'todos') params.set('stock', stock);

        const res = await fetch(`/api/productos?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setProductos(data.data ?? []);
        setErrorProductos(false);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error desconocido';
        toast.error('Error al cargar productos: ' + msg);
        setErrorProductos(true);
      } finally {
        setCargando(false);
      }
    },
    []
  );

  const cargarCategorias = useCallback(() => {
    fetch('/api/categorias')
      .then((r) => r.json())
      .then((d) => setCategorias(d.data ?? []))
      .catch(() => toast.error('No se pudieron cargar las categorías'));
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setRol(d.user?.rol ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      cargarProductos(buscar, categoriaSeleccionada, filtroStock);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [buscar, categoriaSeleccionada, filtroStock, cargarProductos]);

  function abrirCrear() {
    setEditandoId(null);
    setModalOpen(true);
  }

  function abrirEditar(id: string) {
    setEditandoId(id);
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
    setEditandoId(null);
  }

  function handleModalSuccess() {
    cerrarModal();
    cargarProductos(buscar, categoriaSeleccionada, filtroStock);
  }

  function handleToggle(id: string, nuevoEstado: boolean) {
    setProductos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: nuevoEstado } : p))
    );
  }

  // El rol CAJERO no puede crear ni editar productos
  const puedeGestionarProductos = rol === 'ADMIN' || rol === 'SUPERVISOR';

  return (
    <>
      <div className="space-y-5">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-playfair text-2xl font-bold text-boutique-dark">Productos</h1>
            <p className="text-sm text-boutique-gray-mid mt-0.5">
              {productos.length} producto{productos.length !== 1 ? 's' : ''} encontrado
              {productos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setCategoriasModalOpen(true)}
              className="btn-boutique-secondary flex items-center gap-2"
            >
              <Settings2 size={16} />
              Categorías
            </button>
            {puedeGestionarProductos && (
              <button
                onClick={abrirCrear}
                className="btn-boutique-primary flex items-center gap-2"
              >
                <Plus size={16} />
                Nuevo producto
              </button>
            )}
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-boutique-gray-mid" />
          <input
            type="text"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por nombre, SKU, categoría, color..."
            className="w-full input-boutique pl-9"
          />
        </div>

        {/* Filtros de categoría */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCategoriaSeleccionada('')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              categoriaSeleccionada === ''
                ? 'bg-gold text-white'
                : 'bg-white border border-gold-light text-boutique-dark hover:bg-blush-light'
            }`}
          >
            Todas
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoriaSeleccionada(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                categoriaSeleccionada === cat.id
                  ? 'bg-gold text-white'
                  : 'bg-white border border-gold-light text-boutique-dark hover:bg-blush-light'
              }`}
            >
              {cat.icono && <span className="mr-1">{cat.icono}</span>}
              {cat.nombre}
            </button>
          ))}
        </div>

        {/* Filtros de stock */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTROS_STOCK.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltroStock(f.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filtroStock === f.value
                  ? 'bg-blush text-gold border border-gold'
                  : 'bg-white border border-gold-light text-boutique-dark hover:bg-blush-light'
              }`}
            >
              {f.label}
            </button>
          ))}
          {(buscar || categoriaSeleccionada || filtroStock !== 'todos') && (
            <button
              onClick={() => { setBuscar(''); setCategoriaSeleccionada(''); setFiltroStock('todos'); }}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-boutique-gray-mid hover:text-boutique-dark border border-transparent hover:border-gold-light transition-colors"
            >
              <X size={11} /> Limpiar filtros
            </button>
          )}
        </div>

        {/* Grid de productos */}
        {cargando ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card-boutique animate-pulse h-72" />
            ))}
          </div>
        ) : errorProductos ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertTriangle size={28} className="text-boutique-danger mb-3" />
            <p className="text-sm font-semibold text-boutique-dark mb-1">No pudimos cargar los productos</p>
            <p className="text-xs text-[#757575] mb-4">Verifica tu conexión e intenta de nuevo.</p>
            <button
              onClick={() => cargarProductos(buscar, categoriaSeleccionada, filtroStock)}
              className="btn-boutique-primary text-sm px-4 py-2 flex items-center gap-2"
            >
              <RefreshCw size={14} /> Reintentar
            </button>
          </div>
        ) : productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-blush-light flex items-center justify-center mb-4">
              <Package size={28} className="text-blush-dark" />
            </div>
            <h3 className="font-playfair text-lg font-semibold text-boutique-dark mb-1">
              Sin productos
            </h3>
            <p className="text-sm text-boutique-gray-mid mb-4">
              {buscar || categoriaSeleccionada || filtroStock !== 'todos'
                ? 'No hay resultados para tu búsqueda.'
                : 'Aún no hay productos. Crea el primero.'}
            </p>
            {!buscar && !categoriaSeleccionada && filtroStock === 'todos' && puedeGestionarProductos && (
              <button onClick={abrirCrear} className="btn-boutique-primary flex items-center gap-2">
                <Plus size={14} />
                Crear primer producto
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {productos.map((p) => (
              <ProductCard
                key={p.id}
                {...p}
                onToggle={handleToggle}
                onEdit={abrirEditar}
                puedeEditar={puedeGestionarProductos}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal crear / editar */}
      <ProductModal
        open={modalOpen}
        onClose={cerrarModal}
        onSuccess={handleModalSuccess}
        productoId={editandoId}
      />

      {/* Modal gestión de categorías */}
      <CategoriasModal
        open={categoriasModalOpen}
        onClose={() => setCategoriasModalOpen(false)}
        onChange={() => {
          cargarCategorias();
          cargarProductos(buscar, categoriaSeleccionada, filtroStock);
        }}
      />
    </>
  );
}
