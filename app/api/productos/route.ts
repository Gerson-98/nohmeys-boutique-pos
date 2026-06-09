import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const buscar = searchParams.get('buscar') || '';
    const categoriaId = searchParams.get('categoriaId') || '';
    const stockFiltro = searchParams.get('stock') || 'todos'; // todos | bajo | agotado
    const pagina = parseInt(searchParams.get('pagina') || '1');
    const limite = parseInt(searchParams.get('limite') || '20');
    const skip = (pagina - 1) * limite;

    const where: any = { isActive: true };

    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { descripcion: { contains: buscar, mode: 'insensitive' } },
        { variantes: { some: { sku: { contains: buscar, mode: 'insensitive' } } } },
        { variantes: { some: { color: { contains: buscar, mode: 'insensitive' } } } },
        { categoria: { nombre: { contains: buscar, mode: 'insensitive' } } },
      ];
    }

    if (categoriaId) {
      where.categoriaId = categoriaId;
    }

    const productos = await db.producto.findMany({
      where,
      include: {
        categoria: true,
        variantes: { where: { isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limite,
    });

    // Filtrar por estado de stock después de obtener los datos
    let productosFiltrados = productos;
    if (stockFiltro === 'agotado') {
      productosFiltrados = productos.filter((p) =>
        p.variantes.every((v) => v.stockActual === 0)
      );
    } else if (stockFiltro === 'bajo') {
      productosFiltrados = productos.filter((p) =>
        p.variantes.some((v) => v.stockActual > 0 && v.stockActual <= v.stockMinimo)
      );
    }

    const total = await db.producto.count({ where });

    const productosConStock = productosFiltrados.map((p) => {
      const stockTotal = p.variantes.reduce(
        (sum: number, v: { stockActual: number }) => sum + v.stockActual,
        0
      );
      return { ...p, stockTotal };
    });

    return NextResponse.json({
      data: productosConStock,
      meta: {
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al obtener productos: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, descripcion, imagenUrl, categoriaId, costo, precioVenta, variantes } = body;

    // Validaciones básicas
    if (!nombre || nombre.trim().length < 2) {
      return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 });
    }
    if (!categoriaId) {
      return NextResponse.json({ error: 'Debe seleccionar una categoría' }, { status: 400 });
    }
    if (costo == null || costo < 0) {
      return NextResponse.json({ error: 'El costo debe ser mayor o igual a 0' }, { status: 400 });
    }
    if (!precioVenta || precioVenta <= 0) {
      return NextResponse.json({ error: 'El precio de venta debe ser mayor a 0' }, { status: 400 });
    }
    if (precioVenta <= costo) {
      return NextResponse.json({ error: 'El precio de venta debe ser mayor al costo' }, { status: 400 });
    }

    // Verificar categoría existe
    const categoria = await db.categoria.findUnique({ where: { id: categoriaId } });
    if (!categoria) {
      return NextResponse.json({ error: 'La categoría seleccionada no existe' }, { status: 400 });
    }

    // Verificar SKUs únicos si vienen variantes
    if (variantes && variantes.length > 0) {
      const skus = variantes.map((v: any) => v.sku);
      const skusDuplicados = skus.filter((s: string, i: number) => skus.indexOf(s) !== i);
      if (skusDuplicados.length > 0) {
        return NextResponse.json(
          { error: `SKUs duplicados en la lista: ${skusDuplicados.join(', ')}` },
          { status: 400 }
        );
      }
      const existentes = await db.variante.findMany({
        where: { sku: { in: skus } },
        select: { sku: true },
      });
      if (existentes.length > 0) {
        return NextResponse.json(
          { error: `Los siguientes SKUs ya existen: ${existentes.map((e) => e.sku).join(', ')}` },
          { status: 409 }
        );
      }
    }

    const producto = await db.$transaction(async (tx) => {
      const prod = await tx.producto.create({
        data: {
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          imagenUrl: imagenUrl || null,
          categoriaId,
          costo: parseFloat(costo),
          precioVenta: parseFloat(precioVenta),
        },
      });

      if (variantes && variantes.length > 0) {
        await tx.variante.createMany({
          data: variantes.map((v: any) => ({
            sku: v.sku.trim().toUpperCase(),
            productoId: prod.id,
            talla: v.talla || null,
            color: v.color || null,
            colorHex: v.colorHex || null,
            stockActual: parseInt(v.stockActual) || 0,
            stockMinimo: parseInt(v.stockMinimo) || 2,
          })),
        });

        // Registrar movimientos de inventario inicial
        const variantesCreadas = await tx.variante.findMany({
          where: { productoId: prod.id },
        });
        const movimientosConStock = variantesCreadas.filter((v) => v.stockActual > 0);
        if (movimientosConStock.length > 0) {
          await tx.movimientoInventario.createMany({
            data: movimientosConStock.map((v) => ({
              varianteId: v.id,
              tipo: 'INVENTARIO_INICIAL' as const,
              cantidad: v.stockActual,
              stockAnterior: 0,
              stockNuevo: v.stockActual,
              motivo: 'Inventario inicial al crear producto',
            })),
          });
        }
      }

      return tx.producto.findUnique({
        where: { id: prod.id },
        include: { categoria: true, variantes: true },
      });
    });

    return NextResponse.json({ data: producto }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al crear producto: ' + error.message },
      { status: 500 }
    );
  }
}
