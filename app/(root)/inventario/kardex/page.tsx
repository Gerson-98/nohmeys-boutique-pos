'use client';
import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Filter, ArrowUp, ArrowDown, RefreshCw, AlertCircle, X } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

interface Movimiento {
  id: string;
  tipo: string;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo: string | null;
  createdAt: string;
  variante: {
    sku: string;
    talla: string | null;
    color: string | null;
    producto: { nombre: string; imagenUrl: string | null };
  };
  usuario: { nombre: string } | null;
}

const TIPO_CONFIG: Record<string, { label: string; color: string; entrada: boolean }> = {
  INVENTARIO_INICIAL: { label: 'Inventario inicial', color: 'text-boutique-info', entrada: true },
  VENTA:              { label: 'Venta',               color: 'text-boutique-danger',  entrada: false },
  DEVOLUCION:         { label: 'Devolución',           color: 'text-boutique-success',  entrada: true },
  AJUSTE_ENTRADA:     { label: 'Ajuste entrada',       color: 'text-boutique-success',  entrada: true },
  AJUSTE_SALIDA:      { label: 'Ajuste salida',        color: 'text-boutique-danger',  entrada: false },
  CONTEO_FISICO:      { label: 'Conteo físico',        color: 'text-gold',  entrada: true },
};

export default function KardexPage() {
  const hoy = format(new Date(), 'yyyy-MM-dd');
  const hace30 = format(new Date(Date.now() - 29 * 86400000), 'yyyy-MM-dd');

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [fechaError, setFechaError] = useState<string | null>(null);
  const [desde, setDesde] = useState(hace30);
  const [hasta, setHasta] = useState(hoy);
  const [tipoFiltro, setTipoFiltro] = useState('');

  const cargar = useCallback(async () => {
    if (desde && hasta && desde > hasta) {
      setFechaError('La fecha "Desde" no puede ser posterior a "Hasta"');
      setMovimientos([]);
      setCargando(false);
      return;
    }
    setFechaError(null);
    setErrorCarga(null);
    setCargando(true);
    try {
      const p = new URLSearchParams({ desde, hasta, limite: '150' });
      if (tipoFiltro) p.set('tipo', tipoFiltro);
      const res = await fetch(`/api/inventario/kardex?${p}`);
      if (!res.ok) throw new Error(`Error ${res.status} al cargar movimientos`);
      const d = await res.json();
      setMovimientos(d.data ?? []);
    } catch (err: any) {
      setErrorCarga(err.message ?? 'No se pudieron cargar los movimientos');
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, tipoFiltro]);

  // 200 ms debounce — prevents rapid API calls on date keyboard input
  useEffect(() => {
    const t = setTimeout(() => { cargar(); }, 200);
    return () => clearTimeout(t);
  }, [cargar]);

  function limpiarFiltros() {
    setDesde(hace30);
    setHasta(hoy);
    setTipoFiltro('');
    setFechaError(null);
  }

  const filtrosActivos = desde !== hace30 || hasta !== hoy || tipoFiltro !== '';

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-boutique-dark">Kardex / Bitácora</h1>
          <p className="text-sm text-boutique-gray-mid mt-0.5">Historial completo de movimientos de inventario</p>
        </div>
        <button
          onClick={cargar}
          aria-label="Actualizar kardex"
          className="p-2 rounded-xl hover:bg-blush-light transition-colors min-w-[44px] min-h-[44px]"
        >
          <RefreshCw size={15} className="text-boutique-gray-mid" />
        </button>
      </div>

      {/* Filtros — reactive on change, no submit button needed */}
      <div className="card-boutique p-4 flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-1 text-boutique-gray-mid self-center">
          <Filter size={14} /><span className="text-xs font-medium">Filtros</span>
        </div>
        <div>
          <label htmlFor="kx-desde" className="block text-[10px] font-medium text-boutique-gray-mid mb-0.5">Desde</label>
          <input
            id="kx-desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className={`input-boutique text-sm ${fechaError ? 'border-boutique-danger focus:border-boutique-danger focus:ring-boutique-danger/30' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="kx-hasta" className="block text-[10px] font-medium text-boutique-gray-mid mb-0.5">Hasta</label>
          <input
            id="kx-hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className={`input-boutique text-sm ${fechaError ? 'border-boutique-danger focus:border-boutique-danger focus:ring-boutique-danger/30' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="kx-tipo" className="block text-[10px] font-medium text-boutique-gray-mid mb-0.5">Tipo</label>
          <select
            id="kx-tipo"
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="input-boutique text-sm"
          >
            <option value="">Todos</option>
            {Object.entries(TIPO_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        {filtrosActivos && (
          <button
            onClick={limpiarFiltros}
            aria-label="Limpiar filtros"
            className="flex items-center gap-1 text-xs text-boutique-gray-mid hover:text-boutique-danger transition-colors self-end mb-0.5"
          >
            <X size={13} /> Limpiar
          </button>
        )}
      </div>

      {fechaError && (
        <p role="alert" className="text-xs text-boutique-danger flex items-center gap-1.5 -mt-2 px-1">
          <AlertCircle size={13} className="flex-shrink-0" /> {fechaError}
        </p>
      )}

      {/* Resultados */}
      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin motion-reduce:animate-none motion-reduce:opacity-50" />
        </div>
      ) : errorCarga ? (
        <div className="flex flex-col items-center py-16 gap-3 text-center">
          <AlertCircle size={28} className="text-boutique-danger" />
          <p className="text-sm text-boutique-danger">{errorCarga}</p>
          <button onClick={cargar} className="btn-boutique-secondary text-xs px-3 py-1.5">Reintentar</button>
        </div>
      ) : movimientos.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <BookOpen size={32} className="text-gold-light mb-3" />
          <p className="text-sm font-medium text-boutique-dark mb-1">Sin movimientos en este período</p>
          <p className="text-xs text-boutique-gray-mid max-w-xs">
            Intenta ampliar el rango de fechas o seleccionar un tipo de movimiento diferente.
          </p>
          {filtrosActivos && (
            <button onClick={limpiarFiltros} className="mt-3 btn-boutique-secondary text-xs px-3 py-1.5">
              Ver últimos 30 días
            </button>
          )}
        </div>
      ) : (
        <div className="card-boutique overflow-hidden">
          {/* Header — desktop only */}
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2.5 bg-boutique-white border-b border-blush text-[10px] font-medium text-boutique-gray-mid uppercase tracking-wide">
            <span>Producto</span>
            <span>Tipo</span>
            <span className="text-center">Cant.</span>
            <span className="text-center">Anterior</span>
            <span className="text-center">Nuevo</span>
            <span>Usuario</span>
            <span className="text-right">Fecha</span>
          </div>

          <div className="divide-y divide-blush">
            {movimientos.map((m) => {
              const cfg = TIPO_CONFIG[m.tipo] ?? { label: m.tipo, color: 'text-boutique-gray-mid', entrada: true };
              const fecha = isValid(new Date(m.createdAt))
                ? format(new Date(m.createdAt), 'dd/MM/yy HH:mm', { locale: es })
                : '—';

              return (
                <div key={m.id} className="hover:bg-boutique-white transition-colors">
                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-x-3 px-4 py-3 items-center">
                    <div className="min-w-0">
                      <p className="text-sm text-boutique-dark truncate">{m.variante.producto.nombre}</p>
                      <p className="text-xs text-[#616161] truncate">
                        {m.variante.sku}
                        {m.variante.talla && ` · T${m.variante.talla}`}
                        {m.variante.color && ` · ${m.variante.color}`}
                        {m.motivo && ` · ${m.motivo}`}
                      </p>
                    </div>
                    <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    <div className="flex items-center gap-1 justify-center">
                      {cfg.entrada
                        ? <ArrowUp size={12} className="text-boutique-success" />
                        : <ArrowDown size={12} className="text-boutique-danger" />
                      }
                      <span className={`font-mono text-sm font-bold ${cfg.color}`}>{m.cantidad}</span>
                    </div>
                    <p className="font-mono text-sm text-center text-boutique-gray-mid">{m.stockAnterior}</p>
                    <p className="font-mono text-sm text-center font-bold text-boutique-dark">{m.stockNuevo}</p>
                    <p className="text-xs text-[#616161] truncate">{m.usuario?.nombre ?? 'Sistema'}</p>
                    <p className="text-[10px] text-boutique-gray-mid text-right">{fecha}</p>
                  </div>

                  {/* Mobile card — labeled inline */}
                  <div className="sm:hidden px-4 py-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-boutique-dark truncate">{m.variante.producto.nombre}</p>
                        <p className="text-xs text-[#616161] truncate">
                          {m.variante.sku}
                          {m.variante.talla && ` · T${m.variante.talla}`}
                          {m.variante.color && ` · ${m.variante.color}`}
                        </p>
                      </div>
                      <span className={`text-xs font-medium flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {cfg.entrada
                          ? <ArrowUp size={12} className="text-boutique-success" />
                          : <ArrowDown size={12} className="text-boutique-danger" />
                        }
                        <span className={`font-mono text-sm font-bold ${cfg.color}`}>{m.cantidad} uds.</span>
                      </div>
                      {/* Stock anterior → nuevo with explicit labels */}
                      <div className="flex items-center gap-1 font-mono text-xs text-boutique-gray-mid">
                        <span>
                          <span className="text-[10px] text-boutique-gray-mid font-sans mr-0.5">antes</span>
                          {m.stockAnterior}
                        </span>
                        <span>→</span>
                        <span className="font-bold text-boutique-dark">
                          {m.stockNuevo}
                          <span className="text-[10px] text-boutique-gray-mid font-sans ml-0.5">ahora</span>
                        </span>
                      </div>
                    </div>

                    {m.motivo && (
                      <p className="text-xs text-[#616161] truncate">{m.motivo}</p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-boutique-gray-mid">
                      <span>{m.usuario?.nombre ?? 'Sistema'}</span>
                      <span>{fecha}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer — count + 150-cap disclosure */}
          <div className="px-4 py-2.5 bg-boutique-white border-t border-blush text-xs text-boutique-gray-mid">
            {movimientos.length >= 150 ? (
              <span>
                Mostrando los primeros 150 movimientos ·{' '}
                <span className="text-gold">Reduce el rango de fechas para ver un período más preciso</span>
              </span>
            ) : (
              <span className="float-right">
                {movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
