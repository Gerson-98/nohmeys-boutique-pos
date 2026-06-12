import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MetodoPago } from '@prisma/client';
import { CONSUMIDOR_FINAL_ID, CONSUMIDOR_FINAL_NOMBRE } from '@/lib/boutique';

function generarNumeroTicket(): string {
  const d = new Date();
  const fecha = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `TKT-${fecha}-${rand}`;
}

interface ItemVenta {
  varianteId: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number; // monto en Q sobre el total de la línea
}

interface PagoInput {
  metodo: MetodoPago;
  monto: number;
  referencia?: string;
  bancoId?: string;
}

// Métodos que requieren un cliente identificado (no "Consumidor Final")
const METODOS_REQUIEREN_CLIENTE: MetodoPago[] = ['TARJETA', 'TRANSFERENCIA'];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('pagina') || '1');
    const limit = 20;

    const ventas = await db.venta.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        cajero: { select: { nombre: true } },
        cliente: { select: { nombre: true } },
        _count: { select: { detalles: true } },
      },
    });

    const total = await db.venta.count();
    return NextResponse.json({ data: ventas, meta: { total, pagina: page } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      cajeroId,
      clienteId,
      items,
      descuentoGlobal,
      pagos,
      notas,
      cierreCajaId,
    }: {
      cajeroId: string;
      clienteId?: string;
      items: ItemVenta[];
      descuentoGlobal: number;
      pagos: PagoInput[];
      notas?: string;
      cierreCajaId?: string;
    } = body;

    if (!cajeroId) {
      return NextResponse.json({ error: 'Se requiere el cajero' }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
    }
    if (!pagos || pagos.length === 0) {
      return NextResponse.json({ error: 'Debe indicar al menos un método de pago' }, { status: 400 });
    }

    // Validación de cliente según método de pago (capa backend)
    const requiereCliente = pagos.some((p) => METODOS_REQUIEREN_CLIENTE.includes(p.metodo));
    if (requiereCliente && (!clienteId || clienteId === CONSUMIDOR_FINAL_ID)) {
      return NextResponse.json(
        { error: 'Para pagos con tarjeta o transferencia debe seleccionar o registrar un cliente' },
        { status: 400 }
      );
    }
    for (const p of pagos) {
      if ((p.metodo === 'TARJETA' || p.metodo === 'TRANSFERENCIA') && !p.bancoId) {
        return NextResponse.json({ error: 'Debe seleccionar un banco para el pago con ' + p.metodo.toLowerCase() }, { status: 400 });
      }
    }

    // Verificar que haya caja abierta
    const cajaAbierta = await db.cierreCaja.findFirst({ where: { estado: 'ABIERTA' } });
    if (!cajaAbierta) {
      return NextResponse.json(
        { error: 'No hay una caja abierta. Ve a Caja y abre el turno antes de vender.' },
        { status: 403 }
      );
    }
    const cajaId = cierreCajaId || cajaAbierta.id;

    // Verificar stock antes de la transacción
    for (const item of items) {
      const variante = await db.variante.findUnique({
        where: { id: item.varianteId },
        select: { stockActual: true, sku: true, isActive: true },
      });
      if (!variante || !variante.isActive) {
        return NextResponse.json(
          { error: `Variante ${item.varianteId} no encontrada o inactiva` },
          { status: 400 }
        );
      }
      if (variante.stockActual < item.cantidad) {
        return NextResponse.json(
          { error: `Stock insuficiente para SKU ${variante.sku}. Disponible: ${variante.stockActual}` },
          { status: 409 }
        );
      }
    }

    // Si es efectivo y no hay cliente, asegurar que exista "Consumidor Final"
    let clienteFinalId = clienteId || null;
    if (!clienteFinalId) {
      await db.cliente.upsert({
        where: { id: CONSUMIDOR_FINAL_ID },
        update: {},
        create: { id: CONSUMIDOR_FINAL_ID, nombre: CONSUMIDOR_FINAL_NOMBRE },
      });
      clienteFinalId = CONSUMIDOR_FINAL_ID;
    }

    const venta_id = await db.$transaction(async (tx) => {
      // Calcular totales — los descuentos vienen en Q, no porcentaje
      let subtotal = 0;
      for (const item of items) {
        const lineaBase = item.precioUnitario * item.cantidad;
        const descLinea = Math.min(Math.max(item.descuento, 0), lineaBase);
        subtotal += lineaBase - descLinea;
      }

      const descGlobal = Math.min(Math.max(descuentoGlobal || 0, 0), subtotal);
      const baseConDesc = subtotal - descGlobal;
      const impuesto = 0; // IVA ya incluido en el precio (configurable en Módulo 8)
      const total = baseConDesc + impuesto;
      const montoPagado = pagos.reduce((s, p) => s + p.monto, 0);
      const cambio = Math.max(0, montoPagado - total);

      // Determinar método de pago principal
      let metodoPago: MetodoPago = pagos[0].metodo;
      if (pagos.length > 1) metodoPago = 'MIXTO';

      // Generar número de ticket único
      let numeroTicket = generarNumeroTicket();
      let intentos = 0;
      while (await tx.venta.findUnique({ where: { numeroTicket } })) {
        numeroTicket = generarNumeroTicket();
        if (++intentos > 10) throw new Error('No se pudo generar número de ticket único');
      }

      // Crear venta
      const nuevaVenta = await tx.venta.create({
        data: {
          numeroTicket,
          cajeroId,
          clienteId: clienteFinalId,
          subtotal,
          descuentoGlobal: descGlobal,
          impuesto,
          total,
          metodoPago,
          montoPagado,
          cambio,
          notas: notas || null,
          cierreCajaId: cajaId,
          estado: 'COMPLETADA',
        },
      });

      // Crear detalles
      await tx.detalleVenta.createMany({
        data: items.map((item) => {
          const lineaBase = item.precioUnitario * item.cantidad;
          const descLinea = Math.min(Math.max(item.descuento, 0), lineaBase);
          return {
            ventaId: nuevaVenta.id,
            varianteId: item.varianteId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            descuento: descLinea,
            subtotal: lineaBase - descLinea,
          };
        }),
      });

      // Crear pagos
      for (const p of pagos) {
        const pago = await tx.pagoVenta.create({
          data: {
            ventaId: nuevaVenta.id,
            metodo: p.metodo,
            monto: p.monto,
            referencia: p.referencia || null,
            bancoId: p.bancoId || null,
          },
        });

        // Si es transferencia, crear registro pendiente de validación
        if (p.metodo === 'TRANSFERENCIA' && p.bancoId) {
          await tx.transferencia.create({
            data: {
              ventaId: nuevaVenta.id,
              pagoVentaId: pago.id,
              bancoId: p.bancoId,
              monto: p.monto,
              referencia: p.referencia || null,
              estado: 'PENDIENTE_VALIDACION',
            },
          });
        }
      }

      // Descontar stock y registrar movimientos
      for (const item of items) {
        const varianteActual = await tx.variante.findUnique({
          where: { id: item.varianteId },
          select: { stockActual: true },
        });
        const stockAnterior = varianteActual!.stockActual;
        const stockNuevo = stockAnterior - item.cantidad;

        await tx.variante.update({
          where: { id: item.varianteId },
          data: { stockActual: stockNuevo },
        });

        await tx.movimientoInventario.create({
          data: {
            varianteId: item.varianteId,
            tipo: 'VENTA',
            cantidad: item.cantidad,
            stockAnterior,
            stockNuevo,
            motivo: `Venta ${numeroTicket}`,
            referenciaId: nuevaVenta.id,
            usuarioId: cajeroId,
          },
        });
      }

      return nuevaVenta.id;
    });

    // Fetch full detail OUTSIDE transaction to avoid Neon serverless timeout
    const venta = await db.venta.findUnique({
      where: { id: venta_id },
      include: {
        cajero: { select: { nombre: true } },
        cliente: { select: { nombre: true, telefono: true, nit: true } },
        detalles: {
          include: {
            variante: {
              include: { producto: { select: { nombre: true, imagenUrl: true } } },
            },
          },
        },
        pagos: {
          include: {
            banco: { select: { nombre: true } },
            transferencia: { select: { estado: true, referencia: true } },
          },
        },
      },
    });

    return NextResponse.json({ data: venta }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al procesar venta: ' + error.message },
      { status: 500 }
    );
  }
}
