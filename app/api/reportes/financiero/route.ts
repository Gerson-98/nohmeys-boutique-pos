import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { format, eachDayOfInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const desde = searchParams.get('desde') || format(new Date(Date.now() - 29 * 86400000), 'yyyy-MM-dd');
    const hasta = searchParams.get('hasta') || format(new Date(), 'yyyy-MM-dd');

    const detalles = await db.detalleVenta.findMany({
      where: {
        venta: {
          estado: 'COMPLETADA',
          createdAt: {
            gte: startOfDay(parseISO(desde)),
            lte: endOfDay(parseISO(hasta)),
          },
        },
      },
      select: {
        cantidad: true,
        subtotal: true,
        venta: { select: { createdAt: true } },
        variante: {
          select: {
            producto: { select: { id: true, nombre: true, costo: true } },
          },
        },
      },
    });

    // Serie diaria: ingresos vs ganancia
    const dias = eachDayOfInterval({ start: parseISO(desde), end: parseISO(hasta) });
    const serie = dias.map((dia) => {
      const claveDia = format(dia, 'yyyy-MM-dd');
      const detallesDia = detalles.filter((d) => format(d.venta.createdAt, 'yyyy-MM-dd') === claveDia);
      const ingresos = detallesDia.reduce((s, d) => s + d.subtotal, 0);
      const costos = detallesDia.reduce((s, d) => s + d.variante.producto.costo * d.cantidad, 0);
      return { label: format(dia, 'dd/MM'), ingresos, ganancia: ingresos - costos };
    });

    const totalIngresos = detalles.reduce((s, d) => s + d.subtotal, 0);
    const totalCostos = detalles.reduce((s, d) => s + d.variante.producto.costo * d.cantidad, 0);
    const gananciaBruta = totalIngresos - totalCostos;
    const margen = totalIngresos > 0 ? (gananciaBruta / totalIngresos) * 100 : 0;

    // Top 10 productos por ganancia neta
    const mapa = new Map<string, { nombre: string; cantidad: number; ingresos: number; costos: number }>();
    for (const d of detalles) {
      const prod = d.variante.producto;
      const existing = mapa.get(prod.id) ?? { nombre: prod.nombre, cantidad: 0, ingresos: 0, costos: 0 };
      mapa.set(prod.id, {
        nombre: prod.nombre,
        cantidad: existing.cantidad + d.cantidad,
        ingresos: existing.ingresos + d.subtotal,
        costos: existing.costos + prod.costo * d.cantidad,
      });
    }

    const topProductos = Array.from(mapa.entries())
      .map(([id, v]) => ({
        productoId: id,
        nombre: v.nombre,
        cantidadVendida: v.cantidad,
        ingresos: v.ingresos,
        costos: v.costos,
        ganancia: v.ingresos - v.costos,
      }))
      .sort((a, b) => b.ganancia - a.ganancia)
      .slice(0, 10);

    return NextResponse.json({
      data: {
        resumen: { totalIngresos, totalCostos, gananciaBruta, margen },
        serie,
        topProductos,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
