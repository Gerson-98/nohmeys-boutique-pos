'use client';
import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Filter, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
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
}

const TIPO_CONFIG: Record<string, { label: string; color: string; entrada: boolean }> = {
  INVENTARIO_INICIAL: { label: 'Inventario inicial', color: 'text-[#7EC8E3]', entrada: true },
  VENTA:             { label: 'Venta',               color: 'text-[#E57373]',  entrada: false },
  DEVOLUCION:        { label: 'Devolución',           color: 'text-[#6DBF94]',  entrada: true },
  AJUSTE_ENTRADA:    { label: 'Ajuste entrada',       color: 'text-[#6DBF94]',  entrada: true },
  AJUSTE_SALIDA:     { label: 'Ajuste salida',        color: 'text-[#E57373]',  entrada: false },
  CONTEO_FISICO:     { label: 'Conteo físico',        color: 'text-[#C9A84C]',  entrada: true },
};

const TIPOS = ['', ...Object.keys(TIPO_CONFIG)];

export default function KardexPage() {
  const hoy = format(new Date(), 'yyyy-MM-dd');
  const hace30 = format(new Date(Date.now() - 29 * 86400000), 'yyyy-MM-dd');

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [desde, setDesde] = useState(hace30);
  const [hasta, setHasta] = useState(hoy);
  const [tipoFiltro, setTipoFiltro] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const p = new URLSearchParams({ desde, hasta, limite: '150' });
      if (tipoFiltro) p.set('tipo', tipoFiltro);
      const res = await fetch(`/api/inventario/kardex?${p}`);
      const d = await res.json();
      setMovimientos(d.data ?? []);
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, tipoFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">Kardex / Bitácora</h1>
          <p className="text-sm text-[#9E9E9E] mt-0.5">Historial completo de movimientos de inventario</p>
        </div>
        <button onClick={cargar} className="p-2 rounded-xl hover:bg-[#F8E1E7] transition-colors">
          <RefreshCw size={15} className="text-[#9E9E9E]" />
        </button>
      </div>

      {/* Filtros */}
      <div className="card-boutique p-4 flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-1 text-[#9E9E9E] self-center">
          <Filter size={14} /><span className="text-xs font-medium">Filtros</span>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-[#9E9E9E] mb-0.5">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="input-boutique text-sm" />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-[#9E9E9E] mb-0.5">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="input-boutique text-sm" />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-[#9E9E9E] mb-0.5">Tipo</label>
          <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="input-boutique text-sm">
            <option value="">Todos</option>
            {Object.entries(TIPO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button onClick={cargar} className="btn-boutique-primary text-sm py-2 flex items-center gap-2">
          <Filter size={14} /> Filtrar
        </button>
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : movimientos.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <BookOpen size={32} className="text-[#E8D5A3] mb-3" />
          <p className="text-sm text-[#9E9E9E]">Sin movimientos para este período.</p>
        </div>
      ) : (
        <div className="card-boutique overflow-hidden">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2.5 bg-[#FAFAFA] border-b border-[#F2C4CE] text-[10px] font-medium text-[#9E9E9E] uppercase tracking-wide">
            <span>Producto</span><span>Tipo</span><span className="text-center">Cant.</span>
            <span className="text-center">Anterior</span><span className="text-center">Nuevo</span><span className="text-right">Fecha</span>
          </div>
          <div className="divide-y divide-[#F2C4CE]">
            {movimientos.map((m) => {
              const cfg = TIPO_CONFIG[m.tipo] ?? { label: m.tipo, color: 'text-[#9E9E9E]', entrada: true };
              return (
                <div key={m.id} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-x-3 gap-y-0.5 px-4 py-3 hover:bg-[#FAFAFA] transition-colors items-center">
                  <div>
                    <p className="text-sm text-[#2C2C2C]">{m.variante.producto.nombre}</p>
                    <p className="text-[10px] text-[#9E9E9E]">
                      {m.variante.sku}
                      {m.variante.talla && ` · T${m.variante.talla}`}
                      {m.variante.color && ` · ${m.variante.color}`}
                      {m.motivo && ` · ${m.motivo}`}
                    </p>
                  </div>
                  <div>
                    <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-1 justify-center">
                    {cfg.entrada
                      ? <ArrowUp size={12} className="text-[#6DBF94]" />
                      : <ArrowDown size={12} className="text-[#E57373]" />
                    }
                    <span className={`font-mono text-sm font-bold ${cfg.color}`}>{m.cantidad}</span>
                  </div>
                  <p className="font-mono text-sm text-center text-[#9E9E9E]">{m.stockAnterior}</p>
                  <p className="font-mono text-sm text-center font-bold text-[#2C2C2C]">{m.stockNuevo}</p>
                  <p className="text-[10px] text-[#9E9E9E] text-right">
                    {isValid(new Date(m.createdAt)) ? format(new Date(m.createdAt), 'dd/MM/yy HH:mm', { locale: es }) : '—'}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="px-4 py-2.5 bg-[#FAFAFA] border-t border-[#F2C4CE] text-xs text-[#9E9E9E] text-right">
            {movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
