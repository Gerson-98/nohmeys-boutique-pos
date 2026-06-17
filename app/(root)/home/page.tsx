'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign, ShoppingBag, Users, TrendingUp,
  AlertTriangle, CheckCircle, RefreshCw, ArrowRight, Clock,
} from 'lucide-react';
import { formatPrecio } from '@/lib/boutique';
import { useShopConfig } from '@/lib/useShopConfig';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-toastify';

interface Kpis {
  ingresoHoy: number;
  ventasHoy: number;
  ingresoMes: number;
  ventasMes: number;
  totalClientes: number;
  cajaAbierta: { id: string; cajero: { nombre: string }; abiertaEn: string } | null;
}
interface AlertaStock {
  id: string; sku: string; talla: string | null; color: string | null;
  stockActual: number; stockMinimo: number;
  producto: { nombre: string; imagenUrl: string | null };
}
interface SerieDia { label: string; ingresos: number }
interface TopProducto { nombre: string; cantidad: number; ingreso: number }
interface UltimaVenta {
  id: string; numeroTicket: string; total: number; metodoPago: string; createdAt: string;
  cajero: { nombre: string } | null; cliente: { nombre: string } | null;
  _count: { detalles: number };
}

interface DashData {
  kpis: Kpis;
  alertasStock: AlertaStock[];
  serie7dias: SerieDia[];
  topProductos: TopProducto[];
  ultimasVentas: UltimaVenta[];
}

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transf.', MIXTO: 'Mixto', VALE_CREDITO: 'Vale',
};

function getSaludo() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-lg animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/50" />
          <div className="h-4 w-44 rounded animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/35" />
        </div>
        <div className="w-10 h-10 rounded-xl animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/35" />
      </div>
      {/* Caja banner */}
      <div className="card-boutique h-[60px] animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/20" />
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card-boutique p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/50 flex-shrink-0" />
              <div className="h-3 flex-1 rounded animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/35" />
            </div>
            <div className="h-8 w-28 rounded animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/50 mt-1" />
            <div className="h-2.5 w-20 rounded animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/35 mt-1.5" />
          </div>
        ))}
      </div>
      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card-boutique p-5">
          <div className="h-4 w-44 rounded animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/50 mb-4" />
          <div className="h-28 rounded animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/25" />
        </div>
        <div className="card-boutique p-5">
          <div className="h-4 w-44 rounded animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/50 mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-4 h-3 rounded animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/35 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3.5 rounded animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/50" />
                  <div className="h-1.5 rounded-full animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/35" />
                </div>
                <div className="w-16 h-3.5 rounded animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/35 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Lists row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {[...Array(2)].map((_, col) => (
          <div key={col} className="card-boutique overflow-hidden">
            <div className="px-4 py-3 border-b border-blush animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/20 h-[49px]" />
            {[...Array(3)].map((_, row) => (
              <div key={row} className="flex items-center gap-3 px-4 py-3 border-b border-blush/50 last:border-0">
                <div className="w-8 h-8 rounded-full animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/40 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 rounded animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/50" />
                  <div className="h-2.5 w-36 rounded animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/35" />
                </div>
                <div className="w-16 h-4 rounded animate-pulse motion-reduce:animate-none motion-reduce:opacity-50 bg-blush/40 flex-shrink-0" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const config = useShopConfig();
  const [data, setData] = useState<DashData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(false);

  const cargar = async (isRefresh = false, signal?: AbortSignal) => {
    if (isRefresh) setRefrescando(true); else setCargando(true);
    try {
      const res = await fetch('/api/dashboard', signal ? { signal } : undefined);
      if (!res.ok) throw new Error('No se pudo cargar el panel');
      const d = await res.json();
      setData(d.data);
      setError(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (isRefresh) {
        toast.error('No se pudo actualizar el panel. Intenta de nuevo.');
      } else {
        setError(true);
      }
    } finally {
      if (isRefresh) setRefrescando(false); else setCargando(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    cargar(false, controller.signal);
    return () => controller.abort();
  }, []);

  if (cargando) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center px-4">
        <AlertTriangle size={32} className="text-boutique-danger" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-boutique-dark">No pudimos cargar el panel</p>
          <p className="text-xs text-[#757575] mt-1">Verifica tu conexión e intenta de nuevo.</p>
        </div>
        <button onClick={() => cargar()} className="btn-boutique-primary text-sm px-4 py-2 flex items-center gap-2">
          <RefreshCw size={14} aria-hidden="true" /> Reintentar
        </button>
      </div>
    );
  }

  const { kpis, alertasStock, serie7dias, topProductos, ultimasVentas } = data;
  const maxSerie = Math.max(...serie7dias.map((s) => s.ingresos), 1);
  const maxTop = Math.max(...topProductos.map((p) => p.cantidad), 1);
  const totalSerie7dias = serie7dias.reduce((sum, s) => sum + s.ingresos, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-boutique-dark">
            {getSaludo()}, <span className="text-gold">{config?.nombreComercial ?? "Nohemy's Boutique"}</span>
          </h1>
          <p className="text-sm text-[#757575] mt-0.5">
            {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <button
          onClick={() => cargar(true)}
          disabled={refrescando}
          aria-label="Actualizar panel"
          title="Actualizar panel"
          className="p-3 rounded-xl hover:bg-blush-light transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px]"
        >
          <RefreshCw size={16} className={`text-[#757575] ${refrescando ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {/* Banner caja */}
      {kpis.cajaAbierta ? (
        <div className="card-boutique p-4 flex items-center justify-between bg-boutique-success/10 border-boutique-success">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-boutique-success" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-boutique-dark">Caja abierta</p>
              <p className="text-xs text-[#757575]">
                Cajero: {kpis.cajaAbierta.cajero.nombre} · desde{' '}
                {isValid(new Date(kpis.cajaAbierta.abiertaEn))
                  ? format(new Date(kpis.cajaAbierta.abiertaEn), 'HH:mm', { locale: es })
                  : '—'}
              </p>
            </div>
          </div>
          <Link href="/caja" className="text-xs font-medium text-boutique-success hover:underline flex items-center gap-1">
            Ver caja <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="card-boutique p-5 flex items-center justify-between gap-4 bg-boutique-warning/10 border-2 border-boutique-warning">
          <div className="flex items-center gap-3">
            <AlertTriangle size={28} className="text-boutique-warning flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-base font-bold text-boutique-dark">Caja cerrada</p>
              <p className="text-xs text-[#757575]">No podrás registrar ventas hasta abrir la caja.</p>
            </div>
          </div>
          <Link href="/caja" className="btn-boutique-primary text-sm px-4 py-2 flex-shrink-0">
            Abrir caja
          </Link>
        </div>
      )}

      {/* Quickstart cajero: visible solo cuando la caja está abierta */}
      {kpis.cajaAbierta && (
        <div className="card-boutique py-3 px-4 flex items-center justify-between gap-4">
          <span className="text-sm text-[#757575]">Punto de venta</span>
          <Link
            href="/pos"
            className="btn-boutique-primary text-sm px-4 py-2 flex items-center gap-1.5 flex-shrink-0"
          >
            Registrar venta <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Ingresos hoy',     value: formatPrecio(kpis.ingresoHoy),              sub: `${kpis.ventasHoy} venta${kpis.ventasHoy !== 1 ? 's' : ''}`, icon: <DollarSign size={20} className="text-gold" aria-hidden="true" />,                                                     valueCls: 'text-gold', extraCls: '' },
          { label: 'Ingresos del mes', value: formatPrecio(kpis.ingresoMes),              sub: `${kpis.ventasMes} transacciones`,                             icon: <TrendingUp size={20} className="text-boutique-success" aria-hidden="true" />,                                                     valueCls: 'text-boutique-dark', extraCls: '' },
          { label: 'Total clientes',   value: kpis.totalClientes.toLocaleString('es-GT'), sub: 'clientes activos',                                            icon: <Users size={20} className="text-boutique-info" aria-hidden="true" />,                                                         valueCls: 'text-boutique-dark', extraCls: '' },
          { label: 'Alertas stock',    value: alertasStock.length.toString(),             sub: 'productos con stock bajo',                                    icon: <AlertTriangle size={20} className={alertasStock.length > 0 ? 'text-boutique-danger' : 'text-boutique-gray-mid'} aria-hidden="true" />, valueCls: alertasStock.length > 0 ? 'text-boutique-danger' : 'text-boutique-dark', extraCls: alertasStock.length > 0 ? 'bg-boutique-danger/5 !border-boutique-danger/40' : '' },
        ].map((k) => (
          <div key={k.label} className={`card-boutique p-4 ${k.extraCls}`}>
            <div className="flex items-center gap-2 mb-1">{k.icon}<span className="text-xs font-medium text-[#757575]">{k.label}</span></div>
            <p className={`font-mono font-bold text-2xl ${k.valueCls}`}>{k.value}</p>
            <p className="text-[10px] text-[#757575] mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Ingresos 7 días */}
        <div className="card-boutique p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-playfair text-sm font-semibold text-boutique-dark">Ingresos — últimos 7 días</h2>
            <span className="font-mono font-bold text-sm text-gold" title="Total 7 días">{formatPrecio(totalSerie7dias)}</span>
          </div>
          <div role="img" aria-label="Gráfico de barras: ingresos de los últimos 7 días" className="flex items-end gap-2 h-28">
            {serie7dias.map((s, i) => {
              const pct = (s.ingresos / maxSerie) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" aria-hidden="true">
                  <div
                    className="w-full rounded-t-md bg-gold hover:bg-gold-light transition-colors cursor-default relative group"
                    style={{ height: `${Math.max(pct, 3)}%` }}
                    title={`${s.label}: ${formatPrecio(s.ingresos)}`}
                  >
                    {s.ingresos > 0 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-boutique-dark text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 z-10 pointer-events-none">
                        {formatPrecio(s.ingresos)}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-[#757575] capitalize">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 productos semana */}
        <div className="card-boutique p-5">
          <h2 className="font-playfair text-sm font-semibold text-boutique-dark mb-4">Top productos — esta semana</h2>
          {topProductos.length === 0 ? (
            <p className="text-sm text-[#757575] py-4 text-center">Sin ventas esta semana.</p>
          ) : (
            <div className="space-y-3">
              {topProductos.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#757575] w-4 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-sm text-boutique-dark truncate">{p.nombre}</span>
                      <span className="text-xs font-mono text-[#757575] ml-2 flex-shrink-0">{p.cantidad} uds.</span>
                    </div>
                    <div className="h-1.5 bg-blush rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${(p.cantidad / maxTop) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-gold flex-shrink-0">{formatPrecio(p.ingreso)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Alertas de stock bajo */}
        {alertasStock.length > 0 && (
          <div className="card-boutique overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-boutique-danger/10 border-b border-boutique-danger/30">
              <h2 className="font-playfair text-base font-semibold text-boutique-dark flex items-center gap-2">
                <AlertTriangle size={16} className="text-boutique-danger" aria-hidden="true" /> Stock bajo
              </h2>
              <Link href="/inventario/ajustes" className="text-xs text-gold hover:underline flex items-center gap-1">
                Ajustar <ArrowRight size={11} aria-hidden="true" />
              </Link>
            </div>
            <div className="divide-y divide-blush max-h-64 overflow-y-auto">
              {alertasStock.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-boutique-dark truncate">{a.producto.nombre}</p>
                    <p className="text-[10px] text-[#757575] truncate">
                      {a.sku}{a.talla && ` · T${a.talla}`}{a.color && ` · ${a.color}`}
                      {' '}· Mínimo: {a.stockMinimo}
                    </p>
                  </div>
                  <span className={`font-mono font-bold text-sm flex-shrink-0 ${a.stockActual === 0 ? 'text-boutique-danger' : 'text-boutique-warning'}`}>
                    {a.stockActual === 0 ? 'AGOTADO' : `${a.stockActual} uds.`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Últimas ventas */}
        <div className={`card-boutique overflow-hidden ${alertasStock.length === 0 ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between px-4 py-3 bg-boutique-white border-b border-blush">
            <h2 className="font-playfair text-sm font-semibold text-boutique-dark flex items-center gap-2">
              <Clock size={15} className="text-gold" aria-hidden="true" /> Últimas ventas
            </h2>
            <Link href="/reportes/ventas" className="text-xs text-gold hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={11} aria-hidden="true" />
            </Link>
          </div>
          {ultimasVentas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <p className="text-sm text-[#757575]">Sin ventas registradas todavía.</p>
              <Link href="/pos" className="text-xs font-medium text-gold hover:underline flex items-center gap-1">
                Registrar la primera venta <ArrowRight size={11} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-blush">
              {ultimasVentas.map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-blush flex items-center justify-center flex-shrink-0">
                    <ShoppingBag size={14} className="text-gold" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-bold text-boutique-dark">{v.numeroTicket}</p>
                    <p className="text-[10px] text-[#757575] truncate">
                      {v.cliente?.nombre ?? 'Cliente general'} · {v._count.detalles} prenda{v._count.detalles !== 1 ? 's' : ''}
                      {' · '}{METODO_LABEL[v.metodoPago] ?? v.metodoPago}
                      {v.cajero && ` · ${v.cajero.nombre}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-mono font-bold text-gold">{formatPrecio(v.total)}</p>
                    <p className="text-[10px] text-[#757575]" title="Fecha y Hora">
                      {isValid(new Date(v.createdAt)) ? format(new Date(v.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }) : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
