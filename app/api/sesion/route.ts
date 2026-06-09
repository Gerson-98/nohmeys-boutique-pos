import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Devuelve usuarios activos para el selector de sesión del POS.
// Si no existen, crea un usuario admin por defecto.
export async function GET() {
  try {
    let usuarios = await db.user.findMany({
      where: { isActive: true },
      select: { id: true, nombre: true, rol: true },
      orderBy: { nombre: 'asc' },
    });

    if (usuarios.length === 0) {
      const admin = await db.user.create({
        data: {
          nombre: 'Administrador',
          username: 'admin',
          passwordHash: 'pendiente',
          rol: 'ADMIN',
          isActive: true,
        },
        select: { id: true, nombre: true, rol: true },
      });
      usuarios = [admin];
    }

    return NextResponse.json({ data: usuarios });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al obtener sesiones: ' + error.message },
      { status: 500 }
    );
  }
}
