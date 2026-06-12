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

export default function HomePage() {
  const config = useShopConfig();
  const [data, setData] = useState<DashData | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await fetch('/api/dashboard');
      const d = await res.json();
      setData(d.data);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  if (cargando || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { kpis, alertasStock, serie7dias, topProductos, ultimasVentas } = data;
  const maxSerie = Math.max(...serie7dias.map((s) => s.ingresos), 1);
  const maxTop = Math.max(...topProductos.map((p) => p.cantidad), 1);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">
            Buenos días, <span className="text-[#C9A84C]">{config?.nombreComercial ?? "Nohemy's Boutique"}</span>
          </h1>
          <p className="text-sm text-[#9E9E9E] mt-0.5">
            {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <button onClick={cargar} className="p-2 rounded-xl hover:bg-[#F8E1E7] transition-colors">
          <RefreshCw size={16} className="text-[#9E9E9E]" />
        </button>
      </div>

      {/* Banner caja */}
      {kpis.cajaAbierta ? (
        <div className="card-boutique p-4 flex items-center justify-between bg-[#6DBF94]/10 border-[#6DBF94]">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-[#6DBF94]" />
            <div>
              <p className="text-sm font-semibold text-[#2C2C2C]">Caja abierta</p>
              <p className="text-xs text-[#9E9E9E]">
                Cajero: {kpis.cajaAbierta.cajero.nombre} · desde{' '}
                {isValid(new Date(kpis.cajaAbierta.abiertaEn))
                  ? format(new Date(kpis.cajaAbierta.abiertaEn), 'HH:mm', { locale: es })
                  : '—'}
              </p>
            </div>
          </div>
          <Link href="/caja" className="text-xs font-medium text-[#6DBF94] hover:underline flex items-center gap-1">
            Ver caja <ArrowRight size={12} />
          </Link>
        </div>
      ) : (
        <div className="card-boutique p-4 flex items-center justify-between bg-[#F5C842]/10 border-[#F5C842]">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-[#C9A84C]" />
            <div>
              <p className="text-sm font-semibold text-[#2C2C2C]">Caja cerrada</p>
              <p className="text-xs text-[#9E9E9E]">No podrás registrar ventas hasta abrir la caja.</p>
            </div>
          </div>
          <Link href="/caja" className="btn-boutique-primary text-xs px-3 py-1.5">
            Abrir caja
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Ingresos hoy',   value: formatPrecio(kpis.ingresoHoy),   sub: `${kpis.ventasHoy} venta${kpis.ventasHoy !== 1 ? 's' : ''}`,    icon: <DollarSign size={20} className="text-[#C9A84C]" />, cls: 'bg-gradient-to-br from-[#F8E1E7] to-[#FAFAFA] border-[#C9A84C]/40', valueCls: 'text-[#C9A84C]' },
          { label: 'Ingresos del mes', value: formatPrecio(kpis.ingresoMes), sub: `${kpis.ventasMes} transacciones`,                               icon: <TrendingUp size={20} className="text-[#6DBF94]" />, cls: 'bg-gradient-to-br from-[#6DBF94]/10 to-[#FAFAFA] border-[#6DBF94]/40', valueCls: 'text-[#2C2C2C]' },
          { label: 'Total clientes', value: kpis.totalClientes.toString(),   sub: 'clientes activos',                                               icon: <Users size={20} className="text-[#7EC8E3]" />, cls: 'bg-gradient-to-br from-[#7EC8E3]/10 to-[#FAFAFA] border-[#7EC8E3]/40', valueCls: 'text-[#2C2C2C]' },
          { label: 'Alertas stock',  value: alertasStock.length.toString(), sub: 'productos con stock bajo',                                        icon: <AlertTriangle size={20} className={alertasStock.length > 0 ? 'text-[#E57373]' : 'text-[#9E9E9E]'} />, cls: alertasStock.length > 0 ? 'bg-gradient-to-br from-[#E57373]/15 to-[#FAFAFA] border-[#E57373]/40' : 'bg-[#FAFAFA] border-[#F2C4CE]', valueCls: alertasStock.length > 0 ? 'text-[#E57373]' : 'text-[#2C2C2C]' },
        ].map((k) => (
          <div key={k.label} className={`card-boutique p-4 border ${k.cls}`}>
            <div className="flex items-center gap-2 mb-1">{k.icon}<span className="text-xs font-medium text-[#9E9E9E]">{k.label}</span></div>
            <p className={`font-mono font-bold text-2xl ${k.valueCls}`}>{k.value}</p>
            <p className="text-[10px] text-[#9E9E9E] mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Ingresos 7 días */}
        <div className="card-boutique p-5">
          <h2 className="font-playfair text-base font-semibold text-[#2C2C2C] mb-4">Ingresos — últimos 7 días</h2>
          <div className="flex items-end gap-2 h-28">
            {serie7dias.map((s, i) => {
              const pct = (s.ingresos / maxSerie) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-[#C9A84C] hover:bg-[#E8D5A3] transition-colors cursor-default relative group"
                    style={{ height: `${Math.max(pct, 3)}%` }}
                    title={`${s.label}: ${formatPrecio(s.ingresos)}`}
                  >
                    {s.ingresos > 0 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#2C2C2C] text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 z-10 pointer-events-none">
                        {formatPrecio(s.ingresos)}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-[#9E9E9E] capitalize">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 productos semana */}
        <div className="card-boutique p-5">
          <h2 className="font-playfair text-base font-semibold text-[#2C2C2C] mb-4">Top productos — esta semana</h2>
          {topProductos.length === 0 ? (
            <p className="text-sm text-[#9E9E9E] py-4 text-center">Sin ventas esta semana.</p>
          ) : (
            <div className="space-y-3">
              {topProductos.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#9E9E9E] w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-sm text-[#2C2C2C] truncate">{p.nombre}</span>
                      <span className="text-xs font-mono text-[#9E9E9E] ml-2">{p.cantidad} uds.</span>
                    </div>
                    <div className="h-1.5 bg-[#F2C4CE] rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9A84C] rounded-full" style={{ width: `${(p.cantidad / maxTop) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#C9A84C] flex-shrink-0">{formatPrecio(p.ingreso)}</span>
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
            <div className="flex items-center justify-between px-4 py-3 bg-[#E57373]/10 border-b border-[#E57373]/30">
              <h2 className="font-playfair text-base font-semibold text-[#2C2C2C] flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#E57373]" /> Stock bajo
              </h2>
              <Link href="/inventario/ajustes" className="text-xs text-[#C9A84C] hover:underline flex items-center gap-1">
                Ajustar <ArrowRight size={11} />
              </Link>
            </div>
            <div className="divide-y divide-[#F2C4CE] max-h-64 overflow-y-auto">
              {alertasStock.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm text-[#2C2C2C]">{a.producto.nombre}</p>
                    <p className="text-[10px] text-[#9E9E9E]">
                      {a.sku}{a.talla && ` · T${a.talla}`}{a.color && ` · ${a.color}`}
                      {' '}· Mínimo: {a.stockMinimo}
                    </p>
                  </div>
                  <span className={`font-mono font-bold text-sm ${a.stockActual === 0 ? 'text-[#E57373]' : 'text-[#F5C842]'}`}>
                    {a.stockActual === 0 ? 'AGOTADO' : `${a.stockActual} uds.`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Últimas ventas */}
        <div className={`card-boutique overflow-hidden ${alertasStock.length === 0 ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between px-4 py-3 bg-[#FAFAFA] border-b border-[#F2C4CE]">
            <h2 className="font-playfair text-base font-semibold text-[#2C2C2C] flex items-center gap-2">
              <Clock size={15} className="text-[#C9A84C]" /> Últimas ventas
            </h2>
            <Link href="/reportes/ventas" className="text-xs text-[#C9A84C] hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={11} />
            </Link>
          </div>
          {ultimasVentas.length === 0 ? (
            <p className="text-sm text-[#9E9E9E] py-6 text-center">Sin ventas registradas.</p>
          ) : (
            <div className="divide-y divide-[#F2C4CE]">
              {ultimasVentas.map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-[#F2C4CE] flex items-center justify-center flex-shrink-0">
                    <ShoppingBag size={14} className="text-[#C9A84C]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-bold text-[#2C2C2C]">{v.numeroTicket}</p>
                    <p className="text-[10px] text-[#9E9E9E]">
                      {v.cliente?.nombre ?? 'Cliente general'} · {v._count.detalles} prenda{v._count.detalles !== 1 ? 's' : ''}
                      {v.cajero && ` · ${v.cajero.nombre}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-mono font-bold text-[#C9A84C]">{formatPrecio(v.total)}</p>
                    <p className="text-[10px] text-[#9E9E9E]" title="Fecha y Hora">
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
