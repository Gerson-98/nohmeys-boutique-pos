import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/transferencias — accesible para todos los roles autenticados (lectura)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado') || '';

    const where: any = {};
    if (estado) where.estado = estado;

    const transferencias = await db.transferencia.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        venta: {
          select: {
            numeroTicket: true,
            createdAt: true,
            cliente: { select: { nombre: true } },
          },
        },
        banco: { select: { nombre: true, tipo: true } },
        validadoPor: { select: { nombre: true } },
      },
      take: 200,
    });

    return NextResponse.json({ data: transferencias });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al obtener transferencias: ' + error.message }, { status: 500 });
  }
}
