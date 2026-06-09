import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const cajeroId = searchParams.get('cajeroId') || '';
    const metodo = searchParams.get('metodo') || '';
    const pagina = parseInt(searchParams.get('pagina') || '1');
    const limite = parseInt(searchParams.get('limite') || '25');

    const where: any = { estado: 'COMPLETADA' };

    if (desde || hasta) {
      where.createdAt = {};
      // Accept full ISO strings (sent by frontend) or bare date strings
      if (desde) {
        where.createdAt.gte = new Date(desde.includes('T') ? desde : desde + 'T00:00:00.000Z');
      }
      if (hasta) {
        if (hasta.includes('T')) {
          where.createdAt.lte = new Date(hasta);
        } else {
          const hastaDate = new Date(hasta + 'T00:00:00.000Z');
          hastaDate.setUTCHours(23, 59, 59, 999);
          where.createdAt.lte = hastaDate;
        }
      }
    }
    if (cajeroId) where.cajeroId = cajeroId;
    if (metodo) where.metodoPago = metodo;

    const [ventas, total, agregado] = await Promise.all([
      db.venta.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * limite,
        take: limite,
        include: {
          cajero: { select: { nombre: true } },
          cliente: { select: { nombre: true } },
          detalles: {
            include: {
              variante: {
                select: {
                  sku: true, talla: true, color: true,
                  producto: { select: { nombre: true } },
                },
              },
            },
          },
          pagos: true,
        },
      }),
      db.venta.count({ where }),
      db.venta.aggregate({
        where,
        _sum: { total: true, descuentoGlobal: true },
        _count: true,
      }),
    ]);

    const totalMonto = agregado._sum.total ?? 0;
    const cantidad = agregado._count;

    return NextResponse.json({
      data: ventas,
      meta: { total, pagina, limite, totalPaginas: Math.ceil(total / limite) },
      resumen: {
        total: totalMonto,
        cantidad,
        promedio: cantidad > 0 ? totalMonto / cantidad : 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
