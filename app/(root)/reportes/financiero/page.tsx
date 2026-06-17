'use client';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  TrendingUp, DollarSign, BarChart2, RefreshCw, Download,
  ShieldAlert, Award, Percent, AlertCircle, Filter,
} from 'lucide-react';
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

const PRESETS = [
  { label: 'Hoy',          id: 'hoy'         },
  { label: 'Esta semana',  id: 'semana'       },
  { label: 'Este mes',     id: 'mes'          },
  { label: 'Mes anterior', id: 'mesAnterior'  },
] as const;

type PresetId = typeof PRESETS[number]['id'];

// chart layout constants (h-32 = 128px outer; 24px reserved for date labels)
const CHART_TOTAL_H  = 128;
const CHART_LABEL_H  = 24;
const CHART_BARS_H   = CHART_TOTAL_H - CHART_LABEL_H;

export default function ReporteFinancieroPage() {
  const config = useShopConfig();
  const hoy    = format(new Date(), 'yyyy-MM-dd');
  const hace30 = format(new Date(Date.now() - 29 * 86400000), 'yyyy-MM-dd');

  const [desde,    setDesde]    = useState(hace30);
  const [hasta,    setHasta]    = useState(hoy);
  const [fechaError,  setFechaError]  = useState<string | null>(null);
  const [presetActivo, setPresetActivo] = useState<PresetId | null>(null);

  const [resumen,      setResumen]      = useState<Resumen | null>(null);
  const [serie,        setSerie]        = useState<SerieDia[]>([]);
  const [topProductos, setTopProductos] = useState<ProductoTop[]>([]);

  const [cargando,    setCargando]    = useState(true);
  const [errorCarga,  setErrorCarga]  = useState<string | null>(null);
  const [exportando,  setExportando]  = useState(false);
  const [autorizado,  setAutorizado]  = useState<boolean | null>(null);

  // Auth — P1: .catch prevents permanent spinner on network failure
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setAutorizado(d.user?.rol === 'ADMIN'))
      .catch(() => setAutorizado(false));
  }, []);

  const cargar = useCallback(async () => {
    if (desde && hasta && desde > hasta) {
      setFechaError('La fecha "Desde" no puede ser posterior a "Hasta"');
      setResumen(null); setSerie([]); setTopProductos([]);
      setCargando(false);
      return;
    }
    setFechaError(null);
    setErrorCarga(null);
    setResumen(null); setSerie([]); setTopProductos([]); // clear stale data before fetch
    setCargando(true);
    try {
      const res = await fetch(`/api/reportes/financiero?desde=${desde}&hasta=${hasta}`);
      if (!res.ok) {
        let d: any = {};
        try { d = await res.json(); } catch {}
        throw new Error(d.error ?? `Error ${res.status}`);
      }
      const d = await res.json();
      setResumen(d.data?.resumen ?? null);
      setSerie(d.data?.serie ?? []);
      setTopProductos(d.data?.topProductos ?? []);
    } catch (err: any) {
      setErrorCarga(err.message ?? 'No se pudo cargar el reporte financiero');
    } finally {
      setCargando(false);
    }
  }, [desde, hasta]);

  // 200ms debounce — prevents rapid API calls on date keyboard input
  useEffect(() => {
    if (!autorizado) return;
    const t = setTimeout(() => { cargar(); }, 200);
    return () => clearTimeout(t);
  }, [autorizado, cargar]);

  function aplicarPreset(id: PresetId) {
    const ahora   = new Date();
    const hoyStr  = format(ahora, 'yyyy-MM-dd');
    setPresetActivo(id);
    if (id === 'hoy') {
      setDesde(hoyStr); setHasta(hoyStr);
    } else if (id === 'semana') {
      const lunes = new Date(ahora);
      lunes.setDate(ahora.getDate() - ((ahora.getDay() + 6) % 7));
      setDesde(format(lunes, 'yyyy-MM-dd')); setHasta(hoyStr);
    } else if (id === 'mes') {
      setDesde(format(new Date(ahora.getFullYear(), ahora.getMonth(), 1), 'yyyy-MM-dd'));
      setHasta(hoyStr);
    } else if (id === 'mesAnterior') {
      setDesde(format(new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1), 'yyyy-MM-dd'));
      setHasta(format(new Date(ahora.getFullYear(), ahora.getMonth(), 0), 'yyyy-MM-dd'));
    }
  }

  async function descargarExcel() {
    if (!resumen) {
      toast.warn('No hay datos para exportar en el período seleccionado');
      return;
    }
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
        { Concepto: 'Total ingresos',          Monto: resumen.totalIngresos },
        { Concepto: 'Total costos',             Monto: resumen.totalCostos },
        { Concepto: 'Ganancia bruta',           Monto: resumen.gananciaBruta },
        { Concepto: 'Margen de ganancia (%)',   Monto: Number(resumen.margen.toFixed(2)) },
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

      xlsx.writeFile(libro, `Reporte_Financiero_Nohemys_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch {
      toast.error('No se pudo generar el archivo Excel');
    } finally {
      setExportando(false);
    }
  }

  // — Auth loading state —
  if (autorizado === null) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin motion-reduce:animate-none motion-reduce:opacity-50" />
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="max-w-md mx-auto mt-12 card-boutique p-6 text-center space-y-3">
        <ShieldAlert size={32} className="mx-auto text-boutique-danger" aria-hidden="true" />
        <h1 className="font-playfair text-xl font-bold text-boutique-dark">Acceso restringido</h1>
        <p className="text-sm text-boutique-gray-mid">
          Esta sección está disponible solo para usuarios con rol Administrador.
        </p>
      </div>
    );
  }

  // Computed chart bounds — abs() so negative-ganancia bars have correct height
  const maxValor    = Math.max(...serie.flatMap((s) => [s.ingresos, Math.abs(s.ganancia)]), 1);
  const maxGanancia = Math.max(...topProductos.map((p) => p.ganancia), 1);
  const hayGananciaNegativa = serie.some((s) => s.ganancia < 0);

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-boutique-dark">Reporte Financiero</h1>
          <p className="text-sm text-boutique-gray-mid mt-0.5">Ingresos, costos y rentabilidad (solo administrador)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargar}
            aria-label="Actualizar reporte financiero"
            className="p-2 rounded-xl hover:bg-blush-light transition-colors min-w-[44px] min-h-[44px]"
          >
            <RefreshCw size={16} className="text-boutique-gray-mid" />
          </button>
          <button
            onClick={descargarExcel}
            disabled={exportando || cargando || !resumen}
            aria-label="Descargar reporte como Excel"
            className="btn-boutique-secondary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {exportando
              ? <span className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
              : <Download size={15} aria-hidden="true" />
            }
            Descargar Excel
          </button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="card-boutique p-4 space-y-3">
        {/* Presets rápidos */}
        <div>
          <p className="text-[10px] font-medium text-boutique-gray-mid mb-1.5 flex items-center gap-1">
            <Filter size={11} aria-hidden="true" /> Período rápido
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => aplicarPreset(p.id)}
                className={`text-xs px-2.5 py-1 rounded-xl border transition-colors ${
                  presetActivo === p.id
                    ? 'border-gold bg-gold/10 text-gold font-medium'
                    : 'border-blush text-boutique-gray-mid hover:border-gold hover:text-gold'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date pickers — labeled for accessibility */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="fin-desde" className="block text-[10px] font-medium text-boutique-gray-mid mb-0.5">Desde</label>
            <input
              id="fin-desde"
              type="date"
              value={desde}
              onChange={(e) => { setDesde(e.target.value); setPresetActivo(null); }}
              className={`input-boutique text-sm ${fechaError ? 'border-boutique-danger focus:border-boutique-danger focus:ring-boutique-danger/30' : ''}`}
            />
          </div>
          <div>
            <label htmlFor="fin-hasta" className="block text-[10px] font-medium text-boutique-gray-mid mb-0.5">Hasta</label>
            <input
              id="fin-hasta"
              type="date"
              value={hasta}
              onChange={(e) => { setHasta(e.target.value); setPresetActivo(null); }}
              className={`input-boutique text-sm ${fechaError ? 'border-boutique-danger focus:border-boutique-danger focus:ring-boutique-danger/30' : ''}`}
            />
          </div>
        </div>

        {fechaError && (
          <p role="alert" className="text-xs text-boutique-danger flex items-center gap-1.5">
            <AlertCircle size={13} className="flex-shrink-0" /> {fechaError}
          </p>
        )}
      </div>

      {/* ── Contenido ── */}
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
      ) : (
        <>
          {/* KPIs — icons aria-hidden, Margen now uses Percent icon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Ingresos',       value: formatPrecio(resumen?.totalIngresos  ?? 0), icon: <DollarSign  size={16} className="text-gold" aria-hidden="true" />, gold: true },
              { label: 'Costos',         value: formatPrecio(resumen?.totalCostos    ?? 0), icon: <BarChart2   size={16} className="text-boutique-danger" aria-hidden="true" /> },
              { label: 'Ganancia bruta', value: formatPrecio(resumen?.gananciaBruta ?? 0), icon: <TrendingUp  size={16} className="text-boutique-success" aria-hidden="true" /> },
              { label: 'Margen',         value: `${(resumen?.margen ?? 0).toFixed(1)}%`,   icon: <Percent     size={16} className="text-boutique-info" aria-hidden="true" /> },
            ].map((k) => (
              <div key={k.label} className={`card-boutique p-4 ${k.gold ? 'bg-blush-light' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  {k.icon}
                  <span className="text-xs text-boutique-gray-mid">{k.label}</span>
                </div>
                <p className={`font-mono font-bold text-xl ${k.gold ? 'text-gold' : 'text-boutique-dark'}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* ── Bar chart: Ingresos vs Ganancia ── */}
          {serie.length > 0 && (
            <div className="card-boutique p-5">
              <h2 className="font-playfair text-base font-semibold text-boutique-dark mb-1 flex items-center gap-2">
                <TrendingUp size={16} className="text-gold" aria-hidden="true" /> Ingresos vs ganancia
              </h2>
              <div className="flex items-center gap-4 mb-3 text-xs text-boutique-gray-mid">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-gold inline-block" aria-hidden="true" /> Ingresos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-boutique-success inline-block" aria-hidden="true" /> Ganancia
                </span>
                {hayGananciaNegativa && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-boutique-danger inline-block" aria-hidden="true" /> Pérdida
                  </span>
                )}
              </div>

              {/*
                Chart structure: each column is a fixed-height flex container
                split into bars area (CHART_BARS_H) + label area (CHART_LABEL_H).
                No absolute positioning needed → labels can't overlap adjacent columns.
              */}
              <div
                role="img"
                aria-label={`Gráfico de ingresos y ganancia: ${serie.length} días en el período seleccionado`}
                className="flex gap-2 overflow-x-auto"
                style={{ height: CHART_TOTAL_H }}
              >
                {serie.map((s, i) => {
                  const colW        = Math.max(20, Math.floor(500 / serie.length));
                  const pctIngresos = (s.ingresos / maxValor) * 100;
                  const pctGanancia = (Math.abs(s.ganancia) / maxValor) * 100;
                  const gananciaColor = s.ganancia < 0 ? '#E57373' : '#6DBF94';
                  const showLabel = i % Math.ceil(serie.length / 10) === 0 || i === serie.length - 1;
                  return (
                    <div
                      key={i}
                      className="flex flex-col flex-shrink-0"
                      style={{ width: colW, height: CHART_TOTAL_H }}
                    >
                      {/* bars */}
                      <div
                        className="flex items-end gap-0.5 w-full justify-center"
                        style={{ height: CHART_BARS_H }}
                      >
                        <div
                          className="w-2.5 rounded-t-sm bg-gold transition-all"
                          style={{ height: `${Math.max(pctIngresos, 2)}%` }}
                          title={`${s.label} · Ingresos: ${formatPrecio(s.ingresos)}`}
                        />
                        <div
                          className="w-2.5 rounded-t-sm transition-all"
                          style={{ height: `${Math.max(pctGanancia, 2)}%`, backgroundColor: gananciaColor }}
                          title={`${s.label} · Ganancia: ${formatPrecio(s.ganancia)}`}
                        />
                      </div>
                      {/* label — in-flow, no absolute, contained within its column */}
                      <div
                        className="flex items-start justify-center overflow-hidden"
                        style={{ height: CHART_LABEL_H }}
                      >
                        {showLabel && (
                          <span className="text-[10px] text-boutique-gray-mid whitespace-nowrap leading-none pt-1 px-0.5">
                            {s.label.length > 5 ? s.label.slice(0, 5) : s.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Top 10 productos más rentables ── */}
          <div className="card-boutique p-5">
            <h2 className="font-playfair text-base font-semibold text-boutique-dark mb-4 flex items-center gap-2">
              <Award size={16} className="text-gold" aria-hidden="true" /> Top 10 productos más rentables
            </h2>
            {topProductos.length === 0 ? (
              <p className="text-sm text-boutique-gray-mid text-center py-4">No hay ventas registradas en el período seleccionado.</p>
            ) : (
              <div className="space-y-2">
                {topProductos.map((p, i) => {
                  const pct = (p.ganancia / maxGanancia) * 100;
                  return (
                    <div key={p.productoId} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-boutique-gray-mid w-5 text-right flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm text-boutique-dark truncate">{p.nombre}</span>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            <span className="text-xs font-mono text-boutique-gray-mid">{p.cantidadVendida} uds.</span>
                            <span className="text-xs font-mono font-bold text-boutique-success">{formatPrecio(p.ganancia)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-blush rounded-full overflow-hidden">
                          <div className="h-full bg-boutique-success rounded-full transition-all" style={{ width: `${Math.max(pct, 0)}%` }} />
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
