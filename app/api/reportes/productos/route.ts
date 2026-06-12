import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');

    const where: any = { venta: { estado: 'COMPLETADA' } };
    if (desde || hasta) {
      where.venta = { ...where.venta, createdAt: {} };
      if (desde) where.venta.createdAt.gte = new Date(desde);
      if (hasta) {
        const h = new Date(hasta);
        h.setHours(23, 59, 59, 999);
        where.venta.createdAt.lte = h;
      }
    }

    // Top productos por cantidad vendida
    const detalles = await db.detalleVenta.findMany({
      where,
      select: {
        cantidad: true,
        subtotal: true,
        variante: {
          select: {
            producto: { select: { id: true, nombre: true, imagenUrl: true, categoria: { select: { nombre: true } } } },
          },
        },
      },
    });

    // Agrupar por producto
    const mapa = new Map<string, { nombre: string; imagenUrl: string | null; categoria: string; cantidad: number; ingresos: number }>();
    for (const d of detalles) {
      const prod = d.variante.producto;
      const existing = mapa.get(prod.id) ?? { nombre: prod.nombre, imagenUrl: prod.imagenUrl, categoria: prod.categoria.nombre, cantidad: 0, ingresos: 0 };
      mapa.set(prod.id, { ...existing, cantidad: existing.cantidad + d.cantidad, ingresos: existing.ingresos + d.subtotal });
    }

    const top = Array.from(mapa.entries())
      .map(([id, v]) => ({
        productoId: id,
        nombre: v.nombre,
        imagenUrl: v.imagenUrl,
        categoria: v.categoria,
        cantidadVendida: v.cantidad,
        ingresoTotal: v.ingresos,
      }))
      .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
      .slice(0, 10);

    return NextResponse.json({ data: top });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
