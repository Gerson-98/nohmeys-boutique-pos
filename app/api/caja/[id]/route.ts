import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const caja = await db.cierreCaja.findUnique({
      where: { id: params.id },
      include: {
        cajero: { select: { nombre: true } },
        ventas: {
          include: { pagos: true, cliente: { select: { nombre: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!caja) return NextResponse.json({ error: 'Caja no encontrada' }, { status: 404 });
    return NextResponse.json({ data: caja });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: cerrar caja
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { efectivoFisico, notas } = await req.json();

    const caja = await db.cierreCaja.findUnique({
      where: { id: params.id },
      include: {
        ventas: {
          where: { estado: 'COMPLETADA' },
          include: { pagos: true },
        },
      },
    });

    if (!caja) return NextResponse.json({ error: 'Caja no encontrada' }, { status: 404 });
    if (caja.estado === 'CERRADA') return NextResponse.json({ error: 'La caja ya está cerrada' }, { status: 409 });

    const totalEfectivo = caja.ventas
      .flatMap((v) => v.pagos)
      .filter((p) => p.metodo === 'EFECTIVO')
      .reduce((s, p) => s + p.monto, 0);

    const totalTarjeta = caja.ventas
      .flatMap((v) => v.pagos)
      .filter((p) => p.metodo === 'TARJETA')
      .reduce((s, p) => s + p.monto, 0);

    const totalTransferencia = caja.ventas
      .flatMap((v) => v.pagos)
      .filter((p) => p.metodo === 'TRANSFERENCIA')
      .reduce((s, p) => s + p.monto, 0);

    const efectivoEsperado = caja.fondoInicial + totalEfectivo;
    const diferencia = (efectivoFisico ?? efectivoEsperado) - efectivoEsperado;

    const cajaCerrada = await db.cierreCaja.update({
      where: { id: params.id },
      data: {
        estado: 'CERRADA',
        totalEfectivo,
        totalTarjeta,
        totalTransferencia,
        efectivoFisico: efectivoFisico ?? null,
        diferencia,
        notas: notas || null,
        cerradaEn: new Date(),
      },
    });

    return NextResponse.json({ data: cajaCerrada });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
