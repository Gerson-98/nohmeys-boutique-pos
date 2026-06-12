'use client';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { TrendingUp, DollarSign, BarChart2, RefreshCw, Download, ShieldAlert, Award } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatPrecio } from '@/lib/boutique';
import { useShopConfig } from '@/lib/useShopConfig';

interface Resumen {
  totalIngresos: number;
  totalCostos: number;
  gananciaBruta: number;
  margen: number;
}

interface SerieDia {
  label: string;
  ingresos: number;
  ganancia: number;
}

interface ProductoTop {
  productoId: string;
  nombre: string;
  cantidadVendida: number;
  ingresos: number;
  costos: number;
  ganancia: number;
}

export default function ReporteFinancieroPage() {
  const config = useShopConfig();
  const hoy = format(new Date(), 'yyyy-MM-dd');
  const hace30 = format(new Date(Date.now() - 29 * 86400000), 'yyyy-MM-dd');

  const [desde, setDesde] = useState(hace30);
  const [hasta, setHasta] = useState(hoy);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [serie, setSerie] = useState<SerieDia[]>([]);
  const [topProductos, setTopProductos] = useState<ProductoTop[]>([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [autorizado, setAutorizado] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setAutorizado(d.user?.rol === 'ADMIN'));
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/reportes/financiero?desde=${desde}&hasta=${hasta}`);
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error || 'No se pudo cargar el reporte financiero');
        return;
      }
      setResumen(d.data?.resumen ?? null);
      setSerie(d.data?.serie ?? []);
      setTopProductos(d.data?.topProductos ?? []);
    } catch {
      toast.error('Error de conexión al cargar el reporte');
    } finally {
      setCargando(false);
    }
  }, [desde, hasta]);

  useEffect(() => {
    if (autorizado) cargar();
  }, [autorizado, cargar]);

  async function descargarExcel() {
    setExportando(true);
    try {
      const xlsx = await import('xlsx');

      const filas = topProductos.map((p, i) => ({
        '#': i + 1,
        Producto: p.nombre,
        'Cantidad vendida': p.cantidadVendida,
        Ingresos: p.ingresos,
        Costos: p.costos,
        'Ganancia neta': p.ganancia,
      }));

      const resumenFilas = [
        { Concepto: 'Total ingresos', Monto: resumen?.totalIngresos ?? 0 },
        { Concepto: 'Total costos', Monto: resumen?.totalCostos ?? 0 },
        { Concepto: 'Ganancia bruta', Monto: resumen?.gananciaBruta ?? 0 },
        { Concepto: 'Margen de ganancia (%)', Monto: Number((resumen?.margen ?? 0).toFixed(2)) },
      ];

      const nombreComercial = config?.nombreComercial ?? "Nohemy's Boutique";

      const hojaResumen = xlsx.utils.aoa_to_sheet([
        [nombreComercial],
        [`Reporte financiero · Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
        [`Periodo: ${desde} al ${hasta}`],
        [],
      ]);
      xlsx.utils.sheet_add_json(hojaResumen, resumenFilas, { origin: -1 });

      const hojaTop = xlsx.utils.aoa_to_sheet([
        [nombreComercial],
        ['Top 10 productos más rentables'],
        [],
      ]);
      xlsx.utils.sheet_add_json(hojaTop, filas, { origin: -1 });

      const libro = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(libro, hojaResumen, 'Resumen');
      xlsx.utils.book_append_sheet(libro, hojaTop, 'Top productos');

      const fechaArchivo = format(new Date(), 'yyyy-MM-dd');
      xlsx.writeFile(libro, `Reporte_Financiero_Nohemys_${fechaArchivo}.xlsx`);
    } catch {
      toast.error('No se pudo generar el archivo Excel');
    } finally {
      setExportando(false);
    }
  }

  if (autorizado === null) {
    return (
      <div className="flex justify-center py-12">
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
          Esta sección está disponible solo para usuarios con rol Administrador.
        </p>
      </div>
    );
  }

  const maxValor = Math.max(...serie.flatMap((s) => [s.ingresos, s.ganancia]), 1);
  const maxGanancia = Math.max(...topProductos.map((p) => p.ganancia), 1);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">Reporte Financiero</h1>
          <p className="text-sm text-[#9E9E9E] mt-0.5">Ingresos, costos y rentabilidad (solo administrador)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="input-boutique text-sm" />
          <span className="text-[#9E9E9E] text-xs">al</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="input-boutique text-sm" />
          <button onClick={cargar} className="p-2 rounded-xl hover:bg-[#F8E1E7] transition-colors">
            <RefreshCw size={16} className="text-[#9E9E9E]" />
          </button>
          <button
            onClick={descargarExcel}
            disabled={exportando || cargando}
            className="btn-boutique-secondary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {exportando ? (
              <span className="w-4 h-4 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download size={15} />
            )}
            Descargar Excel
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
              { label: 'Ingresos', value: formatPrecio(resumen?.totalIngresos ?? 0), icon: <DollarSign size={16} className="text-[#C9A84C]" />, gold: true },
              { label: 'Costos', value: formatPrecio(resumen?.totalCostos ?? 0), icon: <BarChart2 size={16} className="text-[#E57373]" /> },
              { label: 'Ganancia bruta', value: formatPrecio(resumen?.gananciaBruta ?? 0), icon: <TrendingUp size={16} className="text-[#6DBF94]" /> },
              { label: 'Margen', value: `${(resumen?.margen ?? 0).toFixed(1)}%`, icon: <BarChart2 size={16} className="text-[#7EC8E3]" /> },
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

          {/* Gráfico ingresos vs ganancia */}
          {serie.length > 0 && (
            <div className="card-boutique p-5">
              <h2 className="font-playfair text-base font-semibold text-[#2C2C2C] mb-1 flex items-center gap-2">
                <TrendingUp size={16} className="text-[#C9A84C]" /> Ingresos vs ganancia
              </h2>
              <div className="flex items-center gap-4 mb-3 text-xs text-[#9E9E9E]">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#C9A84C] inline-block" /> Ingresos</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#6DBF94] inline-block" /> Ganancia</span>
              </div>
              <div className="flex items-end gap-2 h-32 overflow-x-auto pb-6 relative">
                {serie.map((s, i) => {
                  const pctIngresos = (s.ingresos / maxValor) * 100;
                  const pctGanancia = (Math.max(s.ganancia, 0) / maxValor) * 100;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: Math.max(20, Math.floor(500 / serie.length)) }}>
                      <div className="flex items-end gap-0.5 h-full w-full justify-center">
                        <div
                          className="w-2.5 rounded-t-sm bg-[#C9A84C] transition-all"
                          style={{ height: `${Math.max(pctIngresos, 2)}%` }}
                          title={`${s.label} · Ingresos: ${formatPrecio(s.ingresos)}`}
                        />
                        <div
                          className="w-2.5 rounded-t-sm bg-[#6DBF94] transition-all"
                          style={{ height: `${Math.max(pctGanancia, 2)}%` }}
                          title={`${s.label} · Ganancia: ${formatPrecio(s.ganancia)}`}
                        />
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

          {/* Top 10 productos más rentables */}
          <div className="card-boutique p-5">
            <h2 className="font-playfair text-base font-semibold text-[#2C2C2C] mb-4 flex items-center gap-2">
              <Award size={16} className="text-[#C9A84C]" /> Top 10 productos más rentables
            </h2>
            {topProductos.length === 0 ? (
              <p className="text-sm text-[#9E9E9E] text-center py-4">No hay datos para el rango seleccionado.</p>
            ) : (
              <div className="space-y-2">
                {topProductos.map((p, i) => {
                  const pct = (p.ganancia / maxGanancia) * 100;
                  return (
                    <div key={p.productoId} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[#9E9E9E] w-5 text-right flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm text-[#2C2C2C] truncate">{p.nombre}</span>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            <span className="text-xs font-mono text-[#9E9E9E]">{p.cantidadVendida} uds.</span>
                            <span className="text-xs font-mono font-bold text-[#6DBF94]">{formatPrecio(p.ganancia)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#F2C4CE] rounded-full overflow-hidden">
                          <div className="h-full bg-[#6DBF94] rounded-full transition-all" style={{ width: `${Math.max(pct, 0)}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
