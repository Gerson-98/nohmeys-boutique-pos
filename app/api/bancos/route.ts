import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const todos = searchParams.get('todos') === '1';

    const bancos = await db.banco.findMany({
      where: todos ? undefined : { isActive: true },
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json({ data: bancos });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al obtener bancos: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, tipo, logoUrl } = body;

    if (!nombre || nombre.trim().length < 2) {
      return NextResponse.json({ error: 'El nombre del banco debe tener al menos 2 caracteres' }, { status: 400 });
    }
    if (tipo !== 'NACIONAL' && tipo !== 'INTERNACIONAL') {
      return NextResponse.json({ error: 'Tipo de banco inválido' }, { status: 400 });
    }

    const banco = await db.banco.create({
      data: {
        nombre: nombre.trim(),
        tipo,
        logoUrl: logoUrl?.trim() || null,
      },
    });

    return NextResponse.json({ data: banco }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al crear banco: ' + error.message }, { status: 500 });
  }
}
