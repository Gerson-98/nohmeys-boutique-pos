import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getSessionFromRequest } from '@/lib/auth';

// PUT /api/usuarios/:id: solo ADMIN y SUPERVISOR
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || (session.rol !== 'ADMIN' && session.rol !== 'SUPERVISOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { nombre, username, email, password, rol } = await req.json();

    if (!nombre?.trim() || !username?.trim()) {
      return NextResponse.json({ error: 'Nombre y usuario son requeridos' }, { status: 400 });
    }

    const existente = await db.user.findFirst({
      where: { username: username.trim().toLowerCase(), NOT: { id: params.id } },
    });
    if (existente) {
      return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 409 });
    }

    const data: any = {
      nombre: nombre.trim(),
      username: username.trim().toLowerCase(),
      email: email?.trim() || null,
      rol: rol || 'CAJERO',
    };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const user = await db.user.update({
      where: { id: params.id },
      data,
      select: { id: true, nombre: true, username: true, email: true, rol: true, isActive: true },
    });

    return NextResponse.json({ data: user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/usuarios/:id: solo ADMIN y SUPERVISOR (activar/desactivar usuario)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || (session.rol !== 'ADMIN' && session.rol !== 'SUPERVISOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { isActive } = await req.json();
    const user = await db.user.update({
      where: { id: params.id },
      data: { isActive },
      select: { id: true, isActive: true },
    });
    return NextResponse.json({ data: user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
