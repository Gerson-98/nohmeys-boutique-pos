import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

// GET: obtener caja abierta actual (si existe).
// El rol CAJERO solo puede ver la caja abierta si él mismo la abrió (no ve turnos abiertos por otros cajeros).
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);

    const cajaAbierta = await db.cierreCaja.findFirst({
      where: { estado: 'ABIERTA' },
      include: {
        cajero: { select: { nombre: true } },
        ventas: {
          orderBy: { createdAt: 'desc' },
          include: {
            pagos: { include: { transferencia: { select: { estado: true } } } },
            cajero: { select: { nombre: true } },
            cliente: { select: { nombre: true } },
            detalles: {
              include: {
                variante: {
                  select: { sku: true, talla: true, color: true, producto: { select: { nombre: true } } },
                },
              },
            },
          },
        },
        devoluciones: { select: { detalle: true } },
      },
      orderBy: { abiertaEn: 'desc' },
    });

    if (!cajaAbierta) {
      return NextResponse.json({ data: null });
    }

    // CAJERO: solo puede ver la caja abierta si él mismo la abrió
    if (session?.rol === 'CAJERO' && cajaAbierta.cajeroId !== session.userId) {
      return NextResponse.json({ data: null });
    }

    // Calcular totales del turno
    const ventasCompletadas = cajaAbierta.ventas.filter((v) => v.estado !== 'ANULADA');
    const todosPagos = ventasCompletadas.flatMap((v) => v.pagos);

    // El efectivo en caja es el monto recibido en efectivo menos el cambio entregado
    const totalEfectivoBruto = todosPagos
      .filter((p) => p.metodo === 'EFECTIVO')
      .reduce((s, p) => s + p.monto, 0);
    const totalCambio = ventasCompletadas.reduce((s, v) => s + v.cambio, 0);

    // Ajuste de efectivo por devoluciones del turno (positivo = sale efectivo, negativo = entra efectivo)
    const totalAjusteDevoluciones = cajaAbierta.devoluciones.reduce((s, dev) => {
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

    const totalVentas = ventasCompletadas.reduce((s, v) => s + v.total, 0);

    return NextResponse.json({
      data: {
        ...cajaAbierta,
        resumen: {
          cantidadVentas: ventasCompletadas.length,
          totalVentas,
          totalEfectivo,
          totalTarjeta,
          totalTransferencia,
          totalTransferenciaPendiente,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: abrir caja
export async function POST(req: NextRequest) {
  try {
    const { cajeroId, fondoInicial } = await req.json();

    if (!cajeroId) {
      return NextResponse.json({ error: 'Se requiere el cajero' }, { status: 400 });
    }
    if (fondoInicial == null || fondoInicial < 0) {
      return NextResponse.json({ error: 'El fondo inicial debe ser mayor o igual a 0' }, { status: 400 });
    }

    // Verificar que no haya una caja abierta
    const cajaExistente = await db.cierreCaja.findFirst({
      where: { estado: 'ABIERTA' },
      include: { cajero: { select: { nombre: true } } },
    });
    if (cajaExistente) {
      return NextResponse.json(
        { error: `Ya hay una caja abierta (turno de ${cajaExistente.cajero.nombre}). Debe cerrarse antes de abrir una nueva.` },
        { status: 409 }
      );
    }

    const caja = await db.cierreCaja.create({
      data: { cajeroId, fondoInicial, estado: 'ABIERTA' },
      include: { cajero: { select: { nombre: true } } },
    });

    return NextResponse.json({ data: caja }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
