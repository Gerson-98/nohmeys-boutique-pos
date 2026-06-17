'use client';
import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, CheckCircle, RotateCcw } from 'lucide-react';
import { formatPrecio } from '@/lib/boutique';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useShopConfig, type ShopConfigData } from '@/lib/useShopConfig';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const TIPO_LABEL: Record<string, string> = {
  EFECTIVO: 'Reembolso en efectivo',
  VALE: 'Vale de crédito',
  CAMBIO: 'Cambio de prenda',
};

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
};

export interface ComprobanteItem {
  nombre: string;
  talla: string | null;
  color: string | null;
  sku: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface ComprobanteDevolucion {
  numeroTicketOriginal: string;
  fecha: string;
  cajero: string;
  cliente: string | null;
  motivo: string;
  tipoRetorno: 'EFECTIVO' | 'VALE' | 'CAMBIO';
  itemsDevueltos: ComprobanteItem[];
  montoDevuelto: number;
  itemsCambio?: ComprobanteItem[];
  montoCambio?: number;
  diferencia?: number;
  pagoAdicional?: { metodo: string; monto: number } | null;
  vale?: { codigo: string; monto: number } | null;
  efectivoDevuelto?: number | null;
}

const Comprobante = React.forwardRef<HTMLDivElement, { data: ComprobanteDevolucion; config: ShopConfigData | null }>(
  ({ data, config }, ref) => {
    const fecha = format(new Date(data.fecha), "dd/MM/yyyy HH:mm", { locale: es });
    return (
      <div ref={ref} className="w-full max-w-[80mm] mx-auto bg-white text-boutique-dark text-[11px] font-mono leading-snug p-3">
        <div className="text-center mb-3">
          <p className="font-serif text-[15px] font-bold tracking-wide">{config?.nombreComercial ?? "Nohemy's Boutique"}</p>
          {config?.direccion && <p className="text-[9px] text-gray-500">{config.direccion}</p>}
          {config?.nit && <p className="text-[9px] text-gray-500">NIT: {config.nit}</p>}
          <p className="text-[9px] text-gray-500">Comprobante de devolución</p>
          <p className="text-[9px] text-gray-500">Guatemala, GT · {fecha}</p>
        </div>
        <div className="border-t border-dashed border-gray-300 my-2" />

        <div className="space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="text-gray-500">Ticket original:</span>
            <span className="font-bold">{data.numeroTicketOriginal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Atendido por:</span>
            <span>{data.cajero}</span>
          </div>
          {data.cliente && (
            <div className="flex justify-between">
              <span className="text-gray-500">Cliente:</span>
              <span>{data.cliente}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Tipo:</span>
            <span className="font-bold">{TIPO_LABEL[data.tipoRetorno]}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-300 my-2" />

        <p className="text-[10px] font-bold mb-1">Productos devueltos</p>
        <table className="w-full text-[10px]">
          <tbody>
            {data.itemsDevueltos.map((d, i) => (
              <tr key={i} className="align-top">
                <td className="py-0.5 pr-1">
                  <p>{d.nombre}</p>
                  <p className="text-gray-400">
                    {[d.talla, d.color].filter(Boolean).join(' / ')} · {d.sku}
                  </p>
                </td>
                <td className="text-center py-0.5">x{d.cantidad}</td>
                <td className="text-right py-0.5">{formatPrecio(d.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-dashed border-gray-300 my-2" />
        <div className="flex justify-between font-bold text-[12px]">
          <span>TOTAL DEVUELTO</span>
          <span>{formatPrecio(data.montoDevuelto)}</span>
        </div>

        {data.tipoRetorno === 'CAMBIO' && data.itemsCambio && data.itemsCambio.length > 0 && (
          <>
            <div className="border-t border-dashed border-gray-300 my-2" />
            <p className="text-[10px] font-bold mb-1">Productos de cambio</p>
            <table className="w-full text-[10px]">
              <tbody>
                {data.itemsCambio.map((d, i) => (
                  <tr key={i} className="align-top">
                    <td className="py-0.5 pr-1">
                      <p>{d.nombre}</p>
                      <p className="text-gray-400">
                        {[d.talla, d.color].filter(Boolean).join(' / ')} · {d.sku}
                      </p>
                    </td>
                    <td className="text-center py-0.5">x{d.cantidad}</td>
                    <td className="text-right py-0.5">{formatPrecio(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between text-[10px] mt-1">
              <span className="text-gray-500">Total nueva prenda</span>
              <span>{formatPrecio(data.montoCambio ?? 0)}</span>
            </div>
            {!!data.diferencia && data.diferencia > 0 && data.pagoAdicional && (
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">Diferencia pagada ({METODO_LABEL[data.pagoAdicional.metodo] ?? data.pagoAdicional.metodo})</span>
                <span>{formatPrecio(data.pagoAdicional.monto)}</span>
              </div>
            )}
            {!!data.efectivoDevuelto && (
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-gray-500">Diferencia devuelta en efectivo</span>
                <span>{formatPrecio(data.efectivoDevuelto)}</span>
              </div>
            )}
          </>
        )}

        {data.vale && (
          <>
            <div className="border-t border-dashed border-gray-300 my-2" />
            <div className="text-center">
              <p className="text-[10px] text-gray-500">Vale de crédito generado</p>
              <p className="font-bold text-[13px]">{data.vale.codigo}</p>
              <p className="font-bold">{formatPrecio(data.vale.monto)}</p>
            </div>
          </>
        )}

        <div className="border-t border-dashed border-gray-300 my-2" />
        <div className="text-[10px]">
          <p className="text-gray-500">Motivo:</p>
          <p>{data.motivo}</p>
        </div>

        <div className="border-t border-dashed border-gray-300 my-2" />
        <div className="text-center text-[9px] text-gray-400 space-y-0.5">
          <p>Documento de control interno</p>
        </div>
      </div>
    );
  }
);
Comprobante.displayName = 'Comprobante';

interface Props {
  data: ComprobanteDevolucion | null;
  onClose: () => void;
}

export function DevolucionReceiptModal({ data, onClose }: Props) {
  const config = useShopConfig();
  const ref = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => ref.current,
    documentTitle: data ? `Devolucion-${data.numeroTicketOriginal}` : 'Devolucion',
  });

  return (
    <Dialog open={data !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm w-full flex flex-col max-h-[90vh] p-0 gap-0 rounded-2xl border border-blush overflow-hidden">
        <DialogHeader className="flex flex-col items-center gap-2 p-5 border-b border-blush bg-boutique-white space-y-0">
          <div className="w-12 h-12 rounded-full bg-boutique-success/20 flex items-center justify-center">
            <CheckCircle size={26} className="text-boutique-success" />
          </div>
          <DialogTitle className="font-playfair text-xl font-bold text-boutique-dark">Devolución registrada</DialogTitle>
          <DialogDescription className="sr-only">Comprobante de devolución listo para imprimir.</DialogDescription>
          {data && <p className="text-2xl font-mono font-bold text-boutique-danger">-{formatPrecio(data.montoDevuelto)}</p>}
        </DialogHeader>

        {data && (
          <>
            <div className="flex-1 overflow-y-auto bg-boutique-gray-soft p-4">
              <Comprobante ref={ref} data={data} config={config} />
            </div>

            <div className="p-4 border-t border-blush space-y-2">
              <button onClick={handlePrint} className="w-full btn-boutique-secondary flex items-center justify-center gap-2 py-2.5 text-sm">
                <Printer size={15} /> Imprimir comprobante
              </button>
              <button onClick={onClose} className="w-full btn-boutique-primary flex items-center justify-center gap-2 py-2.5">
                <RotateCcw size={15} /> Nueva devolución
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
