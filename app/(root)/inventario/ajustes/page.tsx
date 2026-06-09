'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Package, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const SESSION_KEY = 'pos_cajero';

interface Variante {
  id: string;
  sku: string;
  talla: string | null;
  color: string | null;
  stockActual: number;
  producto: { nombre: string };
}

interface Ajuste {
  id: string;
  tipo: string;
  cantidad: number;
  motivo: string;
  notas: string | null;
  createdAt: string;
  variante: { sku: string; talla: string | null; color: string | null; stockActual: number; producto: { nombre: string } };
  usuario: { nombre: string };
}

const TIPOS_ENTRADA = [
  'Compra a proveedor', 'Devolución de cliente', 'Corrección de inventario', 'Mercancía en consignación',
];
const TIPOS_SALIDA = [
  'Merma / daño', 'Robo o extravío', 'Muestra / regalo', 'Corrección de inventario',
];

export default function AjustesPage() {
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [buscarVariante, setBuscarVariante] = useState('');
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [buscandoVariante, setBuscandoVariante] = useState(false);

  // Formulario
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<Variante | null>(null);
  const [tipo, setTipo] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA');
  const [cantidad, setCantidad] = useState<number>(1);
  const [motivo, setMotivo] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cajeroStored = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
  const cajero = cajeroStored ? JSON.parse(cajeroStored) : null;

  const cargarAjustes = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch('/api/inventario/ajustes?limite=60');
      const d = await res.json();
      setAjustes(d.data ?? []);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarAjustes(); }, [cargarAjustes]);

  useEffect(() => {
    if (!buscarVariante.trim()) { setVariantes([]); return; }
    setBuscandoVariante(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/pos/buscar?q=${encodeURIComponent(buscarVariante)}`);
        const d = await res.json();
        // Flatten productos → variantes
        const vs: Variante[] = [];
        for (const p of (d.data ?? [])) {
          for (const v of (p.variantes ?? [])) {
            vs.push({ id: v.id, sku: v.sku, talla: v.talla, color: v.color, stockActual: v.stockActual, producto: { nombre: p.nombre } });
          }
        }
        setVariantes(vs);
      } finally {
        setBuscandoVariante(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [buscarVariante]);

  function abrirModal() {
    setVarianteSeleccionada(null);
    setBuscarVariante('');
    setVariantes([]);
    setTipo('ENTRADA');
    setCantidad(1);
    setMotivo('');
    setNotas('');
    setModalOpen(true);
  }

  async function guardar() {
    if (!varianteSeleccionada) { toast.error('Selecciona una variante'); return; }
    if (!motivo) { toast.error('Selecciona un motivo'); return; }
    if (!cajero) { toast.error('No hay sesión activa'); return; }

    setGuardando(true);
    try {
      const res = await fetch('/api/inventario/ajustes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ varianteId: varianteSeleccionada.id, tipo, cantidad, motivo, notas, usuarioId: cajero.id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(`Ajuste de ${tipo === 'ENTRADA' ? 'entrada' : 'salida'} registrado`);
      setModalOpen(false);
      cargarAjustes();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const motivosActuales = tipo === 'ENTRADA' ? TIPOS_ENTRADA : TIPOS_SALIDA;

  return (
    <>
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-playfair text-2xl font-bold text-[#2C2C2C]">Ajustes de inventario</h1>
            <p className="text-sm text-[#9E9E9E] mt-0.5">Entradas, salidas y correcciones de stock</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={cargarAjustes} className="p-2 rounded-xl hover:bg-[#F8E1E7] transition-colors">
              <RefreshCw size={15} className="text-[#9E9E9E]" />
            </button>
            <button onClick={abrirModal} className="btn-boutique-primary flex items-center gap-2 text-sm">
              <Plus size={15} /> Nuevo ajuste
            </button>
          </div>
        </div>

        {cargando ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ajustes.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Package size={32} className="text-[#E8D5A3] mb-3" />
            <p className="text-sm text-[#9E9E9E]">Sin ajustes registrados.</p>
          </div>
        ) : (
          <div className="card-boutique overflow-hidden">
            <div className="divide-y divide-[#F2C4CE]">
              {ajustes.map((a) => (
                <div key={a.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[#FAFAFA] transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${a.tipo === 'ENTRADA' ? 'bg-[#6DBF94]/20' : 'bg-[#E57373]/20'}`}>
                    {a.tipo === 'ENTRADA'
                      ? <ArrowUp size={14} className="text-[#6DBF94]" />
                      : <ArrowDown size={14} className="text-[#E57373]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2C2C2C] truncate">
                      {a.variante.producto.nombre}
                      {(a.variante.talla || a.variante.color) && (
                        <span className="text-[#9E9E9E] ml-1 text-xs">
                          ({[a.variante.talla, a.variante.color].filter(Boolean).join('/')})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[#9E9E9E]">{a.motivo} · {a.usuario.nombre}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-mono font-bold text-sm ${a.tipo === 'ENTRADA' ? 'text-[#6DBF94]' : 'text-[#E57373]'}`}>
                      {a.tipo === 'ENTRADA' ? '+' : '-'}{a.cantidad}
                    </p>
                    <p className="text-[10px] text-[#9E9E9E]">
                      {isValid(new Date(a.createdAt)) ? format(new Date(a.createdAt), 'dd/MM HH:mm', { locale: es }) : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={(v) => !v && setModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl border border-[#F2C4CE] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-[#F2C4CE] bg-[#FAFAFA]">
            <DialogTitle className="font-playfair text-lg font-bold text-[#2C2C2C]">Nuevo ajuste</DialogTitle>
            <DialogDescription className="text-xs text-[#9E9E9E]">Registra una entrada o salida manual de stock</DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4">
            {/* Tipo */}
            <div className="grid grid-cols-2 gap-2">
              {(['ENTRADA', 'SALIDA'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTipo(t); setMotivo(''); }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    tipo === t
                      ? t === 'ENTRADA' ? 'bg-[#6DBF94]/20 border-[#6DBF94] text-[#6DBF94]' : 'bg-[#E57373]/20 border-[#E57373] text-[#E57373]'
                      : 'border-[#F2C4CE] text-[#9E9E9E] hover:bg-[#F8E1E7]'
                  }`}
                >
                  {t === 'ENTRADA' ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
                  {t === 'ENTRADA' ? 'Entrada' : 'Salida'}
                </button>
              ))}
            </div>

            {/* Buscar variante */}
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Producto / variante *</label>
              {varianteSeleccionada ? (
                <div className="flex items-center justify-between p-3 bg-[#F8E1E7] rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-[#2C2C2C]">{varianteSeleccionada.producto.nombre}</p>
                    <p className="text-xs text-[#9E9E9E]">
                      SKU: {varianteSeleccionada.sku}
                      {(varianteSeleccionada.talla || varianteSeleccionada.color) && ` · ${[varianteSeleccionada.talla, varianteSeleccionada.color].filter(Boolean).join('/')}`}
                      {' '}· Stock: {varianteSeleccionada.stockActual}
                    </p>
                  </div>
                  <button onClick={() => { setVarianteSeleccionada(null); setBuscarVariante(''); }} className="text-xs text-[#9E9E9E] hover:text-[#E57373]">✕</button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" />
                  <input
                    type="text"
                    value={buscarVariante}
                    onChange={(e) => setBuscarVariante(e.target.value)}
                    className="w-full input-boutique pl-9"
                    placeholder="Buscar producto..."
                    autoFocus
                  />
                  {variantes.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-[#F2C4CE] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {variantes.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => { setVarianteSeleccionada(v); setVariantes([]); setBuscarVariante(''); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-[#F8E1E7] transition-colors"
                        >
                          <p className="text-sm text-[#2C2C2C]">{v.producto.nombre}</p>
                          <p className="text-xs text-[#9E9E9E]">
                            {v.sku}{v.talla && ` · T${v.talla}`}{v.color && ` · ${v.color}`} · Stock: {v.stockActual}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {buscandoVariante && <p className="text-xs text-[#9E9E9E] mt-1">Buscando...</p>}
                </div>
              )}
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Cantidad *</label>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                className="w-full input-boutique font-mono text-center text-lg"
              />
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Motivo *</label>
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-full input-boutique">
                <option value="">Seleccionar...</option>
                {motivosActuales.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Notas (opcional)</label>
              <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="w-full input-boutique resize-none text-sm" placeholder="Observaciones adicionales..." />
            </div>

            <div className="flex gap-3 pt-2 border-t border-[#F2C4CE]">
              <button onClick={() => setModalOpen(false)} className="flex-1 btn-boutique-secondary text-sm py-2.5">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="flex-1 btn-boutique-primary text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-60">
                {guardando ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={15} />}
                Registrar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
