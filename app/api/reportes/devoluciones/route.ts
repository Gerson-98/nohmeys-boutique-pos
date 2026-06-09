import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const pagina = parseInt(searchParams.get('pagina') || '1');
    const limite = parseInt(searchParams.get('limite') || '20');

    const where: any = {};
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt.gte = new Date(desde);
      if (hasta) where.createdAt.lte = new Date(hasta);
    }

    const [devoluciones, total, agg] = await Promise.all([
      db.devolucion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * limite,
        take: limite,
        include: {
          venta: {
            select: {
              numeroTicket: true,
              cajero: { select: { nombre: true } },
              cliente: { select: { nombre: true } },
            },
          },
          vale: { select: { codigo: true, saldoActual: true } },
        },
      }),
      db.devolucion.count({ where }),
      db.devolucion.aggregate({ where, _sum: { monto: true } }),
    ]);

    return NextResponse.json({
      data: devoluciones,
      meta: { total, pagina, limite, totalPaginas: Math.ceil(total / limite) },
      totalMonto: agg._sum.monto ?? 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ventaId, motivo, tipoRetorno, monto } = await req.json();

    if (!ventaId || !motivo || !tipoRetorno || !monto) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const venta = await db.venta.findUnique({ where: { id: ventaId } });
    if (!venta) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    if (monto > venta.total) {
      return NextResponse.json({ error: 'El monto supera el total de la venta' }, { status: 400 });
    }

    const devolucion = await db.$transaction(async (tx) => {
      const dev = await tx.devolucion.create({
        data: { ventaId, motivo, tipoRetorno, monto },
      });

      // Si es vale de crédito, crearlo
      if (tipoRetorno === 'VALE' && venta.clienteId) {
        const codigo = `VALE-${Date.now().toString(36).toUpperCase()}`;
        await tx.valeCredito.create({
          data: {
            codigo,
            clienteId: venta.clienteId,
            devolucionId: dev.id,
            montoOriginal: monto,
            saldoActual: monto,
          },
        });
      }

      // Marcar venta como devolución parcial o completa
      await tx.venta.update({
        where: { id: ventaId },
        data: { estado: monto >= venta.total ? 'ANULADA' : 'DEVOLUCION_PARCIAL' },
      });

      return dev;
    });

    return NextResponse.json({ data: devolucion }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
