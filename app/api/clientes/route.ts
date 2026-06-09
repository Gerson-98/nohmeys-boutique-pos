import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    const where: any = { isActive: true };
    if (q) {
      where.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { telefono: { contains: q } },
        { nit: { contains: q } },
      ];
    }

    const clientes = await db.cliente.findMany({
      where,
      select: { id: true, nombre: true, telefono: true, nit: true, email: true, direccion: true, isActive: true, createdAt: true },
      orderBy: { nombre: 'asc' },
      take: 20,
    });

    return NextResponse.json({ data: clientes });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al obtener clientes: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, telefono, email, nit, direccion } = body;

    if (!nombre || nombre.trim().length < 2) {
      return NextResponse.json(
        { error: 'El nombre debe tener al menos 2 caracteres' },
        { status: 400 }
      );
    }

    const cliente = await db.cliente.create({
      data: {
        nombre: nombre.trim(),
        telefono: telefono?.trim() || null,
        email: email?.trim() || null,
        nit: nit?.trim() || null,
        direccion: direccion?.trim() || null,
      },
    });

    return NextResponse.json({ data: cliente }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al crear cliente: ' + error.message },
      { status: 500 }
    );
  }
}
