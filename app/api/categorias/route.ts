import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const categorias = await db.categoria.findMany({
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      include: {
        _count: { select: { productos: { where: { isActive: true } } } },
      },
    });
    return NextResponse.json({ data: categorias });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al obtener categorías: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, icono, orden } = body;

    if (!nombre || nombre.trim().length < 2) {
      return NextResponse.json(
        { error: 'El nombre de la categoría debe tener al menos 2 caracteres' },
        { status: 400 }
      );
    }

    const existe = await db.categoria.findUnique({ where: { nombre: nombre.trim() } });
    if (existe) {
      return NextResponse.json(
        { error: 'Ya existe una categoría con ese nombre' },
        { status: 409 }
      );
    }

    const categoria = await db.categoria.create({
      data: {
        nombre: nombre.trim(),
        icono: icono || null,
        orden: orden ?? 0,
      },
    });

    return NextResponse.json({ data: categoria }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al crear categoría: ' + error.message },
      { status: 500 }
    );
  }
}
