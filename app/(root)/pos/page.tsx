'use client';
import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, ChevronDown, Trash2, LogOut } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { formatPrecio } from '@/lib/boutique';

import { SesionModal } from './components/SesionModal';
import { ProductSearch } from './components/ProductSearch';
import { CartItemRow } from './components/CartItem';
import { VariantSelectorModal } from './components/VariantSelectorModal';
import { ClienteSelector } from './components/ClienteSelector';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal, type VentaDetalle } from './components/ReceiptModal';

import type { CartItem, CajeroPOS, ClientePOS, PagoInput, ProductoPOS, VariantePOS } from './types';

const SESSION_KEY = 'pos_cajero';

export default function POSPage() {
  // Sesión
  const [cajero, setCajero] = useState<CajeroPOS | null>(null);

  // Catálogo / variantes
  const [productoParaVariante, setProductoParaVariante] = useState<ProductoPOS | null>(null);

  // Carrito
  const [items, setItems] = useState<CartItem[]>([]);
  const [cliente, setCliente] = useState<ClientePOS | null>(null);
  const [descuentoGlobal, setDescuentoGlobal] = useState(0); // monto en Q

  // Modales
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [ventaCompleta, setVentaCompleta] = useState<VentaDetalle | null>(null);

  // Mobile tab
  const [tabActivo, setTabActivo] = useState<'catalogo' | 'carrito'>('catalogo');

  // Cargar sesión desde localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) setCajero(JSON.parse(stored));
    } catch {
      // sesión inválida, mostrar selector
    }
  }, []);

  function seleccionarCajero(c: CajeroPOS) {
    setCajero(c);
    localStorage.setItem(SESSION_KEY, JSON.stringify(c));
  }

  function cerrarSesion() {
    localStorage.removeItem(SESSION_KEY);
    setCajero(null);
  }

  // ── Carrito ──────────────────────────────────────────────
  const agregarAlCarrito = useCallback(
    (producto: ProductoPOS, variante: VariantePOS) => {
      const varianteLabel = [variante.talla, variante.color].filter(Boolean).join(' / ') || variante.sku;
      setItems((prev) => {
        const existente = prev.find((i) => i.varianteId === variante.id);
        if (existente) {
          if (existente.cantidad >= variante.stockActual) {
            toast.warning(`Solo hay ${variante.stockActual} unidades disponibles`);
            return prev;
          }
          return prev.map((i) =>
            i.varianteId === variante.id ? { ...i, cantidad: i.cantidad + 1 } : i
          );
        }
        return [
          ...prev,
          {
            varianteId: variante.id,
            productoId: producto.id,
            nombre: producto.nombre,
            varianteLabel,
            sku: variante.sku,
            imagenUrl: producto.imagenUrl,
            precio: variante.precioVenta ?? producto.precioVenta,
            cantidad: 1,
            descuentoMonto: 0,
            stockActual: variante.stockActual,
          },
        ];
      });
      setTabActivo('carrito');
    },
    []
  );

  function handleProductoClick(producto: ProductoPOS) {
    if (producto.variantes.length === 1) {
      agregarAlCarrito(producto, producto.variantes[0]);
    } else {
      setProductoParaVariante(producto);
    }
  }

  function handleVarianteSeleccionada(variante: VariantePOS) {
    if (productoParaVariante) {
      agregarAlCarrito(productoParaVariante, variante);
      setProductoParaVariante(null);
    }
  }

  function actualizarCantidad(varianteId: string, delta: number) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.varianteId !== varianteId) return i;
        const nueva = i.cantidad + delta;
        if (nueva < 1 || nueva > i.stockActual) return i;
        return { ...i, cantidad: nueva };
      })
    );
  }

  function actualizarDescuento(varianteId: string, monto: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.varianteId === varianteId
          ? { ...i, descuentoMonto: Math.min(Math.max(monto, 0), i.precio * i.cantidad) }
          : i
      )
    );
  }

  function eliminarItem(varianteId: string) {
    setItems((prev) => prev.filter((i) => i.varianteId !== varianteId));
  }

  function limpiarCarrito() {
    setItems([]);
    setCliente(null);
    setDescuentoGlobal(0);
  }

  // ── Totales ──────────────────────────────────────────────
  const subtotalBruto = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const descuentosItems = items.reduce(
    (s, i) => s + Math.min(Math.max(i.descuentoMonto, 0), i.precio * i.cantidad),
    0
  );
  const subtotalNeto = subtotalBruto - descuentosItems;
  const descGlobalMonto = Math.min(Math.max(descuentoGlobal, 0), subtotalNeto);
  const total = subtotalNeto - descGlobalMonto;

  // ── Procesar venta ───────────────────────────────────────
  async function procesarVenta(pagos: PagoInput[]) {
    if (!cajero) return;
    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cajeroId: cajero.id,
          clienteId: cliente?.id || null,
          items: items.map((i) => ({
            varianteId: i.varianteId,
            cantidad: i.cantidad,
            precioUnitario: i.precio,
            descuento: i.descuentoMonto,
          })),
          descuentoGlobal,
          pagos,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          toast.error(
            <span>
              {data.error}{' '}
              <Link href="/caja" className="underline font-semibold">Abrir caja →</Link>
            </span>,
            { autoClose: 6000 }
          );
        } else {
          toast.error(data.error);
        }
        throw new Error(data.error);
      }
      setPaymentOpen(false);
      setVentaCompleta(data.data as VentaDetalle);
      limpiarCarrito();
    } catch (err: any) {
      if (!err.message?.includes('caja')) toast.error('Error al procesar: ' + err.message);
      throw err;
    }
  }

  // ── Render ───────────────────────────────────────────────
  if (!cajero) return <SesionModal onSeleccionar={seleccionarCajero} />;

  const CartContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Header carrito */}
      <div className="px-4 py-3 border-b border-[#F2C4CE] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-playfair font-bold text-[#2C2C2C] text-sm">
            Carrito{items.length > 0 && <span className="ml-1 text-[#C9A84C]">({items.length})</span>}
          </h2>
          {items.length > 0 && (
            <button
              onClick={limpiarCarrito}
              className="flex items-center gap-1 text-xs text-[#9E9E9E] hover:text-[#E57373] transition-colors"
            >
              <Trash2 size={12} />
              Vaciar
            </button>
          )}
        </div>
        <ClienteSelector cliente={cliente} onSeleccionar={setCliente} />
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <ShoppingCart size={28} className="text-[#E8D5A3] mb-2" />
            <p className="text-xs text-[#9E9E9E]">El carrito está vacío</p>
          </div>
        ) : (
          items.map((item) => (
            <CartItemRow
              key={item.varianteId}
              item={item}
              onCantidad={actualizarCantidad}
              onDescuento={actualizarDescuento}
              onEliminar={eliminarItem}
            />
          ))
        )}
      </div>

      {/* Totales + cobrar */}
      {items.length > 0 && (
        <div className="border-t border-[#F2C4CE] px-4 py-4 space-y-3 flex-shrink-0">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-[#9E9E9E]">
              <span>Subtotal</span>
              <span className="font-mono">{formatPrecio(subtotalBruto)}</span>
            </div>
            {descuentosItems > 0 && (
              <div className="flex justify-between text-[#9E9E9E]">
                <span>Desc. ítems</span>
                <span className="font-mono text-[#E57373]">-{formatPrecio(descuentosItems)}</span>
              </div>
            )}
            {/* Descuento global */}
            <div className="flex items-center justify-between">
              <span className="text-[#9E9E9E] text-xs">Desc. global (Q)</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={subtotalNeto}
                  step={0.01}
                  value={descuentoGlobal || ''}
                  onChange={(e) =>
                    setDescuentoGlobal(Math.min(subtotalNeto, Math.max(0, Number(e.target.value) || 0)))
                  }
                  className="w-16 text-center text-xs font-mono input-boutique py-0.5 px-1"
                  placeholder="0.00"
                />
                {descGlobalMonto > 0 && (
                  <span className="text-xs font-mono text-[#E57373]">-{formatPrecio(descGlobalMonto)}</span>
                )}
              </div>
            </div>
            <div className="flex justify-between font-bold text-[#2C2C2C] text-base pt-1 border-t border-[#F2C4CE]">
              <span>TOTAL</span>
              <span className="font-mono text-[#C9A84C]">{formatPrecio(total)}</span>
            </div>
          </div>

          <button
            onClick={() => setPaymentOpen(true)}
            className="w-full btn-boutique-primary py-3 text-base flex items-center justify-center gap-2"
          >
            <ShoppingCart size={18} />
            Cobrar {formatPrecio(total)}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-0px)] flex flex-col -m-4 lg:-m-6">
        {/* Barra superior cajero */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#FAFAFA] border-b border-[#F2C4CE] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#F2C4CE] flex items-center justify-center text-[#C9A84C] text-xs font-bold font-playfair">
              {cajero.nombre.charAt(0)}
            </div>
            <span className="text-xs font-medium text-[#2C2C2C]">{cajero.nombre}</span>
          </div>
          <button
            onClick={cerrarSesion}
            className="flex items-center gap-1 text-xs text-[#9E9E9E] hover:text-[#E57373] transition-colors"
          >
            <LogOut size={13} />
            Cambiar sesión
          </button>
        </div>

        {/* Tabs mobile */}
        <div className="md:hidden flex border-b border-[#F2C4CE] flex-shrink-0 bg-white">
          <button
            onClick={() => setTabActivo('catalogo')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tabActivo === 'catalogo'
                ? 'text-[#C9A84C] border-b-2 border-[#C9A84C]'
                : 'text-[#9E9E9E]'
            }`}
          >
            Catálogo
          </button>
          <button
            onClick={() => setTabActivo('carrito')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
              tabActivo === 'carrito'
                ? 'text-[#C9A84C] border-b-2 border-[#C9A84C]'
                : 'text-[#9E9E9E]'
            }`}
          >
            Carrito
            {items.length > 0 && (
              <span className="absolute top-1.5 right-8 w-4 h-4 bg-[#E57373] text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {items.length}
              </span>
            )}
          </button>
        </div>

        {/* Layout desktop: panel dividido */}
        <div className="flex-1 overflow-hidden flex">
          {/* Panel catálogo */}
          <div
            className={`flex-1 border-r border-[#F2C4CE] overflow-hidden ${
              tabActivo === 'carrito' ? 'hidden md:flex md:flex-col' : 'flex flex-col'
            }`}
          >
            <ProductSearch onAgregarProducto={handleProductoClick} />
          </div>

          {/* Panel carrito */}
          <div
            className={`md:w-[360px] lg:w-[400px] flex-shrink-0 overflow-hidden ${
              tabActivo === 'catalogo' ? 'hidden md:flex md:flex-col' : 'flex flex-col w-full'
            }`}
          >
            {CartContent}
          </div>
        </div>
      </div>

      {/* Modal selector de variante */}
      <VariantSelectorModal
        producto={productoParaVariante}
        onSeleccionar={handleVarianteSeleccionada}
        onCerrar={() => setProductoParaVariante(null)}
      />

      {/* Modal de pago */}
      <PaymentModal
        open={paymentOpen}
        total={total}
        cliente={cliente}
        onConfirmar={procesarVenta}
        onCerrar={() => setPaymentOpen(false)}
      />

      {/* Modal de ticket */}
      <ReceiptModal
        venta={ventaCompleta}
        onNuevaVenta={() => setVentaCompleta(null)}
      />
    </>
  );
}
