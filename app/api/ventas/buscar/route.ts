import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface DevolucionDetalleItem {
  detalleVentaId: string;
  cantidad: number;
}

function calcularDisponibles<T extends { id: string; cantidad: number }>(
  detalles: T[],
  devoluciones: { detalle: unknown }[]
) {
  const devueltoPorDetalle = new Map<string, number>();
  for (const dev of devoluciones) {
    const items = Array.isArray(dev.detalle) ? (dev.detalle as DevolucionDetalleItem[]) : [];
    for (const item of items) {
      devueltoPorDetalle.set(item.detalleVentaId, (devueltoPorDetalle.get(item.detalleVentaId) ?? 0) + item.cantidad);
    }
  }
  return detalles.map((d) => {
    const cantidadDevuelta = devueltoPorDetalle.get(d.id) ?? 0;
    return { ...d, cantidadDevuelta, cantidadDisponible: d.cantidad - cantidadDevuelta };
  });
}

const VENTA_INCLUDE = {
  cajero: { select: { nombre: true } },
  cliente: { select: { id: true, nombre: true } },
  pagos: { select: { metodo: true, monto: true } },
  devoluciones: { select: { detalle: true } },
  detalles: {
    include: {
      variante: { select: { id: true, sku: true, talla: true, color: true, producto: { select: { nombre: true } } } },
    },
  },
} as const;

function serializarVenta(venta: any) {
  const { devoluciones, detalles, ...resto } = venta;
  return {
    ...resto,
    detalles: calcularDisponibles(detalles, devoluciones),
  };
}

export async function GET(req: NextRequest) {
  const ticket = req.nextUrl.searchParams.get('ticket') || '';
  const cliente = req.nextUrl.searchParams.get('cliente') || '';

  if (!ticket && !cliente) {
    return NextResponse.json({ error: 'Se requiere número de ticket o nombre del cliente' }, { status: 400 });
  }

  try {
    if (ticket) {
      const venta = await db.venta.findUnique({
        where: { numeroTicket: ticket.toUpperCase() },
        include: VENTA_INCLUDE,
      });

      if (!venta) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
      if (venta.estado === 'ANULADA') return NextResponse.json({ error: 'Esta venta ya fue anulada' }, { status: 400 });

      return NextResponse.json({ data: serializarVenta(venta) });
    }

    // Búsqueda por nombre de cliente: devolver lista de ventas recientes
    const ventas = await db.venta.findMany({
      where: {
        estado: { not: 'ANULADA' },
        cliente: { nombre: { contains: cliente, mode: 'insensitive' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: VENTA_INCLUDE,
    });

    if (ventas.length === 0) {
      return NextResponse.json({ error: 'No se encontraron ventas para ese cliente' }, { status: 404 });
    }

    return NextResponse.json({ data: ventas.map(serializarVenta) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
