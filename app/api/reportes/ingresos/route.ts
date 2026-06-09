import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { format, eachDayOfInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const desde = searchParams.get('desde') || format(new Date(Date.now() - 29 * 86400000), 'yyyy-MM-dd');
    const hasta = searchParams.get('hasta') || format(new Date(), 'yyyy-MM-dd');

    const ventas = await db.venta.findMany({
      where: {
        estado: 'COMPLETADA',
        createdAt: {
          gte: startOfDay(parseISO(desde)),
          lte: endOfDay(parseISO(hasta)),
        },
      },
      select: { total: true, subtotal: true, descuentoGlobal: true, createdAt: true },
    });

    // Obtener costos via detalles
    const detallesConCosto = await db.detalleVenta.findMany({
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
        variante: { select: { producto: { select: { costo: true } } } },
      },
    });

    // Construir serie por día
    const dias = eachDayOfInterval({ start: parseISO(desde), end: parseISO(hasta) });

    const serie = dias.map((dia) => {
      const label = format(dia, 'dd/MM');
      const ventasDia = ventas.filter(
        (v) => format(v.createdAt, 'yyyy-MM-dd') === format(dia, 'yyyy-MM-dd')
      );
      const ingresos = ventasDia.reduce((s, v) => s + v.total, 0);

      // Costo de lo vendido ese día (aproximado)
      const costosDia = detallesConCosto.filter((d: any) => {
        // No tenemos la fecha del detalle directamente, así que usamos los totales del día
        return false; // simplificado — se calcula globalmente abajo
      });

      return { label, ingresos };
    });

    // Calcular ganancia global como total - costos
    const costoTotal = detallesConCosto.reduce(
      (s, d) => s + d.variante.producto.costo * d.cantidad,
      0
    );
    const ingresoTotal = ventas.reduce((s, v) => s + v.total, 0);
    const gananciaTotal = ingresoTotal - costoTotal;

    return NextResponse.json({
      data: {
        serie,
        resumen: {
          ingresoTotal,
          costoTotal,
          gananciaTotal,
          cantidadVentas: ventas.length,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
