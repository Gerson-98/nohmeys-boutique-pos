import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

// PATCH /api/transferencias/[id] — Solo ADMIN o SUPERVISOR pueden validar transferencias
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
    }
    if (session.rol !== 'ADMIN' && session.rol !== 'SUPERVISOR') {
      return NextResponse.json(
        { error: 'Solo administradores o supervisores pueden validar transferencias' },
        { status: 403 }
      );
    }

    const transferencia = await db.transferencia.findUnique({ where: { id } });
    if (!transferencia) {
      return NextResponse.json({ error: 'Transferencia no encontrada' }, { status: 404 });
    }
    if (transferencia.estado === 'VALIDADA') {
      return NextResponse.json({ error: 'Esta transferencia ya fue validada' }, { status: 400 });
    }

    const actualizada = await db.transferencia.update({
      where: { id },
      data: {
        estado: 'VALIDADA',
        validadoPorId: session.userId,
        validadoEn: new Date(),
      },
    });

    return NextResponse.json({ data: actualizada });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al validar transferencia: ' + error.message }, { status: 500 });
  }
}
