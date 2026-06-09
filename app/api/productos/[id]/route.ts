import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const producto = await db.producto.findUnique({
      where: { id: params.id },
      include: {
        categoria: true,
        variantes: { where: { isActive: true }, orderBy: [{ talla: 'asc' }, { color: 'asc' }] },
      },
    });
    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ data: producto });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al obtener producto: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { nombre, descripcion, imagenUrl, categoriaId, costo, precioVenta } = body;

    if (!nombre || nombre.trim().length < 2) {
      return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 });
    }
    if (precioVenta <= costo) {
      return NextResponse.json({ error: 'El precio de venta debe ser mayor al costo' }, { status: 400 });
    }

    const producto = await db.producto.update({
      where: { id: params.id },
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        imagenUrl: imagenUrl || null,
        categoriaId,
        costo: parseFloat(costo),
        precioVenta: parseFloat(precioVenta),
      },
      include: { categoria: true, variantes: { where: { isActive: true } } },
    });

    return NextResponse.json({ data: producto });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al actualizar producto: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { isActive } = body;

    const producto = await db.producto.update({
      where: { id: params.id },
      data: { isActive },
    });

    return NextResponse.json({ data: producto });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al cambiar estado del producto: ' + error.message },
      { status: 500 }
    );
  }
}
