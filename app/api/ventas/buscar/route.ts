import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const ticket = req.nextUrl.searchParams.get('ticket') || '';
  if (!ticket) return NextResponse.json({ error: 'Se requiere número de ticket' }, { status: 400 });

  try {
    const venta = await db.venta.findUnique({
      where: { numeroTicket: ticket.toUpperCase() },
      include: {
        cajero: { select: { nombre: true } },
        cliente: { select: { nombre: true } },
        detalles: {
          include: { variante: { select: { sku: true, talla: true, color: true, producto: { select: { nombre: true } } } } },
        },
      },
    });

    if (!venta) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    if (venta.estado === 'ANULADA') return NextResponse.json({ error: 'Esta venta está anulada' }, { status: 400 });

    return NextResponse.json({ data: venta });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
