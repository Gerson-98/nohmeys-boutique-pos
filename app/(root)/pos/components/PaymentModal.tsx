'use client';
import { useState, useEffect, useRef } from 'react';
import { CreditCard, Banknote, Wifi, ArrowRight, ArrowLeft, Check, Plus, X, AlertTriangle, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPrecio, CONSUMIDOR_FINAL_ID } from '@/lib/boutique';
import { toast } from 'react-toastify';
import type { PagoInput, BancoPOS, ClientePOS } from '../types';

const METODOS = [
  { value: 'EFECTIVO', label: 'Efectivo', icon: <Banknote size={18} aria-hidden="true" /> },
  { value: 'TARJETA', label: 'Tarjeta', icon: <CreditCard size={18} aria-hidden="true" /> },
  { value: 'TRANSFERENCIA', label: 'Transferencia', icon: <Wifi size={18} aria-hidden="true" /> },
] as const;

interface Props {
  open: boolean;
  total: number;
  cliente: ClientePOS | null;
  onConfirmar: (pagos: PagoInput[]) => Promise<void>;
  onCerrar: () => void;
  onSeleccionarCliente: (c: ClientePOS) => void;
}

export function PaymentModal({ open, total, cliente, onConfirmar, onCerrar, onSeleccionarCliente }: Props) {
  const [metodo, setMetodo] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO'>('EFECTIVO');
  const [montoEfectivo, setMontoEfectivo] = useState<number>(0);
  const [montoTarjeta, setMontoTarjeta] = useState<number>(0);
  const [montoTransferencia, setMontoTransferencia] = useState<number>(0);
  const [bancoTarjetaId, setBancoTarjetaId] = useState('');
  const [bancoTransferenciaId, setBancoTransferenciaId] = useState('');
  const [referenciaTarjeta, setReferenciaTarjeta] = useState('');
  const [referenciaTransferencia, setReferenciaTransferencia] = useState('');
  const [procesando, setProcesando] = useState(false);

  // En MIXTO, Tarjeta y Transferencia se revelan solo si el cajero los agrega
  const [mixtoTarjeta, setMixtoTarjeta] = useState(false);
  const [mixtoTransferencia, setMixtoTransferencia] = useState(false);
  // MIXTO en dos pasos: 1) montos por método, 2) banco/detalle solo si aplica
  const [mixtoStep, setMixtoStep] = useState<'montos' | 'detalle'>('montos');

  const [bancos, setBancos] = useState<BancoPOS[]>([]);
  const [nuevoBancoFor, setNuevoBancoFor] = useState<'TARJETA' | 'TRANSFERENCIA' | null>(null);
  const [nuevoBancoNombre, setNuevoBancoNombre] = useState('');
  const [nuevoBancoTipo, setNuevoBancoTipo] = useState<'NACIONAL' | 'INTERNACIONAL'>('NACIONAL');
  const [creandoBanco, setCreandoBanco] = useState(false);

  // Resolución de cliente sin salir del modal (para métodos que lo requieren)
  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteResultados, setClienteResultados] = useState<ClientePOS[]>([]);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('');
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState('');
  const [creandoCliente, setCreandoCliente] = useState(false);

  // Confirmación de venta en dos toques (mismo patrón que "vaciar carrito")
  const [confirmarArmado, setConfirmarArmado] = useState(false);
  const confirmarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Confirmación antes de descartar un pago en progreso al cerrar el modal
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  const cierreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cambio = metodo === 'EFECTIVO' ? Math.max(0, montoEfectivo - total) : 0;

  const sinClienteValido = !cliente || cliente.id === CONSUMIDOR_FINAL_ID;

  // Resetear estado al abrir/cerrar
  useEffect(() => {
    if (open) {
      setMetodo('EFECTIVO');
      setMontoEfectivo(0);
      setMontoTarjeta(0);
      setMontoTransferencia(0);
      setBancoTarjetaId('');
      setBancoTransferenciaId('');
      setReferenciaTarjeta('');
      setReferenciaTransferencia('');
      setMixtoTarjeta(false);
      setMixtoTransferencia(false);
      setMixtoStep('montos');
      setClienteQuery('');
      setClienteResultados([]);
      setMostrarNuevoCliente(false);
      setNuevoClienteNombre('');
      setNuevoClienteTelefono('');
      if (confirmarTimeoutRef.current) clearTimeout(confirmarTimeoutRef.current);
      setConfirmarArmado(false);
      if (cierreTimeoutRef.current) clearTimeout(cierreTimeoutRef.current);
      setConfirmandoCierre(false);
      cargarBancos();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (confirmarTimeoutRef.current) clearTimeout(confirmarTimeoutRef.current);
      if (cierreTimeoutRef.current) clearTimeout(cierreTimeoutRef.current);
    };
  }, []);

  async function cargarBancos() {
    try {
      const res = await fetch('/api/bancos');
      const data = await res.json();
      if (res.ok) setBancos(data.data);
    } catch {
      // silencioso
    }
  }

  async function crearBanco() {
    if (!nuevoBancoNombre.trim() || nuevoBancoNombre.trim().length < 2) {
      toast.error('El nombre del banco debe tener al menos 2 caracteres');
      return;
    }
    setCreandoBanco(true);
    try {
      const res = await fetch('/api/bancos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoBancoNombre.trim(), tipo: nuevoBancoTipo }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      setBancos((prev) => [...prev, data.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      if (nuevoBancoFor === 'TARJETA') setBancoTarjetaId(data.data.id);
      if (nuevoBancoFor === 'TRANSFERENCIA') setBancoTransferenciaId(data.data.id);
      setNuevoBancoFor(null);
      setNuevoBancoNombre('');
      setNuevoBancoTipo('NACIONAL');
      toast.success('Banco agregado correctamente');
    } catch (err: unknown) {
      toast.error('Error al crear banco: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setCreandoBanco(false);
    }
  }

  async function buscarClientesInline(q: string) {
    setClienteQuery(q);
    if (q.trim().length < 1) {
      setClienteResultados([]);
      return;
    }
    const res = await fetch(`/api/clientes?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setClienteResultados(data.data ?? []);
  }

  function elegirClienteInline(c: ClientePOS) {
    onSeleccionarCliente(c);
    setClienteQuery('');
    setClienteResultados([]);
  }

  async function crearClienteInline() {
    if (!nuevoClienteNombre.trim()) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }
    setCreandoCliente(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoClienteNombre, telefono: nuevoClienteTelefono }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Cliente creado y seleccionado para esta venta');
      onSeleccionarCliente(data.data);
      setMostrarNuevoCliente(false);
      setNuevoClienteNombre('');
      setNuevoClienteTelefono('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCreandoCliente(false);
    }
  }

  function buildPagos(): PagoInput[] {
    if (metodo === 'EFECTIVO') {
      return [{ metodo: 'EFECTIVO', monto: montoEfectivo || total }];
    }
    if (metodo === 'TARJETA') {
      return [{ metodo: 'TARJETA', monto: total, referencia: referenciaTarjeta || undefined, bancoId: bancoTarjetaId }];
    }
    if (metodo === 'TRANSFERENCIA') {
      return [{ metodo: 'TRANSFERENCIA', monto: total, referencia: referenciaTransferencia || undefined, bancoId: bancoTransferenciaId }];
    }
    // MIXTO
    const pagos: PagoInput[] = [];
    if (montoEfectivo > 0) pagos.push({ metodo: 'EFECTIVO', monto: montoEfectivo });
    if (montoTarjeta > 0) {
      pagos.push({ metodo: 'TARJETA', monto: montoTarjeta, referencia: referenciaTarjeta || undefined, bancoId: bancoTarjetaId });
    }
    if (montoTransferencia > 0) {
      pagos.push({ metodo: 'TRANSFERENCIA', monto: montoTransferencia, referencia: referenciaTransferencia || undefined, bancoId: bancoTransferenciaId });
    }
    return pagos;
  }

  // Determina si el método/combinación actual requiere un cliente identificado
  function requiereCliente(): boolean {
    if (metodo === 'TARJETA' || metodo === 'TRANSFERENCIA') return true;
    if (metodo === 'MIXTO') return montoTarjeta > 0 || montoTransferencia > 0;
    return false;
  }

  const asignadoMixto = montoEfectivo + montoTarjeta + montoTransferencia;
  const mixtoCoincide = Math.abs(asignadoMixto - total) < 0.01;
  // Solo se necesita un paso de detalle (selección de banco) si hay tarjeta o transferencia en la mezcla
  const necesitaDetalleMixto = metodo === 'MIXTO' && (montoTarjeta > 0 || montoTransferencia > 0);

  function esValido(): boolean {
    if (requiereCliente() && sinClienteValido) return false;

    if (metodo === 'EFECTIVO') return montoEfectivo >= total;
    if (metodo === 'TARJETA') return !!bancoTarjetaId;
    if (metodo === 'TRANSFERENCIA') return !!bancoTransferenciaId;
    if (metodo === 'MIXTO') {
      if (!mixtoCoincide || asignadoMixto <= 0) return false;
      if (montoTarjeta > 0 && !bancoTarjetaId) return false;
      if (montoTransferencia > 0 && !bancoTransferenciaId) return false;
      return true;
    }
    return false;
  }

  // Hay información de pago que se perdería si se cierra el modal sin confirmar
  function tienePagoEnProgreso(): boolean {
    return metodo !== 'EFECTIVO' || montoEfectivo > 0 || mixtoStep === 'detalle';
  }

  // Cerrar (X, click fuera, Escape) avisa primero si hay un pago en progreso,
  // en vez de descartarlo en silencio.
  function handleOpenChange(v: boolean) {
    if (v) return;
    if (tienePagoEnProgreso()) {
      if (cierreTimeoutRef.current) clearTimeout(cierreTimeoutRef.current);
      setConfirmandoCierre(true);
      cierreTimeoutRef.current = setTimeout(() => setConfirmandoCierre(false), 5000);
      return;
    }
    onCerrar();
  }

  function descartarYCerrar() {
    if (cierreTimeoutRef.current) clearTimeout(cierreTimeoutRef.current);
    setConfirmandoCierre(false);
    onCerrar();
  }

  // Primer toque arma la confirmación (se desarma sola a los 4s),
  // segundo toque dentro de ese tiempo procesa la venta.
  function solicitarConfirmarVenta() {
    if (!esValido() || procesando) return;
    if (confirmarTimeoutRef.current) clearTimeout(confirmarTimeoutRef.current);
    setConfirmarArmado(true);
    confirmarTimeoutRef.current = setTimeout(() => setConfirmarArmado(false), 4000);
  }

  async function handleConfirmar() {
    if (confirmarTimeoutRef.current) clearTimeout(confirmarTimeoutRef.current);
    setConfirmarArmado(false);
    if (!esValido()) return;
    setProcesando(true);
    try {
      await onConfirmar(buildPagos());
    } finally {
      setProcesando(false);
    }
  }

  function renderSelectorBanco(
    bancoId: string,
    onChange: (id: string) => void,
    target: 'TARJETA' | 'TRANSFERENCIA'
  ) {
    return (
      <div>
        <label className="block text-xs font-medium text-boutique-dark mb-1">Banco</label>
        <div className="flex items-center gap-2">
          <select
            value={bancoId}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 input-boutique text-sm"
          >
            <option value="">Seleccione un banco...</option>
            {bancos.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setNuevoBancoFor(target)}
            aria-label="Agregar banco"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border-2 border-gold-light text-gold hover:border-gold transition-colors flex-shrink-0"
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="relative max-w-sm rounded-2xl border border-blush p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-blush bg-boutique-white">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="font-playfair text-lg font-bold text-boutique-dark">
              Cobrar venta
            </DialogTitle>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="flex items-center gap-1 text-xs font-medium text-boutique-gray-mid hover:text-gold transition-colors flex-shrink-0"
            >
              <ArrowLeft size={14} aria-hidden="true" /> Editar carrito
            </button>
          </div>
          <p className="text-2xl font-mono font-bold text-gold mt-1">
            {formatPrecio(total)}
          </p>
        </DialogHeader>

        {confirmandoCierre && (
          <div className="px-5 py-3 bg-boutique-danger/10 border-b border-boutique-danger flex items-center justify-between gap-3">
            <div className="flex items-start gap-2 text-xs text-boutique-danger">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>¿Descartar este pago? Se perderá la información ingresada.</span>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (cierreTimeoutRef.current) clearTimeout(cierreTimeoutRef.current);
                  setConfirmandoCierre(false);
                }}
                className="text-xs font-medium text-boutique-dark hover:text-gold transition-colors px-2 py-1"
              >
                Seguir
              </button>
              <button
                type="button"
                onClick={descartarYCerrar}
                className="text-xs font-semibold text-boutique-danger hover:text-[#D65F5F] transition-colors px-2 py-1"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Selector de método */}
          <div>
            <p className="text-xs font-medium text-boutique-dark mb-2">
              Método de pago
            </p>
            <div className="grid grid-cols-2 gap-2">
              {METODOS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMetodo(m.value)}
                  aria-pressed={metodo === m.value}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                    ${metodo === m.value
                      ? 'border-gold bg-blush-light text-gold'
                      : 'border-gold-light text-boutique-dark hover:border-gold'
                    }`}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
              <button
                onClick={() => { setMetodo('MIXTO'); setMixtoStep('montos'); }}
                aria-pressed={metodo === 'MIXTO'}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                  ${metodo === 'MIXTO'
                    ? 'border-gold bg-blush-light text-gold'
                    : 'border-gold-light text-boutique-dark hover:border-gold'
                  }`}
              >
                <ArrowRight size={18} aria-hidden="true" />
                Mixto
              </button>
            </div>
          </div>

          {/* Aviso de cliente requerido */}
          {requiereCliente() && sinClienteValido && (
            <div className="space-y-2 px-3 py-2.5 rounded-xl border border-boutique-danger bg-boutique-danger/10 text-xs">
              <div className="flex items-start gap-2 text-boutique-danger">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Tarjeta y transferencia requieren un cliente registrado (no &ldquo;Consumidor Final&rdquo;). Busca o crea uno para continuar.
                </span>
              </div>

              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-boutique-gray-mid" aria-hidden="true" />
                <input
                  type="text"
                  value={clienteQuery}
                  onChange={(e) => buscarClientesInline(e.target.value)}
                  placeholder="Buscar cliente por nombre..."
                  aria-label="Buscar cliente por nombre"
                  className="w-full input-boutique pl-7 text-xs py-1.5 bg-white"
                />
              </div>

              {clienteResultados.length > 0 && (
                <div className="rounded-xl border border-blush bg-white overflow-hidden max-h-32 overflow-y-auto">
                  {clienteResultados.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => elegirClienteInline(c)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-blush-light transition-colors text-left"
                    >
                      <span className="text-boutique-dark font-medium">{c.nombre}</span>
                      {c.telefono && <span className="text-[10px] text-boutique-gray-dark">{c.telefono}</span>}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setMostrarNuevoCliente(true)}
                className="flex items-center gap-1 font-medium text-gold hover:text-[#B8963E] transition-colors"
              >
                <Plus size={13} aria-hidden="true" /> Crear cliente nuevo
              </button>
            </div>
          )}

          {/* Campos según método */}
          {metodo === 'EFECTIVO' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-boutique-dark mb-1">
                  ¿Con cuánto paga? (Q)
                </label>
                <input
                  type="number"
                  min={total}
                  step={0.01}
                  value={montoEfectivo || ''}
                  onChange={(e) => setMontoEfectivo(parseFloat(e.target.value) || 0)}
                  autoFocus
                  className="w-full input-boutique font-mono text-lg text-center"
                  placeholder={formatPrecio(total)}
                />
              </div>
              {montoEfectivo >= total && (
                <div className="flex items-center justify-between px-4 py-3 bg-boutique-success/10 rounded-xl border border-boutique-success">
                  <span className="text-sm font-medium text-boutique-dark">Cambio</span>
                  <span className="text-lg font-mono font-bold text-boutique-success">
                    {formatPrecio(cambio)}
                  </span>
                </div>
              )}
              {montoEfectivo > 0 && montoEfectivo < total && (
                <p className="text-[11px] text-boutique-danger text-center">
                  Falta {formatPrecio(total - montoEfectivo)} para completar el pago
                </p>
              )}
            </div>
          )}

          {metodo === 'TARJETA' && (
            <div className="space-y-3">
              {renderSelectorBanco(bancoTarjetaId, setBancoTarjetaId, 'TARJETA')}
              <div>
                <label className="block text-xs font-medium text-boutique-dark mb-1">
                  Referencia / No. autorización (opcional)
                </label>
                <input
                  type="text"
                  value={referenciaTarjeta}
                  onChange={(e) => setReferenciaTarjeta(e.target.value)}
                  className="w-full input-boutique"
                  placeholder="Ej: AUTH-123456"
                />
              </div>
            </div>
          )}

          {metodo === 'TRANSFERENCIA' && (
            <div className="space-y-3">
              {renderSelectorBanco(bancoTransferenciaId, setBancoTransferenciaId, 'TRANSFERENCIA')}
              <div>
                <label className="block text-xs font-medium text-boutique-dark mb-1">
                  Referencia (opcional)
                </label>
                <input
                  type="text"
                  value={referenciaTransferencia}
                  onChange={(e) => setReferenciaTransferencia(e.target.value)}
                  className="w-full input-boutique"
                  placeholder="Ej: No. de comprobante"
                />
              </div>
              <p className="text-[11px] text-boutique-gray-mid">
                Esta transferencia quedará marcada como <span className="font-medium text-gold">pendiente de validación</span> hasta que un administrador la confirme.
              </p>
            </div>
          )}

          {metodo === 'MIXTO' && mixtoStep === 'montos' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-boutique-dark mb-1">Efectivo (Q)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={montoEfectivo || ''}
                  onChange={(e) => setMontoEfectivo(parseFloat(e.target.value) || 0)}
                  className="w-full input-boutique font-mono"
                  autoFocus
                />
              </div>

              {mixtoTarjeta && (
                <div className="space-y-2 p-3 rounded-xl border border-gold-light bg-boutique-white">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-boutique-dark">Tarjeta (Q)</label>
                    <button
                      type="button"
                      onClick={() => { setMixtoTarjeta(false); setMontoTarjeta(0); setBancoTarjetaId(''); }}
                      aria-label="Quitar tarjeta del pago mixto"
                      className="text-boutique-gray-mid hover:text-boutique-danger transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={montoTarjeta || ''}
                    onChange={(e) => setMontoTarjeta(parseFloat(e.target.value) || 0)}
                    className="w-full input-boutique font-mono"
                    autoFocus
                  />
                </div>
              )}

              {mixtoTransferencia && (
                <div className="space-y-2 p-3 rounded-xl border border-gold-light bg-boutique-white">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-boutique-dark">Transferencia (Q)</label>
                    <button
                      type="button"
                      onClick={() => { setMixtoTransferencia(false); setMontoTransferencia(0); setBancoTransferenciaId(''); }}
                      aria-label="Quitar transferencia del pago mixto"
                      className="text-boutique-gray-mid hover:text-boutique-danger transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={montoTransferencia || ''}
                    onChange={(e) => setMontoTransferencia(parseFloat(e.target.value) || 0)}
                    className="w-full input-boutique font-mono"
                    autoFocus
                  />
                </div>
              )}

              {(!mixtoTarjeta || !mixtoTransferencia) && (
                <div className="flex gap-2">
                  {!mixtoTarjeta && (
                    <button
                      type="button"
                      onClick={() => setMixtoTarjeta(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-dashed border-gold-light text-boutique-gray-mid hover:border-gold hover:text-gold text-xs font-medium transition-colors"
                    >
                      <Plus size={14} aria-hidden="true" /> Tarjeta
                    </button>
                  )}
                  {!mixtoTransferencia && (
                    <button
                      type="button"
                      onClick={() => setMixtoTransferencia(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-dashed border-gold-light text-boutique-gray-mid hover:border-gold hover:text-gold text-xs font-medium transition-colors"
                    >
                      <Plus size={14} aria-hidden="true" /> Transferencia
                    </button>
                  )}
                </div>
              )}

              {asignadoMixto > 0 && (
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-mono
                  ${mixtoCoincide
                    ? 'bg-boutique-success/10 border-boutique-success text-boutique-success'
                    : 'bg-boutique-danger/10 border-boutique-danger text-boutique-danger'
                  }`}>
                  <span>Asignado: {formatPrecio(asignadoMixto)}</span>
                  <span>Total: {formatPrecio(total)}</span>
                </div>
              )}
            </div>
          )}

          {metodo === 'MIXTO' && mixtoStep === 'detalle' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setMixtoStep('montos')}
                className="flex items-center gap-1 text-xs font-medium text-boutique-gray-mid hover:text-gold transition-colors"
              >
                <ArrowLeft size={14} aria-hidden="true" /> Editar montos
              </button>

              <div className="space-y-1 px-3 py-2 rounded-xl border border-gold-light bg-boutique-white text-xs font-mono">
                {montoEfectivo > 0 && (
                  <div className="flex items-center justify-between text-boutique-dark">
                    <span>Efectivo</span>
                    <span>{formatPrecio(montoEfectivo)}</span>
                  </div>
                )}
                {montoTarjeta > 0 && (
                  <div className="flex items-center justify-between text-boutique-dark">
                    <span>Tarjeta</span>
                    <span>{formatPrecio(montoTarjeta)}</span>
                  </div>
                )}
                {montoTransferencia > 0 && (
                  <div className="flex items-center justify-between text-boutique-dark">
                    <span>Transferencia</span>
                    <span>{formatPrecio(montoTransferencia)}</span>
                  </div>
                )}
              </div>

              {montoTarjeta > 0 && renderSelectorBanco(bancoTarjetaId, setBancoTarjetaId, 'TARJETA')}
              {montoTransferencia > 0 && renderSelectorBanco(bancoTransferenciaId, setBancoTransferenciaId, 'TRANSFERENCIA')}
            </div>
          )}

          {/* Aviso de montos faltantes/sobrantes en MIXTO */}
          {metodo === 'MIXTO' && mixtoStep === 'montos' && necesitaDetalleMixto && !mixtoCoincide && (
            <p className="text-[11px] text-boutique-danger text-center">
              {asignadoMixto < total
                ? `Faltan ${formatPrecio(total - asignadoMixto)} por asignar para continuar`
                : `Sobran ${formatPrecio(asignadoMixto - total)}: ajusta los montos para que sumen ${formatPrecio(total)}`}
            </p>
          )}

          {/* Botón principal: en MIXTO con tarjeta/transferencia, primero "Continuar" al detalle de banco */}
          {metodo === 'MIXTO' && mixtoStep === 'montos' && necesitaDetalleMixto ? (
            <button
              onClick={() => setMixtoStep('detalle')}
              disabled={!mixtoCoincide || asignadoMixto <= 0}
              className="w-full btn-boutique-primary flex items-center justify-center gap-2 py-3 text-base disabled:opacity-50"
            >
              Continuar
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          ) : (
            <button
              onClick={confirmarArmado ? handleConfirmar : solicitarConfirmarVenta}
              disabled={!esValido() || procesando}
              className={`w-full flex items-center justify-center gap-2 py-3 text-base font-medium rounded-xl transition-colors disabled:opacity-50
                ${confirmarArmado ? 'bg-boutique-success text-white hover:bg-[#5fae84]' : 'btn-boutique-primary'}`}
            >
              {procesando ? (
                <span role="status" aria-label="Procesando" className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
              ) : (
                <Check size={18} aria-hidden="true" />
              )}
              {confirmarArmado ? `¿Confirmar ${formatPrecio(total)}? Toca de nuevo` : 'Confirmar venta'}
            </button>
          )}
        </div>

        {/* Mini-modal: nuevo banco */}
        <Dialog open={!!nuevoBancoFor} onOpenChange={(v) => !v && setNuevoBancoFor(null)}>
          <DialogContent className="max-w-xs rounded-2xl border border-blush p-4 space-y-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="font-playfair font-bold text-boutique-dark text-sm">Nuevo banco</DialogTitle>
              <button onClick={() => setNuevoBancoFor(null)} aria-label="Cerrar" className="text-boutique-gray-mid hover:text-boutique-danger">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-boutique-dark mb-1">Nombre del banco</label>
              <input
                type="text"
                value={nuevoBancoNombre}
                onChange={(e) => setNuevoBancoNombre(e.target.value)}
                className="w-full input-boutique text-sm"
                placeholder="Ej: Banco Industrial"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-boutique-dark mb-1">Tipo</label>
              <div className="flex gap-2">
                {(['NACIONAL', 'INTERNACIONAL'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNuevoBancoTipo(t)}
                    className={`flex-1 px-2 py-1.5 rounded-lg border-2 text-xs font-medium transition-all
                      ${nuevoBancoTipo === t
                        ? 'border-gold bg-blush-light text-gold'
                        : 'border-gold-light text-boutique-dark'
                      }`}
                  >
                    {t === 'NACIONAL' ? 'Nacional' : 'Internacional'}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={crearBanco}
              disabled={creandoBanco}
              className="w-full btn-boutique-primary py-2 text-sm disabled:opacity-50"
            >
              {creandoBanco ? 'Guardando...' : 'Agregar banco'}
            </button>
          </DialogContent>
        </Dialog>

        {/* Mini-modal: nuevo cliente */}
        <Dialog open={mostrarNuevoCliente} onOpenChange={(v) => setMostrarNuevoCliente(v)}>
          <DialogContent className="max-w-xs rounded-2xl border border-blush p-4 space-y-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="font-playfair font-bold text-boutique-dark text-sm">Nuevo cliente</DialogTitle>
              <button onClick={() => setMostrarNuevoCliente(false)} aria-label="Cerrar" className="text-boutique-gray-mid hover:text-boutique-danger">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-boutique-dark mb-1">Nombre *</label>
              <input
                type="text"
                value={nuevoClienteNombre}
                onChange={(e) => setNuevoClienteNombre(e.target.value)}
                className="w-full input-boutique text-sm"
                placeholder="Nombre completo"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-boutique-dark mb-1">Teléfono (opcional)</label>
              <input
                type="tel"
                value={nuevoClienteTelefono}
                onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                className="w-full input-boutique text-sm"
                placeholder="5555-0000"
              />
            </div>
            <button
              onClick={crearClienteInline}
              disabled={creandoCliente}
              className="w-full btn-boutique-primary py-2 text-sm disabled:opacity-50"
            >
              {creandoCliente ? 'Creando...' : 'Crear y usar este cliente'}
            </button>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
