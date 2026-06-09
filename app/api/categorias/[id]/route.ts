import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoria = await db.categoria.findUnique({
      where: { id: params.id },
      include: { productos: { where: { isActive: true } } },
    });
    if (!categoria) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ data: categoria });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al obtener categoría: ' + error.message },
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
    const { nombre, icono, orden } = body;

    if (!nombre || nombre.trim().length < 2) {
      return NextResponse.json(
        { error: 'El nombre debe tener al menos 2 caracteres' },
        { status: 400 }
      );
    }

    const categoria = await db.categoria.update({
      where: { id: params.id },
      data: {
        nombre: nombre.trim(),
        icono: icono ?? undefined,
        orden: orden ?? undefined,
      },
    });

    return NextResponse.json({ data: categoria });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al actualizar categoría: ' + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productosCount = await db.producto.count({
      where: { categoriaId: params.id, isActive: true },
    });
    if (productosCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: tiene ${productosCount} producto(s) activo(s)` },
        { status: 409 }
      );
    }

    await db.categoria.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Categoría eliminada correctamente' });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al eliminar categoría: ' + error.message },
      { status: 500 }
    );
  }
}
