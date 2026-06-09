import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MetodoPago } from '@prisma/client';

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
  descuento: number; // porcentaje 0-100
}

interface PagoInput {
  metodo: MetodoPago;
  monto: number;
  referencia?: string;
}

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

    const venta_id = await db.$transaction(async (tx) => {
      // Calcular totales
      let subtotal = 0;
      for (const item of items) {
        const lineaBase = item.precioUnitario * item.cantidad;
        const descLinea = lineaBase * (item.descuento / 100);
        subtotal += lineaBase - descLinea;
      }

      const descGlobal = subtotal * (descuentoGlobal / 100);
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
          clienteId: clienteId || null,
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
          const descLinea = lineaBase * (item.descuento / 100);
          return {
            ventaId: nuevaVenta.id,
            varianteId: item.varianteId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            descuento: item.descuento,
            subtotal: lineaBase - descLinea,
          };
        }),
      });

      // Crear pagos
      await tx.pagoVenta.createMany({
        data: pagos.map((p) => ({
          ventaId: nuevaVenta.id,
          metodo: p.metodo,
          monto: p.monto,
          referencia: p.referencia || null,
        })),
      });

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
        cliente: { select: { nombre: true, telefono: true } },
        detalles: {
          include: {
            variante: {
              include: { producto: { select: { nombre: true, imagenUrl: true } } },
            },
          },
        },
        pagos: true,
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
