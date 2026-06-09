import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productoId = searchParams.get('productoId');
    const limite = parseInt(searchParams.get('limite') || '50');

    const ajustes = await db.ajusteInventario.findMany({
      where: productoId
        ? { variante: { productoId } }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: limite,
      include: {
        variante: {
          select: {
            sku: true, talla: true, color: true, stockActual: true,
            producto: { select: { nombre: true } },
          },
        },
        usuario: { select: { nombre: true } },
      },
    });

    return NextResponse.json({ data: ajustes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { varianteId, tipo, cantidad, motivo, notas, usuarioId } = await req.json();

    if (!varianteId || !tipo || !cantidad || !motivo || !usuarioId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }
    if (cantidad <= 0) {
      return NextResponse.json({ error: 'La cantidad debe ser mayor a 0' }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      const variante = await tx.variante.findUnique({
        where: { id: varianteId },
        select: { stockActual: true, sku: true },
      });
      if (!variante) throw new Error('Variante no encontrada');

      const delta = tipo === 'ENTRADA' ? cantidad : -cantidad;
      const stockNuevo = variante.stockActual + delta;
      if (stockNuevo < 0) throw new Error(`Stock insuficiente. Actual: ${variante.stockActual}`);

      await tx.variante.update({ where: { id: varianteId }, data: { stockActual: stockNuevo } });

      const ajuste = await tx.ajusteInventario.create({
        data: { varianteId, usuarioId, tipo, cantidad, motivo, notas: notas || null },
      });

      await tx.movimientoInventario.create({
        data: {
          varianteId,
          tipo: tipo === 'ENTRADA' ? 'AJUSTE_ENTRADA' : 'AJUSTE_SALIDA',
          cantidad,
          stockAnterior: variante.stockActual,
          stockNuevo,
          motivo,
          referenciaId: ajuste.id,
          usuarioId,
        },
      });

      return ajuste;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
