import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getSessionFromRequest } from '@/lib/auth';

// GET /api/usuarios: solo ADMIN y SUPERVISOR (gestión de usuarios y roles)
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || (session.rol !== 'ADMIN' && session.rol !== 'SUPERVISOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const usuarios = await db.user.findMany({
      select: { id: true, nombre: true, username: true, email: true, rol: true, isActive: true, createdAt: true },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json({ data: usuarios });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/usuarios: solo ADMIN y SUPERVISOR
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || (session.rol !== 'ADMIN' && session.rol !== 'SUPERVISOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { nombre, username, email, password, rol } = await req.json();

    if (!nombre?.trim() || !username?.trim() || !password) {
      return NextResponse.json({ error: 'Nombre, usuario y contraseña son requeridos' }, { status: 400 });
    }

    const existente = await db.user.findUnique({ where: { username: username.trim().toLowerCase() } });
    if (existente) {
      return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        nombre: nombre.trim(),
        username: username.trim().toLowerCase(),
        email: email?.trim() || null,
        passwordHash,
        rol: rol || 'CAJERO',
      },
      select: { id: true, nombre: true, username: true, email: true, rol: true, isActive: true, createdAt: true },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
