'use client';
import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, CheckCircle, ShoppingBag, Download } from 'lucide-react';
import { formatPrecio } from '@/lib/boutique';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useShopConfig, type ShopConfigData } from '@/lib/useShopConfig';

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  MIXTO: 'Pago mixto',
  VALE_CREDITO: 'Vale de crédito',
};

export interface VentaDetalle {
  id: string;
  numeroTicket: string;
  createdAt: string;
  subtotal: number;
  descuentoGlobal: number;
  impuesto: number;
  total: number;
  cambio: number;
  cajero: { nombre: string };
  cliente: { nombre: string; nit?: string | null } | null;
  detalles: Array<{
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    subtotal: number;
    variante: {
      sku: string;
      talla: string | null;
      color: string | null;
      producto: { nombre: string };
    };
  }>;
  pagos: Array<{
    metodo: string;
    monto: number;
    referencia?: string | null;
    banco?: { nombre: string } | null;
    transferencia?: { estado: string; referencia: string | null } | null;
  }>;
}

interface Props {
  venta: VentaDetalle | null;
  onNuevaVenta: () => void;
}

// Ticket imprimible 80mm con forwardRef para react-to-print
const Ticket = React.forwardRef<HTMLDivElement, { venta: VentaDetalle; config: ShopConfigData | null }>(
  ({ venta, config }, ref) => {
    const fecha = format(new Date(venta.createdAt), "dd/MM/yyyy HH:mm", { locale: es });
    return (
      <div
        ref={ref}
        className="w-full max-w-[80mm] mx-auto bg-white text-[#2C2C2C] text-[11px] font-mono leading-snug p-3"
      >
        <div className="text-center mb-3">
          <p className="font-serif text-[15px] font-bold tracking-wide">{config?.nombreComercial ?? "Nohemy's Boutique"}</p>
          {config?.direccion && <p className="text-[9px] text-gray-500">{config.direccion}</p>}
          {config?.nit && <p className="text-[9px] text-gray-500">NIT: {config.nit}</p>}
          <p className="text-[9px] text-gray-500">Guatemala, GT · {fecha}</p>
        </div>
        <div className="border-t border-dashed border-gray-300 my-2" />

        <div className="space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="text-gray-500">Ticket:</span>
            <span className="font-bold">{venta.numeroTicket}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Cajero:</span>
            <span>{venta.cajero.nombre}</span>
          </div>
          {venta.cliente && (
            <div className="flex justify-between">
              <span className="text-gray-500">Cliente:</span>
              <span>{venta.cliente.nombre}</span>
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-gray-300 my-2" />

        {/* Productos */}
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left pb-1">Producto</th>
              <th className="text-center pb-1">Qty</th>
              <th className="text-right pb-1">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {venta.detalles.map((d, i) => (
              <tr key={i} className="align-top">
                <td className="py-0.5 pr-1">
                  <p>{d.variante.producto.nombre}</p>
                  <p className="text-gray-400">
                    {[d.variante.talla, d.variante.color].filter(Boolean).join(' / ')}{' '}
                    · {d.variante.sku}
                  </p>
                  <p className="text-gray-400">
                    {formatPrecio(d.precioUnitario)}{d.descuento > 0 ? ` (-${formatPrecio(d.descuento)})` : ''}
                  </p>
                </td>
                <td className="text-center py-0.5">{d.cantidad}</td>
                <td className="text-right py-0.5">{formatPrecio(d.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-dashed border-gray-300 my-2" />

        {/* Totales */}
        <div className="space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatPrecio(venta.subtotal)}</span>
          </div>
          {venta.descuentoGlobal > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Descuento</span>
              <span>-{formatPrecio(venta.descuentoGlobal)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-[12px] border-t border-gray-200 pt-1 mt-1">
            <span>TOTAL</span>
            <span>{formatPrecio(venta.total)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-300 my-2" />

        {/* Pago */}
        <div className="space-y-0.5 text-[10px]">
          {venta.pagos.length > 1 && (
            <div className="flex justify-between text-gray-400">
              <span>Pago mixto</span>
            </div>
          )}
          {venta.pagos.map((p, i) => (
            <div key={i}>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {METODO_LABEL[p.metodo] ?? p.metodo}
                  {p.banco ? ` (${p.banco.nombre})` : ''}
                </span>
                <span>{formatPrecio(p.monto)}</span>
              </div>
              {p.metodo === 'TRANSFERENCIA' && (
                <div className="text-gray-400 pl-2">
                  {p.transferencia?.referencia && <p>Ref: {p.transferencia.referencia}</p>}
                  {p.transferencia?.estado === 'PENDIENTE_VALIDACION' && (
                    <p className="font-bold">** Pendiente de validación **</p>
                  )}
                </div>
              )}
              {p.metodo === 'TARJETA' && p.referencia && (
                <div className="text-gray-400 pl-2">
                  <p>Ref: {p.referencia}</p>
                </div>
              )}
            </div>
          ))}
          {venta.cambio > 0 && (
            <div className="flex justify-between font-bold">
              <span className="text-gray-500">Cambio</span>
              <span>{formatPrecio(venta.cambio)}</span>
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-gray-300 my-2" />
        <div className="text-center text-[9px] text-gray-400 space-y-0.5">
          <p>¡Gracias por tu compra!</p>
          <p>{config?.politicaCambios || 'Cambios y devoluciones en 15 días con ticket original.'}</p>
        </div>
      </div>
    );
  }
);
Ticket.displayName = 'Ticket';

export function ReceiptModal({ venta, onNuevaVenta }: Props) {
  const config = useShopConfig();
  const ticketRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => ticketRef.current,
    documentTitle: `Ticket-${venta?.numeroTicket ?? ''}`,
  });

  function handleDescargarPDF() {
    if (!venta || !ticketRef.current) return;
    const contenido = ticketRef.current.innerHTML;
    const estilos = Array.from(document.styleSheets)
      .map((ss) => {
        try {
          return Array.from(ss.cssRules).map((r) => r.cssText).join('\n');
        } catch {
          return '';
        }
      })
      .join('\n');

    const ventana = window.open('', '_blank', 'width=400,height=700');
    if (!ventana) return;
    ventana.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket-${venta.numeroTicket}</title>
  <style>
    ${estilos}
    body { margin: 0; padding: 8px; font-family: monospace; background: white; }
    @page { size: 80mm auto; margin: 0; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>${contenido}</body>
</html>`);
    ventana.document.close();
    setTimeout(() => {
      ventana.focus();
      ventana.print();
    }, 300);
  }

  if (!venta) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card-boutique w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header éxito */}
        <div className="flex flex-col items-center gap-2 p-5 border-b border-[#F2C4CE]">
          <div className="w-12 h-12 rounded-full bg-[#6DBF94]/20 flex items-center justify-center">
            <CheckCircle size={26} className="text-[#6DBF94]" />
          </div>
          <h2 className="font-playfair text-xl font-bold text-[#2C2C2C]">¡Venta completada!</h2>
          <p className="text-xs font-mono text-[#9E9E9E]">{venta.numeroTicket}</p>
          <p className="text-2xl font-mono font-bold text-[#C9A84C]">{formatPrecio(venta.total)}</p>
        </div>

        {/* Vista previa del ticket */}
        <div className="flex-1 overflow-y-auto bg-[#F5F5F5] p-4">
          <Ticket ref={ticketRef} venta={venta} config={config} />
        </div>

        {/* Botones */}
        <div className="p-4 border-t border-[#F2C4CE] space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 btn-boutique-secondary flex items-center justify-center gap-2 py-2.5 text-sm"
            >
              <Printer size={15} />
              Imprimir
            </button>
            <button
              onClick={handleDescargarPDF}
              className="flex-1 btn-boutique-secondary flex items-center justify-center gap-2 py-2.5 text-sm"
            >
              <Download size={15} />
              Guardar PDF
            </button>
          </div>
          <button
            onClick={onNuevaVenta}
            className="w-full btn-boutique-primary flex items-center justify-center gap-2 py-2.5"
          >
            <ShoppingBag size={15} />
            Nueva venta
          </button>
        </div>
      </div>
    </div>
  );
}
