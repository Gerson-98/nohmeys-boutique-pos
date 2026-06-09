'use client';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { TrendingUp, ShoppingBag, DollarSign, BarChart2, RefreshCw } from 'lucide-react';
import { formatPrecio } from '@/lib/boutique';

interface Resumen {
  ingresoTotal: number;
  costoTotal: number;
  gananciaTotal: number;
  cantidadVentas: number;
}

interface SerieDia {
  label: string;
  ingresos: number;
}

interface ProductoTop {
  productoId: string;
  nombre: string;
  cantidadVendida: number;
  ingresoTotal: number;
}

export default function ReportesPage() {
  const hoy = format(new Date(), 'yyyy-MM-dd');
  const hace30 = format(new Date(Date.now() - 29 * 86400000), 'yyyy-MM-dd');

  const [desde, setDesde] = useState(hace30);
  const [hasta, setHasta] = useState(hoy);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [serie, setSerie] = useState<SerieDia[]>([]);
  const [topProductos, setTopProductos] = useState<ProductoTop[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [ingRes, prodRes] = await Promise.all([
        fetch(`/api/reportes/ingresos?desde=${desde}&hasta=${hasta}`).then((r) => r.json()),
        fetch(`/api/reportes/productos?desde=${desde}&hasta=${hasta}`).then((r) => r.json()),
      ]);
      setResumen(ingRes.data?.resumen ?? null);
      setSerie(ingRes.data?.serie ?? []);
      setTopProductos(prodRes.data ?? []);
    } finally {
      setCargando(false);
    }
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  // Simple sparkline heights
  const maxIngresos = Math.max(...serie.map((s) => s.ingresos), 1);

  const margen = resumen && resumen.ingresoTotal > 0
    ? ((resumen.gananciaTotal / resumen.ingresoTotal) * 100).toFixed(1)
    : '0.0';

  const maxCantidad = Math.max(...topProductos.map((p) => p.cantidadVendida), 1);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">Reportes</h1>
          <p className="text-sm text-[#9E9E9E] mt-0.5">Resumen financiero y análisis de ventas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="input-boutique text-sm" />
          <span className="text-[#9E9E9E] text-xs">al</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="input-boutique text-sm" />
          <button onClick={cargar} className="p-2 rounded-xl hover:bg-[#F8E1E7] transition-colors">
            <RefreshCw size={16} className="text-[#9E9E9E]" />
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Ingresos', value: formatPrecio(resumen?.ingresoTotal ?? 0), icon: <DollarSign size={16} className="text-[#C9A84C]" />, gold: true },
              { label: 'Ganancia bruta', value: formatPrecio(resumen?.gananciaTotal ?? 0), icon: <TrendingUp size={16} className="text-[#6DBF94]" /> },
              { label: 'Margen', value: `${margen}%`, icon: <BarChart2 size={16} className="text-[#7EC8E3]" /> },
              { label: 'Ventas', value: (resumen?.cantidadVentas ?? 0).toString(), icon: <ShoppingBag size={16} className="text-[#9E9E9E]" /> },
            ].map((k) => (
              <div key={k.label} className={`card-boutique p-4 ${k.gold ? 'bg-[#F8E1E7]' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  {k.icon}
                  <span className="text-xs text-[#9E9E9E]">{k.label}</span>
                </div>
                <p className={`font-mono font-bold text-xl ${k.gold ? 'text-[#C9A84C]' : 'text-[#2C2C2C]'}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Gráfico de ingresos (barras CSS) */}
          {serie.length > 0 && (
            <div className="card-boutique p-5">
              <h2 className="font-playfair text-base font-semibold text-[#2C2C2C] mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-[#C9A84C]" /> Ingresos diarios
              </h2>
              <div className="flex items-end gap-1 h-32 overflow-x-auto pb-6 relative">
                {serie.map((s, i) => {
                  const pct = (s.ingresos / maxIngresos) * 100;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: Math.max(14, Math.floor(400 / serie.length)) }}>
                      <div
                        className="w-full rounded-t-sm bg-[#C9A84C] transition-all hover:bg-[#E8D5A3] cursor-default group relative"
                        style={{ height: `${Math.max(pct, 2)}%` }}
                        title={`${s.label}: ${formatPrecio(s.ingresos)}`}
                      >
                        {s.ingresos > 0 && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#2C2C2C] text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {formatPrecio(s.ingresos)}
                          </div>
                        )}
                      </div>
                      {(i % Math.ceil(serie.length / 10) === 0 || i === serie.length - 1) && (
                        <span className="text-[8px] text-[#9E9E9E] absolute bottom-0 whitespace-nowrap">{s.label}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top productos */}
          {topProductos.length > 0 && (
            <div className="card-boutique p-5">
              <h2 className="font-playfair text-base font-semibold text-[#2C2C2C] mb-4 flex items-center gap-2">
                <ShoppingBag size={16} className="text-[#C9A84C]" /> Top 10 productos más vendidos
              </h2>
              <div className="space-y-2">
                {topProductos.map((p, i) => {
                  const pct = (p.cantidadVendida / maxCantidad) * 100;
                  return (
                    <div key={p.productoId} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[#9E9E9E] w-5 text-right flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm text-[#2C2C2C] truncate">{p.nombre}</span>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            <span className="text-xs font-mono text-[#9E9E9E]">{p.cantidadVendida} uds.</span>
                            <span className="text-xs font-mono font-bold text-[#C9A84C]">{formatPrecio(p.ingresoTotal)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#F2C4CE] rounded-full overflow-hidden">
                          <div className="h-full bg-[#C9A84C] rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Desglose de costos */}
          {resumen && (
            <div className="card-boutique p-5">
              <h2 className="font-playfair text-base font-semibold text-[#2C2C2C] mb-3 flex items-center gap-2">
                <DollarSign size={16} className="text-[#C9A84C]" /> Desglose financiero
              </h2>
              <div className="space-y-2">
                {[
                  { label: 'Ingresos brutos', value: resumen.ingresoTotal, cls: 'text-[#2C2C2C]' },
                  { label: 'Costo de ventas', value: -resumen.costoTotal, cls: 'text-[#E57373]' },
                  { label: 'Ganancia bruta', value: resumen.gananciaTotal, cls: 'text-[#6DBF94] font-bold' },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-[#F2C4CE] last:border-0">
                    <span className="text-sm text-[#9E9E9E]">{r.label}</span>
                    <span className={`font-mono text-sm ${r.cls}`}>
                      {r.value < 0 ? `-${formatPrecio(Math.abs(r.value))}` : formatPrecio(r.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
