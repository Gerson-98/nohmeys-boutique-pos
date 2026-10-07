export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

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
    const session = await getSessionFromRequest(req);
    const { efectivoFisico, notas } = await req.json();

    const caja = await db.cierreCaja.findUnique({
      where: { id: params.id },
      include: {
        ventas: {
          include: { pagos: { include: { transferencia: { select: { estado: true } } } } },
        },
        devoluciones: { select: { detalle: true } },
        gastos: true,
      },
    });

    if (!caja) return NextResponse.json({ error: 'Caja no encontrada' }, { status: 404 });
    if (caja.estado === 'CERRADA') return NextResponse.json({ error: 'La caja ya está cerrada' }, { status: 409 });

    // Para el flujo de efectivo se incluyen TODAS las ventas (incl. anuladas) porque el
    // dinero físicamente entró y salió; la devolución ya registra el reembolso.
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

    const totalEgresos = caja.gastos.filter((g) => g.tipo === 'EGRESO').reduce((s, g) => s + g.monto, 0);
    const totalIngresos = caja.gastos.filter((g) => g.tipo === 'INGRESO').reduce((s, g) => s + g.monto, 0);
    const totalEfectivoConGastos = totalEfectivo - totalEgresos + totalIngresos;

    const efectivoEsperado = caja.fondoInicial + totalEfectivoConGastos;
    const diferencia = (efectivoFisico ?? efectivoEsperado) - efectivoEsperado;

    const cajaCerrada = await db.cierreCaja.update({
      where: { id: params.id },
      data: {
        estado: 'CERRADA',
        totalEfectivo: totalEfectivoConGastos,
        totalTarjeta,
        totalTransferencia,
        efectivoFisico: efectivoFisico ?? null,
        diferencia,
        notas: notas || null,
        cerradaEn: new Date(),
        cerradoPorId: session?.userId ?? null,
      },
    });

    return NextResponse.json({ data: { ...cajaCerrada, totalTransferenciaPendiente } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
