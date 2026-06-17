'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Package, ArrowUp, ArrowDown, RefreshCw, AlertCircle } from 'lucide-react';
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

export default function AjustesPage() {
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [buscarVariante, setBuscarVariante] = useState('');
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [buscandoVariante, setBuscandoVariante] = useState(false);

  const [varianteSeleccionada, setVarianteSeleccionada] = useState<Variante | null>(null);
  const [tipo, setTipo] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA');
  const [cantidad, setCantidad] = useState<number>(1);
  const [motivo, setMotivo] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cajero = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(SESSION_KEY);
    try { return stored ? JSON.parse(stored) : null; } catch { return null; }
  }, []);

  const cargarAjustes = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const res = await fetch('/api/inventario/ajustes?limite=60');
      if (!res.ok) throw new Error(`Error ${res.status} al cargar ajustes`);
      const d = await res.json();
      setAjustes(d.data ?? []);
    } catch (err: any) {
      setErrorCarga(err.message ?? 'No se pudieron cargar los ajustes');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarAjustes(); }, [cargarAjustes]);

  useEffect(() => {
    if (!buscarVariante.trim()) { setVariantes([]); return; }
    setBuscandoVariante(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/pos/buscar?q=${encodeURIComponent(buscarVariante)}`, { signal: controller.signal });
        const d = await res.json();
        const vs: Variante[] = [];
        for (const p of (d.data ?? [])) {
          for (const v of (p.variantes ?? [])) {
            vs.push({ id: v.id, sku: v.sku, talla: v.talla, color: v.color, stockActual: v.stockActual, producto: { nombre: p.nombre } });
          }
        }
        setVariantes(vs);
      } catch (err: any) {
        if (err.name !== 'AbortError') setVariantes([]);
      } finally {
        setBuscandoVariante(false);
      }
    }, 300);
    return () => { clearTimeout(t); controller.abort(); };
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
    if (!motivo.trim()) { toast.error('Describe el motivo del ajuste'); return; }
    if (!cajero) { toast.error('No hay sesión activa. Recarga la página.'); return; }

    setGuardando(true);
    try {
      const res = await fetch('/api/inventario/ajustes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ varianteId: varianteSeleccionada.id, tipo, cantidad, motivo: motivo.trim(), notas, usuarioId: cajero.id }),
      });
      let d: any = {};
      try { d = await res.json(); } catch {}
      if (!res.ok) throw new Error(d.error ?? `Error ${res.status}`);
      toast.success(`Ajuste de ${tipo === 'ENTRADA' ? 'entrada' : 'salida'} registrado`);
      setModalOpen(false);
      cargarAjustes();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-playfair text-2xl font-bold text-boutique-dark">Ajustes de inventario</h1>
            <p className="text-sm text-boutique-gray-mid mt-0.5">Entradas, salidas y correcciones de stock</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cargarAjustes}
              aria-label="Actualizar ajustes"
              className="p-2 rounded-xl hover:bg-blush-light transition-colors min-w-[44px] min-h-[44px]"
            >
              <RefreshCw size={15} className="text-boutique-gray-mid" />
            </button>
            <button onClick={abrirModal} className="btn-boutique-primary flex items-center gap-2 text-sm">
              <Plus size={15} /> Nuevo ajuste
            </button>
          </div>
        </div>

        {cargando ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin motion-reduce:animate-none motion-reduce:opacity-50" />
          </div>
        ) : errorCarga ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <AlertCircle size={28} className="text-boutique-danger" />
            <p className="text-sm text-boutique-danger">{errorCarga}</p>
            <button onClick={cargarAjustes} className="btn-boutique-secondary text-xs px-3 py-1.5">Reintentar</button>
          </div>
        ) : ajustes.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Package size={32} className="text-gold-light mb-3" />
            <p className="text-sm font-medium text-boutique-dark mb-1">Sin ajustes registrados</p>
            <p className="text-xs text-boutique-gray-mid max-w-xs">
              Los ajustes manuales de stock aparecen aquí. Usa "Nuevo ajuste" para registrar entradas, salidas o correcciones de inventario.
            </p>
          </div>
        ) : (
          <div className="card-boutique overflow-hidden">
            <div className="divide-y divide-blush">
              {ajustes.map((a) => (
                <div key={a.id} className="flex items-center gap-4 px-4 py-3 hover:bg-boutique-white transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${a.tipo === 'ENTRADA' ? 'bg-boutique-success/20' : 'bg-boutique-danger/20'}`}>
                    {a.tipo === 'ENTRADA'
                      ? <ArrowUp size={14} className="text-boutique-success" />
                      : <ArrowDown size={14} className="text-boutique-danger" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-boutique-dark truncate">
                      {a.variante.producto.nombre}
                      {(a.variante.talla || a.variante.color) && (
                        <span className="text-boutique-gray-mid ml-1 text-xs">
                          ({[a.variante.talla, a.variante.color].filter(Boolean).join('/')})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-boutique-gray-mid truncate">{a.motivo} · {a.usuario.nombre}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-mono font-bold text-sm ${a.tipo === 'ENTRADA' ? 'text-boutique-success' : 'text-boutique-danger'}`}>
                      {a.tipo === 'ENTRADA' ? '+' : '-'}{a.cantidad}
                    </p>
                    <p className="text-[10px] text-boutique-gray-mid">
                      {isValid(new Date(a.createdAt)) ? format(new Date(a.createdAt), 'dd/MM HH:mm', { locale: es }) : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {ajustes.length >= 60 && (
              <p className="text-xs text-boutique-gray-mid text-center py-2 border-t border-blush">
                Mostrando los últimos 60 ajustes
              </p>
            )}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={(v) => !v && setModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl border border-blush p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-blush bg-boutique-white">
            <DialogTitle className="font-playfair text-lg font-bold text-boutique-dark">Nuevo ajuste</DialogTitle>
            <DialogDescription className="text-xs text-boutique-gray-mid">Registra una entrada o salida manual de stock</DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4">
            {/* Tipo */}
            <div>
              <span id="aj-tipo-label" className="block text-xs font-medium text-boutique-dark mb-1">Tipo de ajuste</span>
              <div role="radiogroup" aria-labelledby="aj-tipo-label" className="grid grid-cols-2 gap-2">
                {(['ENTRADA', 'SALIDA'] as const).map((t) => (
                  <button
                    key={t}
                    role="radio"
                    aria-checked={tipo === t}
                    onClick={() => { setTipo(t); setMotivo(''); }}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      tipo === t
                        ? t === 'ENTRADA' ? 'bg-boutique-success/20 border-boutique-success text-boutique-success' : 'bg-boutique-danger/20 border-boutique-danger text-boutique-danger'
                        : 'border-blush text-boutique-gray-mid hover:bg-blush-light'
                    }`}
                  >
                    {t === 'ENTRADA' ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
                    {t === 'ENTRADA' ? 'Entrada' : 'Salida'}
                  </button>
                ))}
              </div>
            </div>

            {/* Buscar variante */}
            <div>
              <label htmlFor="aj-variante" className="block text-xs font-medium text-boutique-dark mb-1">Producto / variante *</label>
              {varianteSeleccionada ? (
                <div className="flex items-center justify-between p-3 bg-blush-light rounded-xl">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-boutique-dark truncate">{varianteSeleccionada.producto.nombre}</p>
                    <p className="text-xs text-boutique-gray-mid">
                      SKU: {varianteSeleccionada.sku}
                      {(varianteSeleccionada.talla || varianteSeleccionada.color) && ` · ${[varianteSeleccionada.talla, varianteSeleccionada.color].filter(Boolean).join('/')}`}
                      {' '}· Stock: {varianteSeleccionada.stockActual}
                    </p>
                  </div>
                  <button
                    aria-label="Quitar variante seleccionada"
                    onClick={() => { setVarianteSeleccionada(null); setBuscarVariante(''); }}
                    className="ml-2 flex-shrink-0 text-xs text-boutique-gray-mid hover:text-boutique-danger transition-colors"
                  >✕</button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-boutique-gray-mid" />
                    <input
                      id="aj-variante"
                      type="text"
                      value={buscarVariante}
                      onChange={(e) => setBuscarVariante(e.target.value)}
                      className="w-full input-boutique pl-9"
                      placeholder="Buscar producto..."
                      autoFocus
                    />
                  </div>
                  {/* Inline results — avoids clipping by overflow-hidden on DialogContent */}
                  {variantes.length > 0 && (
                    <div className="mt-1 border border-blush rounded-xl max-h-40 overflow-y-auto bg-white">
                      {variantes.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => { setVarianteSeleccionada(v); setVariantes([]); setBuscarVariante(''); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-blush-light transition-colors first:rounded-t-xl last:rounded-b-xl"
                        >
                          <p className="text-sm text-boutique-dark truncate">{v.producto.nombre}</p>
                          <p className="text-xs text-boutique-gray-mid">
                            {v.sku}{v.talla && ` · T${v.talla}`}{v.color && ` · ${v.color}`} · Stock: {v.stockActual}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {buscandoVariante && !variantes.length && (
                    <p className="text-xs text-boutique-gray-mid mt-1">Buscando...</p>
                  )}
                </div>
              )}
            </div>

            {/* Cantidad */}
            <div>
              <label htmlFor="aj-cantidad" className="block text-xs font-medium text-boutique-dark mb-1">Cantidad *</label>
              <input
                id="aj-cantidad"
                type="number"
                min={1}
                max={9999}
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full input-boutique font-mono text-center text-lg"
              />
            </div>

            {/* Motivo */}
            <div>
              <label htmlFor="aj-motivo" className="block text-xs font-medium text-boutique-dark mb-1">Motivo *</label>
              <textarea
                id="aj-motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
                maxLength={300}
                className="w-full input-boutique resize-none text-sm"
                placeholder="Describe el motivo del ajuste (ej: Mercadería nueva de proveedor, prenda dañada, etc.)"
              />
              {motivo.length > 260 && (
                <p className="text-xs text-boutique-gray-mid text-right mt-0.5">{motivo.length}/300</p>
              )}
            </div>

            {/* Notas */}
            <div>
              <label htmlFor="aj-notas" className="block text-xs font-medium text-boutique-dark mb-1">Notas (opcional)</label>
              <textarea
                id="aj-notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full input-boutique resize-none text-sm"
                placeholder="Observaciones adicionales..."
              />
            </div>

            <div className="flex gap-3 pt-2 border-t border-blush">
              <button onClick={() => setModalOpen(false)} className="flex-1 btn-boutique-secondary text-sm py-2.5">Cancelar</button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex-1 btn-boutique-primary text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {guardando
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
                  : <Plus size={15} />
                }
                Registrar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
