'use client';
import { useState, useEffect } from 'react';
import { CreditCard, Banknote, Wifi, ArrowRight, Check, Plus, X, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPrecio, CONSUMIDOR_FINAL_ID } from '@/lib/boutique';
import { toast } from 'react-toastify';
import type { PagoInput, BancoPOS, ClientePOS } from '../types';

const METODOS = [
  { value: 'EFECTIVO', label: 'Efectivo', icon: <Banknote size={18} /> },
  { value: 'TARJETA', label: 'Tarjeta', icon: <CreditCard size={18} /> },
  { value: 'TRANSFERENCIA', label: 'Transferencia', icon: <Wifi size={18} /> },
] as const;

// Métodos que requieren un cliente identificado (no "Consumidor Final")
const METODOS_REQUIEREN_CLIENTE = ['TARJETA', 'TRANSFERENCIA'];

interface Props {
  open: boolean;
  total: number;
  cliente: ClientePOS | null;
  onConfirmar: (pagos: PagoInput[]) => Promise<void>;
  onCerrar: () => void;
}

export function PaymentModal({ open, total, cliente, onConfirmar, onCerrar }: Props) {
  const [metodo, setMetodo] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO'>('EFECTIVO');
  const [montoEfectivo, setMontoEfectivo] = useState<number>(0);
  const [montoTarjeta, setMontoTarjeta] = useState<number>(0);
  const [montoTransferencia, setMontoTransferencia] = useState<number>(0);
  const [bancoTarjetaId, setBancoTarjetaId] = useState('');
  const [bancoTransferenciaId, setBancoTransferenciaId] = useState('');
  const [referenciaTarjeta, setReferenciaTarjeta] = useState('');
  const [referenciaTransferencia, setReferenciaTransferencia] = useState('');
  const [procesando, setProcesando] = useState(false);

  const [bancos, setBancos] = useState<BancoPOS[]>([]);
  const [nuevoBancoFor, setNuevoBancoFor] = useState<'TARJETA' | 'TRANSFERENCIA' | null>(null);
  const [nuevoBancoNombre, setNuevoBancoNombre] = useState('');
  const [nuevoBancoTipo, setNuevoBancoTipo] = useState<'NACIONAL' | 'INTERNACIONAL'>('NACIONAL');
  const [creandoBanco, setCreandoBanco] = useState(false);

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
      cargarBancos();
    }
  }, [open]);

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
    } catch (err: any) {
      toast.error('Error al crear banco: ' + err.message);
    } finally {
      setCreandoBanco(false);
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

  async function handleConfirmar() {
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
        <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Banco</label>
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
            className="w-9 h-9 flex items-center justify-center rounded-xl border-2 border-[#E8D5A3] text-[#C9A84C] hover:border-[#C9A84C] transition-colors flex-shrink-0"
            title="Agregar banco"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="relative max-w-sm rounded-2xl border border-[#F2C4CE] p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-[#F2C4CE] bg-[#FAFAFA]">
          <DialogTitle className="font-playfair text-lg font-bold text-[#2C2C2C]">
            Cobrar venta
          </DialogTitle>
          <p className="text-2xl font-mono font-bold text-[#C9A84C] mt-1">
            {formatPrecio(total)}
          </p>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Selector de método */}
          <div>
            <p className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide mb-2">
              Método de pago
            </p>
            <div className="grid grid-cols-2 gap-2">
              {METODOS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMetodo(m.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                    ${metodo === m.value
                      ? 'border-[#C9A84C] bg-[#F8E1E7] text-[#C9A84C]'
                      : 'border-[#E8D5A3] text-[#2C2C2C] hover:border-[#C9A84C]'
                    }`}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
              <button
                onClick={() => setMetodo('MIXTO')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                  ${metodo === 'MIXTO'
                    ? 'border-[#C9A84C] bg-[#F8E1E7] text-[#C9A84C]'
                    : 'border-[#E8D5A3] text-[#2C2C2C] hover:border-[#C9A84C]'
                  }`}
              >
                <ArrowRight size={18} />
                Mixto
              </button>
            </div>
          </div>

          {/* Aviso de cliente requerido */}
          {requiereCliente() && sinClienteValido && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-[#E57373] bg-[#E57373]/10 text-[#E57373] text-xs">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>
                Para pagos con tarjeta o transferencia debe seleccionar o registrar un cliente. Cierre este
                diálogo y elija un cliente en el carrito.
              </span>
            </div>
          )}

          {/* Campos según método */}
          {metodo === 'EFECTIVO' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#2C2C2C] mb-1">
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
                <div className="flex items-center justify-between px-4 py-3 bg-[#6DBF94]/10 rounded-xl border border-[#6DBF94]">
                  <span className="text-sm font-medium text-[#2C2C2C]">Cambio</span>
                  <span className="text-lg font-mono font-bold text-[#6DBF94]">
                    {formatPrecio(cambio)}
                  </span>
                </div>
              )}
            </div>
          )}

          {metodo === 'TARJETA' && (
            <div className="space-y-3">
              {renderSelectorBanco(bancoTarjetaId, setBancoTarjetaId, 'TARJETA')}
              <div>
                <label className="block text-xs font-medium text-[#2C2C2C] mb-1">
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
                <label className="block text-xs font-medium text-[#2C2C2C] mb-1">
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
              <p className="text-[11px] text-[#9E9E9E]">
                Esta transferencia quedará marcada como <span className="font-medium text-[#C9A84C]">pendiente de validación</span> hasta que un administrador la confirme.
              </p>
            </div>
          )}

          {metodo === 'MIXTO' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Efectivo (Q)</label>
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
              <div>
                <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Tarjeta (Q)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={montoTarjeta || ''}
                  onChange={(e) => setMontoTarjeta(parseFloat(e.target.value) || 0)}
                  className="w-full input-boutique font-mono"
                />
              </div>
              {montoTarjeta > 0 && renderSelectorBanco(bancoTarjetaId, setBancoTarjetaId, 'TARJETA')}

              <div>
                <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Transferencia (Q)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={montoTransferencia || ''}
                  onChange={(e) => setMontoTransferencia(parseFloat(e.target.value) || 0)}
                  className="w-full input-boutique font-mono"
                />
              </div>
              {montoTransferencia > 0 && renderSelectorBanco(bancoTransferenciaId, setBancoTransferenciaId, 'TRANSFERENCIA')}

              {asignadoMixto > 0 && (
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-mono
                  ${mixtoCoincide
                    ? 'bg-[#6DBF94]/10 border-[#6DBF94] text-[#6DBF94]'
                    : 'bg-[#E57373]/10 border-[#E57373] text-[#E57373]'
                  }`}>
                  <span>Asignado: {formatPrecio(asignadoMixto)}</span>
                  <span>Total: {formatPrecio(total)}</span>
                </div>
              )}
            </div>
          )}

          {/* Botón confirmar */}
          <button
            onClick={handleConfirmar}
            disabled={!esValido() || procesando}
            className="w-full btn-boutique-primary flex items-center justify-center gap-2 py-3 text-base disabled:opacity-50"
          >
            {procesando ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check size={18} />
            )}
            Confirmar venta
          </button>
        </div>

        {/* Mini-modal: nuevo banco */}
        {nuevoBancoFor && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4 z-10">
            <div className="bg-white rounded-2xl border border-[#F2C4CE] w-full max-w-xs p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-playfair font-bold text-[#2C2C2C] text-sm">Nuevo banco</h3>
                <button onClick={() => setNuevoBancoFor(null)} className="text-[#9E9E9E] hover:text-[#E57373]">
                  <X size={16} />
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Nombre del banco</label>
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
                <label className="block text-xs font-medium text-[#2C2C2C] mb-1">Tipo</label>
                <div className="flex gap-2">
                  {(['NACIONAL', 'INTERNACIONAL'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNuevoBancoTipo(t)}
                      className={`flex-1 px-2 py-1.5 rounded-lg border-2 text-xs font-medium transition-all
                        ${nuevoBancoTipo === t
                          ? 'border-[#C9A84C] bg-[#F8E1E7] text-[#C9A84C]'
                          : 'border-[#E8D5A3] text-[#2C2C2C]'
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
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
