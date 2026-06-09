import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { startOfDay, endOfDay, startOfMonth, subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function GET() {
  try {
    const hoy = new Date();
    const inicioHoy = startOfDay(hoy);
    const finHoy = endOfDay(hoy);
    const inicioMes = startOfMonth(hoy);
    const hace7 = startOfDay(subDays(hoy, 6));

    // KPIs paralelos
    const [ventasHoy, ventasMes, totalClientes, cajaAbierta, stockBajo, detalles7, ultimasVentas] =
      await Promise.all([
        db.venta.findMany({
          where: { estado: 'COMPLETADA', createdAt: { gte: inicioHoy, lte: finHoy } },
          select: { total: true },
        }),
        db.venta.aggregate({
          where: { estado: 'COMPLETADA', createdAt: { gte: inicioMes } },
          _sum: { total: true },
          _count: true,
        }),
        db.cliente.count({ where: { isActive: true } }),
        db.cierreCaja.findFirst({
          where: { estado: 'ABIERTA' },
          select: { id: true, cajero: { select: { nombre: true } }, abiertaEn: true },
        }),
        // Stock bajo: stockActual <= stockMinimo
        db.variante.findMany({
          where: { isActive: true, producto: { isActive: true } },
          select: {
            id: true, sku: true, talla: true, color: true,
            stockActual: true, stockMinimo: true,
            producto: { select: { nombre: true, imagenUrl: true } },
          },
          orderBy: { stockActual: 'asc' },
          take: 100,
        }).then((vs) => vs.filter((v) => v.stockActual <= v.stockMinimo).slice(0, 20)),
        db.detalleVenta.findMany({
          where: { venta: { estado: 'COMPLETADA', createdAt: { gte: hace7 } } },
          select: {
            cantidad: true, subtotal: true,
            variante: { select: { producto: { select: { id: true, nombre: true } } } },
          },
        }),
        db.venta.findMany({
          where: { estado: 'COMPLETADA' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true, numeroTicket: true, total: true, metodoPago: true, createdAt: true,
            cajero: { select: { nombre: true } },
            cliente: { select: { nombre: true } },
            _count: { select: { detalles: true } },
          },
        }),
      ]);

    // Serie últimos 7 días
    const serie7dias: { label: string; ingresos: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dia = subDays(hoy, i);
      const agg = await db.venta.aggregate({
        where: {
          estado: 'COMPLETADA',
          createdAt: { gte: startOfDay(dia), lte: endOfDay(dia) },
        },
        _sum: { total: true },
      });
      serie7dias.push({
        label: format(dia, 'EEE', { locale: es }),
        ingresos: agg._sum.total ?? 0,
      });
    }

    // Top 5 productos
    const topMap = new Map<string, { nombre: string; cantidad: number; ingreso: number }>();
    for (const d of detalles7) {
      const pid = d.variante.producto.id;
      const prev = topMap.get(pid) ?? { nombre: d.variante.producto.nombre, cantidad: 0, ingreso: 0 };
      topMap.set(pid, { ...prev, cantidad: prev.cantidad + d.cantidad, ingreso: prev.ingreso + d.subtotal });
    }
    const topProductos = Array.from(topMap.values()).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);

    return NextResponse.json({
      data: {
        kpis: {
          ingresoHoy: ventasHoy.reduce((s, v) => s + v.total, 0),
          ventasHoy: ventasHoy.length,
          ingresoMes: ventasMes._sum.total ?? 0,
          ventasMes: ventasMes._count,
          totalClientes,
          cajaAbierta,
        },
        alertasStock: stockBajo,
        serie7dias,
        topProductos,
        ultimasVentas,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
