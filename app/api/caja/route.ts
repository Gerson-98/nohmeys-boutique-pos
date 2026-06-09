import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: obtener caja abierta actual (si existe)
export async function GET() {
  try {
    const cajaAbierta = await db.cierreCaja.findFirst({
      where: { estado: 'ABIERTA' },
      include: {
        cajero: { select: { nombre: true } },
        ventas: {
          orderBy: { createdAt: 'desc' },
          include: {
            pagos: true,
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
      },
      orderBy: { abiertaEn: 'desc' },
    });

    if (!cajaAbierta) {
      return NextResponse.json({ data: null });
    }

    // Calcular totales del turno
    const totalEfectivo = cajaAbierta.ventas
      .flatMap((v) => v.pagos)
      .filter((p) => p.metodo === 'EFECTIVO')
      .reduce((s, p) => s + p.monto, 0);

    const totalTarjeta = cajaAbierta.ventas
      .flatMap((v) => v.pagos)
      .filter((p) => p.metodo === 'TARJETA')
      .reduce((s, p) => s + p.monto, 0);

    const totalTransferencia = cajaAbierta.ventas
      .flatMap((v) => v.pagos)
      .filter((p) => p.metodo === 'TRANSFERENCIA')
      .reduce((s, p) => s + p.monto, 0);

    const totalVentas = cajaAbierta.ventas.reduce((s, v) => s + v.total, 0);

    return NextResponse.json({
      data: {
        ...cajaAbierta,
        resumen: {
          cantidadVentas: cajaAbierta.ventas.length,
          totalVentas,
          totalEfectivo,
          totalTarjeta,
          totalTransferencia,
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
    const cajaExistente = await db.cierreCaja.findFirst({ where: { estado: 'ABIERTA' } });
    if (cajaExistente) {
      return NextResponse.json({ error: 'Ya hay una caja abierta' }, { status: 409 });
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
