'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [descGlobalAjustado, setDescGlobalAjustado] = useState(false);
  const descGlobalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modales
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [ventaCompleta, setVentaCompleta] = useState<VentaDetalle | null>(null);

  // Mobile tab
  const [tabActivo, setTabActivo] = useState<'catalogo' | 'carrito'>('catalogo');

  // Confirmación para vaciar carrito
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);
  const vaciarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Vaciar carrito requiere confirmación: primer tap arma la confirmación
  // (se desarma sola a los 4s), segundo tap dentro de ese tiempo ejecuta.
  function solicitarVaciarCarrito() {
    if (vaciarTimeoutRef.current) clearTimeout(vaciarTimeoutRef.current);
    setConfirmarVaciar(true);
    vaciarTimeoutRef.current = setTimeout(() => setConfirmarVaciar(false), 4000);
  }

  function confirmarVaciarCarrito() {
    if (vaciarTimeoutRef.current) clearTimeout(vaciarTimeoutRef.current);
    setConfirmarVaciar(false);
    limpiarCarrito();
  }

  function cancelarVaciarCarrito() {
    if (vaciarTimeoutRef.current) clearTimeout(vaciarTimeoutRef.current);
    setConfirmarVaciar(false);
  }

  useEffect(() => {
    return () => {
      if (vaciarTimeoutRef.current) clearTimeout(vaciarTimeoutRef.current);
      if (descGlobalTimeoutRef.current) clearTimeout(descGlobalTimeoutRef.current);
    };
  }, []);

  function handleDescuentoGlobal(valorCrudo: number) {
    const clamped = Math.min(subtotalNeto, Math.max(0, valorCrudo || 0));
    if (clamped !== valorCrudo) {
      setDescGlobalAjustado(true);
      if (descGlobalTimeoutRef.current) clearTimeout(descGlobalTimeoutRef.current);
      descGlobalTimeoutRef.current = setTimeout(() => setDescGlobalAjustado(false), 1500);
    }
    setDescuentoGlobal(clamped);
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
    let avisoMostrado = false;
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
        avisoMostrado = true;
        if (res.status === 403) {
          toast.error(
            <span>
              {data.error}{' '}
              <Link href="/caja" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Abrir caja →</Link>
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
    } catch (err: unknown) {
      if (!avisoMostrado) {
        toast.error('No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
      }
      throw err;
    }
  }

  // ── Render ───────────────────────────────────────────────
  if (!cajero) return <SesionModal onSeleccionar={seleccionarCajero} />;

  const CartContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Header carrito */}
      <div className="px-4 py-3 border-b border-blush flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-playfair font-bold text-boutique-dark text-sm">
            Carrito{items.length > 0 && <span className="ml-1 text-gold">({items.length})</span>}
          </h2>
          {items.length > 0 && (
            confirmarVaciar ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-boutique-danger">¿Vaciar carrito?</span>
                <button
                  onClick={confirmarVaciarCarrito}
                  className="text-xs font-semibold text-boutique-danger hover:text-[#D65F5F] transition-colors px-1"
                >
                  Sí, vaciar
                </button>
                <button
                  onClick={cancelarVaciarCarrito}
                  className="text-xs text-boutique-gray-mid hover:text-boutique-dark transition-colors px-1"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={solicitarVaciarCarrito}
                className="flex items-center gap-1 text-xs text-boutique-gray-mid hover:text-boutique-danger transition-colors"
              >
                <Trash2 size={12} />
                Vaciar
              </button>
            )
          )}
        </div>
        <ClienteSelector cliente={cliente} onSeleccionar={setCliente} />
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <ShoppingCart size={28} className="text-gold-light mb-2" />
            <p className="text-xs text-boutique-gray-dark">El carrito está vacío</p>
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
        <div className="border-t border-blush px-4 py-4 space-y-3 flex-shrink-0">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-boutique-gray-dark">
              <span>Subtotal</span>
              <span className="font-mono">{formatPrecio(subtotalBruto)}</span>
            </div>
            {descuentosItems > 0 && (
              <div className="flex justify-between text-boutique-gray-dark">
                <span>Desc. ítems</span>
                <span className="font-mono text-boutique-danger">-{formatPrecio(descuentosItems)}</span>
              </div>
            )}
            {/* Descuento global */}
            <div className="flex items-center justify-between">
              <span className="text-boutique-gray-dark text-xs">Desc. global (Q)</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={subtotalNeto}
                  step={0.01}
                  value={descuentoGlobal || ''}
                  onChange={(e) => handleDescuentoGlobal(Number(e.target.value) || 0)}
                  className={`w-16 text-center text-xs font-mono input-boutique py-0.5 px-1 transition-colors ${
                    descGlobalAjustado ? 'border-boutique-danger' : ''
                  }`}
                  placeholder="0.00"
                />
                {descGlobalMonto > 0 && (
                  <span className="text-xs font-mono text-boutique-danger">-{formatPrecio(descGlobalMonto)}</span>
                )}
              </div>
            </div>
            <div className="flex justify-between font-bold text-boutique-dark text-base pt-1 border-t border-blush">
              <span>TOTAL</span>
              <span className="font-mono text-gold">{formatPrecio(total)}</span>
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
        <div className="flex items-center justify-between px-4 py-2 bg-boutique-white border-b border-blush flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blush flex items-center justify-center text-gold text-xs font-bold font-playfair">
              {cajero.nombre.charAt(0)}
            </div>
            <span className="text-xs font-medium text-boutique-dark">{cajero.nombre}</span>
          </div>
          <button
            onClick={cerrarSesion}
            className="flex items-center gap-1 text-xs text-boutique-gray-mid hover:text-boutique-danger transition-colors"
          >
            <LogOut size={13} />
            Cambiar sesión
          </button>
        </div>

        {/* Tabs mobile */}
        <div className="md:hidden flex border-b border-blush flex-shrink-0 bg-white">
          <button
            onClick={() => setTabActivo('catalogo')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tabActivo === 'catalogo'
                ? 'text-gold border-b-2 border-gold'
                : 'text-boutique-gray-mid'
            }`}
          >
            Catálogo
          </button>
          <button
            onClick={() => setTabActivo('carrito')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
              tabActivo === 'carrito'
                ? 'text-gold border-b-2 border-gold'
                : 'text-boutique-gray-mid'
            }`}
          >
            Carrito
            {items.length > 0 && (
              <span className="absolute top-1.5 right-8 w-4 h-4 bg-boutique-danger text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {items.length}
              </span>
            )}
          </button>
        </div>

        {/* Layout desktop: panel dividido */}
        <div className="flex-1 overflow-hidden flex">
          {/* Panel catálogo */}
          <div
            className={`flex-1 border-r border-blush overflow-hidden ${
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
        onSeleccionarCliente={setCliente}
      />

      {/* Modal de ticket */}
      <ReceiptModal
        venta={ventaCompleta}
        onNuevaVenta={() => setVentaCompleta(null)}
      />
    </>
  );
}
