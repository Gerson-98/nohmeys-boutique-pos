import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseISO, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const varianteId = searchParams.get('varianteId');
    const productoId = searchParams.get('productoId');
    const tipo = searchParams.get('tipo');
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const limite = parseInt(searchParams.get('limite') || '100');

    const where: any = {};
    if (varianteId) where.varianteId = varianteId;
    if (productoId) where.variante = { productoId };
    if (tipo) where.tipo = tipo;
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt.gte = startOfDay(parseISO(desde));
      if (hasta) where.createdAt.lte = endOfDay(parseISO(hasta));
    }

    const movimientos = await db.movimientoInventario.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limite,
      include: {
        variante: {
          select: {
            sku: true, talla: true, color: true,
            producto: { select: { nombre: true, imagenUrl: true } },
          },
        },
      },
    });

    return NextResponse.json({ data: movimientos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
