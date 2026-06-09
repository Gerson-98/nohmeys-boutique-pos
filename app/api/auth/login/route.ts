import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signSession, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      select: { id: true, nombre: true, username: true, passwordHash: true, rol: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Usuario no encontrado o inactivo' }, { status: 401 });
    }

    // Allow login if passwordHash is 'pendiente' with any password (first-time setup)
    const valid =
      user.passwordHash === 'pendiente'
        ? true
        : await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    const token = await signSession({
      userId: user.id,
      username: user.username,
      nombre: user.nombre,
      rol: user.rol,
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, nombre: user.nombre, username: user.username, rol: user.rol },
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12, // 12h
      secure: process.env.NODE_ENV === 'production',
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
