import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const categoriaId = searchParams.get('categoriaId') || '';

    const where: any = {
      isActive: true,
      variantes: { some: { isActive: true } },
    };

    if (q) {
      where.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { variantes: { some: { sku: { contains: q, mode: 'insensitive' } } } },
        { variantes: { some: { color: { contains: q, mode: 'insensitive' } } } },
        { categoria: { nombre: { contains: q, mode: 'insensitive' } } },
      ];
    }
    if (categoriaId) where.categoriaId = categoriaId;

    const productos = await db.producto.findMany({
      where,
      include: {
        categoria: { select: { id: true, nombre: true, icono: true } },
        variantes: {
          where: { isActive: true },
          select: {
            id: true, sku: true, talla: true, color: true,
            colorHex: true, precioVenta: true, stockActual: true, stockMinimo: true,
          },
          orderBy: [{ talla: 'asc' }, { color: 'asc' }],
        },
      },
      orderBy: { nombre: 'asc' },
      take: 60,
    });

    const resultado = productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      imagenUrl: p.imagenUrl,
      precioVenta: p.precioVenta,
      categoria: p.categoria,
      variantes: p.variantes,
      stockTotal: p.variantes.reduce((s, v) => s + v.stockActual, 0),
    }));

    return NextResponse.json({ data: resultado });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error en búsqueda POS: ' + error.message },
      { status: 500 }
    );
  }
}
