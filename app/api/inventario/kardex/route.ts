export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
const TZ = 'America/Guatemala';
function inicioDelDia(d: Date): Date { const l = toZonedTime(d, TZ); l.setHours(0,0,0,0); return fromZonedTime(l, TZ); }
function finDelDia(d: Date): Date { const l = toZonedTime(d, TZ); l.setHours(23,59,59,999); return fromZonedTime(l, TZ); }

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
      if (desde) where.createdAt.gte = inicioDelDia(parseISO(desde));
      if (hasta) where.createdAt.lte = finDelDia(parseISO(hasta));
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
        usuario: { select: { nombre: true } },
      },
    });

    return NextResponse.json({ data: movimientos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
