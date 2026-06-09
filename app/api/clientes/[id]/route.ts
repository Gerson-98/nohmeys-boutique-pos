import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cliente = await db.cliente.findUnique({
      where: { id: params.id },
      include: {
        ventas: {
          where: { estado: { not: 'ANULADA' } },
          orderBy: { createdAt: 'desc' },
          include: {
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
        },
        vales: {
          where: { isUsed: false },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Calcular estadísticas
    const totalCompras = cliente.ventas.reduce((s, v) => s + v.total, 0);
    const cantidadVentas = cliente.ventas.length;

    return NextResponse.json({ data: { ...cliente, totalCompras, cantidadVentas } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { nombre, telefono, email, nit, direccion } = body;

    if (!nombre?.trim() || nombre.trim().length < 2) {
      return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 });
    }

    const cliente = await db.cliente.update({
      where: { id: params.id },
      data: {
        nombre: nombre.trim(),
        telefono: telefono?.trim() || null,
        email: email?.trim() || null,
        nit: nit?.trim() || null,
        direccion: direccion?.trim() || null,
      },
    });

    return NextResponse.json({ data: cliente });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isActive } = await req.json();
    const cliente = await db.cliente.update({
      where: { id: params.id },
      data: { isActive },
    });
    return NextResponse.json({ data: cliente });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
