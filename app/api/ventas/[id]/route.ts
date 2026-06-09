import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venta = await db.venta.findUnique({
      where: { id: params.id },
      include: {
        cajero: { select: { nombre: true } },
        cliente: { select: { nombre: true, telefono: true, nit: true } },
        detalles: {
          include: {
            variante: {
              select: {
                sku: true, talla: true, color: true, colorHex: true,
                producto: { select: { nombre: true, imagenUrl: true } },
              },
            },
          },
        },
        pagos: true,
      },
    });

    if (!venta) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ data: venta });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al obtener venta: ' + error.message },
      { status: 500 }
    );
  }
}
