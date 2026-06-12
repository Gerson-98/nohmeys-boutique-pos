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
