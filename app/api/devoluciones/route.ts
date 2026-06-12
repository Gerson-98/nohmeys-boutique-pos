import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { CONSUMIDOR_FINAL_ID } from '@/lib/boutique';
import { MetodoPago } from '@prisma/client';

interface ItemDevolucion {
  detalleVentaId: string;
  cantidad: number;
}

interface ItemCambio {
  varianteId: string;
  cantidad: number;
}

interface PagoAdicional {
  metodo: MetodoPago;
  monto: number;
  bancoId?: string;
  referencia?: string;
}

function generarCodigoVale(): string {
  return `VALE-${Date.now().toString(36).toUpperCase()}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const {
      ventaId,
      motivo,
      tipoRetorno,
      items,
      itemsCambio,
      pagoAdicional,
    }: {
      ventaId: string;
      motivo: string;
      tipoRetorno: 'EFECTIVO' | 'VALE' | 'CAMBIO';
      items: ItemDevolucion[];
      itemsCambio?: ItemCambio[];
      pagoAdicional?: PagoAdicional;
    } = body;

    if (!ventaId || !motivo?.trim()) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Debe seleccionar al menos un producto a devolver' }, { status: 400 });
    }
    if (!['EFECTIVO', 'VALE', 'CAMBIO'].includes(tipoRetorno)) {
      return NextResponse.json({ error: 'Tipo de retorno inválido' }, { status: 400 });
    }

    const venta = await db.venta.findUnique({
      where: { id: ventaId },
      include: {
        pagos: { select: { metodo: true } },
        devoluciones: { select: { detalle: true } },
        detalles: { include: { variante: { select: { id: true, sku: true, stockActual: true } } } },
      },
    });
    if (!venta) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    if (venta.estado === 'ANULADA') {
      return NextResponse.json({ error: 'Esta venta ya fue anulada por completo' }, { status: 400 });
    }

    // Reglas de negocio según método de pago original
    const fueEfectivo = venta.pagos.some((p) => p.metodo === 'EFECTIVO');
    const fueTarjeta = venta.pagos.some((p) => p.metodo === 'TARJETA');
    if (tipoRetorno === 'EFECTIVO' && !fueEfectivo) {
      return NextResponse.json(
        { error: 'Solo se puede devolver en efectivo si la venta original fue pagada en efectivo' },
        { status: 400 }
      );
    }
    if (tipoRetorno === 'EFECTIVO' && fueTarjeta) {
      return NextResponse.json(
        { error: 'Si el pago original fue con tarjeta, solo se puede generar un vale de tienda' },
        { status: 400 }
      );
    }
    if (tipoRetorno === 'VALE' && (!venta.clienteId || venta.clienteId === CONSUMIDOR_FINAL_ID)) {
      return NextResponse.json(
        { error: 'Para generar un vale de crédito la venta debe estar asociada a un cliente registrado' },
        { status: 400 }
      );
    }

    // Calcular cantidades ya devueltas por línea
    const devueltoPorDetalle = new Map<string, number>();
    for (const dev of venta.devoluciones) {
      const detalle = Array.isArray(dev.detalle) ? (dev.detalle as any[]) : [];
      for (const it of detalle) {
        if (it?.detalleVentaId) {
          devueltoPorDetalle.set(it.detalleVentaId, (devueltoPorDetalle.get(it.detalleVentaId) ?? 0) + it.cantidad);
        }
      }
    }

    // Validar items contra disponibilidad y construir detalle con precios reales
    const itemsDetalle: Array<{
      detalleVentaId: string;
      varianteId: string;
      sku: string;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
    }> = [];
    let montoDevuelto = 0;

    for (const item of items) {
      if (item.cantidad <= 0) {
        return NextResponse.json({ error: 'La cantidad a devolver debe ser mayor a 0' }, { status: 400 });
      }
      const detalle = venta.detalles.find((d) => d.id === item.detalleVentaId);
      if (!detalle) {
        return NextResponse.json({ error: 'Producto no encontrado en esta venta' }, { status: 400 });
      }
      const yaDevuelto = devueltoPorDetalle.get(detalle.id) ?? 0;
      const disponible = detalle.cantidad - yaDevuelto;
      if (item.cantidad > disponible) {
        return NextResponse.json(
          { error: `No se pueden devolver ${item.cantidad} unidades de ${detalle.variante.sku}. Disponible: ${disponible}` },
          { status: 400 }
        );
      }
      const precioUnitario = detalle.subtotal / detalle.cantidad;
      const subtotalItem = precioUnitario * item.cantidad;
      montoDevuelto += subtotalItem;
      itemsDetalle.push({
        detalleVentaId: detalle.id,
        varianteId: detalle.varianteId,
        sku: detalle.variante.sku,
        cantidad: item.cantidad,
        precioUnitario,
        subtotal: subtotalItem,
      });
    }
    montoDevuelto = Math.round(montoDevuelto * 100) / 100;

    // Validar/calcular cambio por otra prenda
    let itemsCambioDetalle: Array<{ varianteId: string; sku: string; cantidad: number; precioUnitario: number; subtotal: number }> = [];
    let montoCambio = 0;
    let diferencia = 0;

    if (tipoRetorno === 'CAMBIO') {
      if (!itemsCambio || itemsCambio.length === 0) {
        return NextResponse.json({ error: 'Debe seleccionar la(s) prenda(s) de cambio' }, { status: 400 });
      }
      for (const item of itemsCambio) {
        if (item.cantidad <= 0) {
          return NextResponse.json({ error: 'La cantidad de la prenda de cambio debe ser mayor a 0' }, { status: 400 });
        }
        const variante = await db.variante.findUnique({
          where: { id: item.varianteId },
          select: { id: true, sku: true, stockActual: true, isActive: true, precioVenta: true, producto: { select: { precioVenta: true } } },
        });
        if (!variante || !variante.isActive) {
          return NextResponse.json({ error: 'Producto de cambio no encontrado o inactivo' }, { status: 400 });
        }
        if (variante.stockActual < item.cantidad) {
          return NextResponse.json({ error: `Stock insuficiente para SKU ${variante.sku}. Disponible: ${variante.stockActual}` }, { status: 409 });
        }
        const precioUnitario = variante.precioVenta ?? variante.producto.precioVenta;
        const subtotalItem = precioUnitario * item.cantidad;
        montoCambio += subtotalItem;
        itemsCambioDetalle.push({ varianteId: variante.id, sku: variante.sku, cantidad: item.cantidad, precioUnitario, subtotal: subtotalItem });
      }
      montoCambio = Math.round(montoCambio * 100) / 100;
      diferencia = Math.round((montoCambio - montoDevuelto) * 100) / 100;

      if (diferencia > 0) {
        if (!pagoAdicional || pagoAdicional.monto <= 0) {
          return NextResponse.json({ error: `La prenda de cambio cuesta ${diferencia.toFixed(2)} más. Debe registrar el pago de la diferencia` }, { status: 400 });
        }
        if (Math.abs(pagoAdicional.monto - diferencia) > 0.01) {
          return NextResponse.json({ error: `El monto del pago adicional debe ser ${diferencia.toFixed(2)}` }, { status: 400 });
        }
        if ((pagoAdicional.metodo === 'TARJETA' || pagoAdicional.metodo === 'TRANSFERENCIA') && !pagoAdicional.bancoId) {
          return NextResponse.json({ error: 'Debe seleccionar un banco para el pago de la diferencia' }, { status: 400 });
        }
      }
    }

    // Caja abierta (para impacto en efectivo)
    const cajaAbierta = await db.cierreCaja.findFirst({ where: { estado: 'ABIERTA' } });

    // Diferencia a favor del cliente sin cliente registrado: se devuelve en efectivo (no se puede emitir vale)
    const tieneClienteReal = !!venta.clienteId && venta.clienteId !== CONSUMIDOR_FINAL_ID;
    const reembolsarDiferenciaEnEfectivo = tipoRetorno === 'CAMBIO' && diferencia < 0 && !tieneClienteReal;

    // Determinar ajuste de efectivo en caja (positivo = sale efectivo de caja, negativo = entra efectivo a caja)
    let ajusteEfectivo = 0;
    if (tipoRetorno === 'EFECTIVO') {
      ajusteEfectivo = montoDevuelto;
    } else if (tipoRetorno === 'CAMBIO') {
      if (diferencia > 0 && pagoAdicional?.metodo === 'EFECTIVO') {
        ajusteEfectivo = montoDevuelto - diferencia;
      } else if (reembolsarDiferenciaEnEfectivo) {
        ajusteEfectivo = Math.abs(diferencia);
      }
      // diferencia <= 0 con cliente registrado: se genera vale, no hay impacto en efectivo
    }

    const requiereCaja = ajusteEfectivo !== 0;
    if (requiereCaja && !cajaAbierta) {
      return NextResponse.json({ error: 'No hay una caja abierta. Esta devolución afecta el efectivo de caja' }, { status: 403 });
    }

    // ¿La venta queda totalmente devuelta?
    const totalUnidadesVenta = venta.detalles.reduce((s, d) => s + d.cantidad, 0);
    const totalUnidadesDevueltasPrevias = Array.from(devueltoPorDetalle.values()).reduce((s, c) => s + c, 0);
    const totalUnidadesDevueltasAhora = items.reduce((s, i) => s + i.cantidad, 0);
    const totalDevuelto = totalUnidadesDevueltasPrevias + totalUnidadesDevueltasAhora;
    const nuevoEstado = totalDevuelto >= totalUnidadesVenta ? 'ANULADA' : 'DEVOLUCION_PARCIAL';

    const detalleJson: Record<string, unknown> = {
      items: itemsDetalle,
      ajusteEfectivo,
    };
    let valeGenerado: { codigo: string; monto: number } | null = null;

    const resultado = await db.$transaction(async (tx) => {
      // Crear devolución
      const devolucion = await tx.devolucion.create({
        data: {
          ventaId,
          motivo: motivo.trim(),
          tipoRetorno,
          monto: montoDevuelto,
          detalle: detalleJson as any,
          cierreCajaId: requiereCaja ? cajaAbierta!.id : null,
        },
      });

      // Reingresar stock de productos devueltos
      for (const item of itemsDetalle) {
        const variante = await tx.variante.findUnique({ where: { id: item.varianteId }, select: { stockActual: true } });
        const stockAnterior = variante!.stockActual;
        const stockNuevo = stockAnterior + item.cantidad;
        await tx.variante.update({ where: { id: item.varianteId }, data: { stockActual: stockNuevo } });
        await tx.movimientoInventario.create({
          data: {
            varianteId: item.varianteId,
            tipo: 'DEVOLUCION',
            cantidad: item.cantidad,
            stockAnterior,
            stockNuevo,
            motivo: `Devolución ${venta.numeroTicket}`,
            referenciaId: devolucion.id,
            usuarioId: session.userId,
          },
        });
      }

      // Cambio por otra prenda: descontar stock de las nuevas prendas
      if (tipoRetorno === 'CAMBIO') {
        for (const item of itemsCambioDetalle) {
          const variante = await tx.variante.findUnique({ where: { id: item.varianteId }, select: { stockActual: true } });
          const stockAnterior = variante!.stockActual;
          const stockNuevo = stockAnterior - item.cantidad;
          await tx.variante.update({ where: { id: item.varianteId }, data: { stockActual: stockNuevo } });
          await tx.movimientoInventario.create({
            data: {
              varianteId: item.varianteId,
              tipo: 'VENTA',
              cantidad: item.cantidad,
              stockAnterior,
              stockNuevo,
              motivo: `Cambio - Devolución ${venta.numeroTicket}`,
              referenciaId: devolucion.id,
              usuarioId: session.userId,
            },
          });
        }

        await tx.devolucion.update({
          where: { id: devolucion.id },
          data: {
            detalle: {
              ...detalleJson,
              itemsCambio: itemsCambioDetalle,
              montoCambio,
              diferencia,
              pagoAdicional: diferencia > 0 ? pagoAdicional : null,
            } as any,
          },
        });

        // Diferencia a favor del cliente: generar vale (solo si tiene cliente registrado)
        if (diferencia < 0 && tieneClienteReal) {
          const codigo = generarCodigoVale();
          const montoVale = Math.abs(diferencia);
          await tx.valeCredito.create({
            data: {
              codigo,
              clienteId: venta.clienteId!,
              devolucionId: devolucion.id,
              montoOriginal: montoVale,
              saldoActual: montoVale,
            },
          });
          valeGenerado = { codigo, monto: montoVale };
        }
      }

      // Vale de crédito por devolución completa
      if (tipoRetorno === 'VALE' && venta.clienteId && venta.clienteId !== CONSUMIDOR_FINAL_ID) {
        const codigo = generarCodigoVale();
        await tx.valeCredito.create({
          data: {
            codigo,
            clienteId: venta.clienteId,
            devolucionId: devolucion.id,
            montoOriginal: montoDevuelto,
            saldoActual: montoDevuelto,
          },
        });
        valeGenerado = { codigo, monto: montoDevuelto };
      }

      // Actualizar estado de la venta original
      await tx.venta.update({ where: { id: ventaId }, data: { estado: nuevoEstado } });

      return devolucion;
    });

    return NextResponse.json({
      data: {
        devolucion: resultado,
        montoDevuelto,
        montoCambio,
        diferencia,
        vale: valeGenerado,
        efectivoDevuelto: reembolsarDiferenciaEnEfectivo ? Math.abs(diferencia) : null,
        ventaEstado: nuevoEstado,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al procesar la devolución: ' + error.message }, { status: 500 });
  }
}
