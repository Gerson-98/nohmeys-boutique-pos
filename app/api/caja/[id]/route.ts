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
          where: { estado: { not: 'ANULADA' } },
          include: { pagos: { include: { transferencia: { select: { estado: true } } } } },
        },
        devoluciones: { select: { detalle: true } },
      },
    });

    if (!caja) return NextResponse.json({ error: 'Caja no encontrada' }, { status: 404 });
    if (caja.estado === 'CERRADA') return NextResponse.json({ error: 'La caja ya está cerrada' }, { status: 409 });

    const todosPagos = caja.ventas.flatMap((v) => v.pagos);

    // El efectivo en caja es el monto recibido en efectivo menos el cambio entregado
    const totalEfectivoBruto = todosPagos
      .filter((p) => p.metodo === 'EFECTIVO')
      .reduce((s, p) => s + p.monto, 0);
    const totalCambio = caja.ventas.reduce((s, v) => s + v.cambio, 0);

    const totalAjusteDevoluciones = caja.devoluciones.reduce((s, dev) => {
      const detalle = dev.detalle as any;
      return s + (typeof detalle?.ajusteEfectivo === 'number' ? detalle.ajusteEfectivo : 0);
    }, 0);

    const totalEfectivo = totalEfectivoBruto - totalCambio - totalAjusteDevoluciones;

    const totalTarjeta = todosPagos
      .filter((p) => p.metodo === 'TARJETA')
      .reduce((s, p) => s + p.monto, 0);

    const pagosTransferencia = todosPagos.filter((p) => p.metodo === 'TRANSFERENCIA');
    const totalTransferencia = pagosTransferencia
      .filter((p) => p.transferencia?.estado === 'VALIDADA')
      .reduce((s, p) => s + p.monto, 0);
    const totalTransferenciaPendiente = pagosTransferencia
      .filter((p) => p.transferencia?.estado === 'PENDIENTE_VALIDACION')
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

    return NextResponse.json({ data: { ...cajaCerrada, totalTransferenciaPendiente } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
