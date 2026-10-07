export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { concepto, tipo, monto, cierreCajaId } = await req.json();

    if (!concepto?.trim()) return NextResponse.json({ error: 'El concepto es requerido' }, { status: 400 });
    if (!['EGRESO', 'INGRESO'].includes(tipo)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    if (!monto || monto <= 0) return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });

    const cajaAbierta = await db.cierreCaja.findFirst({ where: { estado: 'ABIERTA' } });
    if (!cajaAbierta) return NextResponse.json({ error: 'No hay una caja abierta' }, { status: 403 });

    const cajaId = cierreCajaId || cajaAbierta.id;

    const gasto = await db.gastoCaja.create({
      data: {
        cierreCajaId: cajaId,
        concepto: concepto.trim(),
        tipo,
        monto: parseFloat(monto),
        registradoPorId: session.userId,
      },
      include: { registradoPor: { select: { nombre: true } } },
    });

    return NextResponse.json({ data: gasto }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
