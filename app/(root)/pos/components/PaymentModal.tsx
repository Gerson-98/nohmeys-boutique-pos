'use client';
import { useState } from 'react';
import { CreditCard, Banknote, Wifi, ArrowRight, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPrecio } from '@/lib/boutique';
import type { PagoInput } from '../types';

const METODOS = [
  { value: 'EFECTIVO', label: 'Efectivo', icon: <Banknote size={18} /> },
  { value: 'TARJETA', label: 'Tarjeta', icon: <CreditCard size={18} /> },
  { value: 'TRANSFERENCIA', label: 'Transferencia', icon: <Wifi size={18} /> },
] as const;

interface Props {
  open: boolean;
  total: number;
  onConfirmar: (pagos: PagoInput[]) => Promise<void>;
  onCerrar: () => void;
}

export function PaymentModal({ open, total, onConfirmar, onCerrar }: Props) {
  const [metodo, setMetodo] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO'>('EFECTIVO');
  const [montoEfectivo, setMontoEfectivo] = useState<number>(0);
  const [montoTarjeta, setMontoTarjeta] = useState<number>(0);
  const [referencia, setReferencia] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cambio = metodo === 'EFECTIVO' ? Math.max(0, montoEfectivo - total) : 0;

  function buildPagos(): PagoInput[] {
    if (metodo === 'EFECTIVO') {
      return [{ metodo: 'EFECTIVO', monto: montoEfectivo || total }];
    }
    if (metodo === 'TARJETA') {
      return [{ metodo: 'TARJETA', monto: total, referencia }];
    }
    if (metodo === 'TRANSFERENCIA') {
      return [{ metodo: 'TRANSFERENCIA', monto: total, referencia }];
    }
    // MIXTO
    const pagos: PagoInput[] = [];
    if (montoEfectivo > 0) pagos.push({ metodo: 'EFECTIVO', monto: montoEfectivo });
    if (montoTarjeta > 0) pagos.push({ metodo: 'TARJETA', monto: montoTarjeta, referencia });
    return pagos;
  }

  function esValido() {
    if (metodo === 'EFECTIVO') return montoEfectivo >= total;
    if (metodo === 'TARJETA' || metodo === 'TRANSFERENCIA') return true;
    if (metodo === 'MIXTO') return (montoEfectivo + montoTarjeta) >= total;
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-w-sm rounded-2xl border border-[#F2C4CE] p-0 overflow-hidden">
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

          {(metodo === 'TARJETA' || metodo === 'TRANSFERENCIA') && (
            <div>
              <label className="block text-xs font-medium text-[#2C2C2C] mb-1">
                Referencia / No. autorización (opcional)
              </label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="w-full input-boutique"
                placeholder="Ej: AUTH-123456"
                autoFocus
              />
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
              {montoEfectivo + montoTarjeta > 0 && (
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs
                  ${montoEfectivo + montoTarjeta >= total
                    ? 'bg-[#6DBF94]/10 border-[#6DBF94] text-[#6DBF94]'
                    : 'bg-[#E57373]/10 border-[#E57373] text-[#E57373]'
                  }`}>
                  <span>Cubierto: {formatPrecio(montoEfectivo + montoTarjeta)}</span>
                  <span>Faltante: {formatPrecio(Math.max(0, total - montoEfectivo - montoTarjeta))}</span>
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
      </DialogContent>
    </Dialog>
  );
}
