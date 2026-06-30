import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

// GET /api/productos/:id: accesible para todos los roles autenticados.
// El campo "costo" se omite para el rol CAJERO (información financiera sensible).
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    const producto = await db.producto.findUnique({
      where: { id: params.id },
      include: {
        categoria: true,
        variantes: { where: { isActive: true }, orderBy: [{ talla: 'asc' }, { color: 'asc' }] },
      },
    });
    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    if (session?.rol === 'CAJERO') {
      const { costo, ...sinCosto } = producto;
      return NextResponse.json({ data: sinCosto });
    }
    return NextResponse.json({ data: producto });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al obtener producto: ' + error.message },
      { status: 500 }
    );
  }
}

// PUT /api/productos/:id: solo ADMIN y SUPERVISOR pueden editar productos (el rol CAJERO no puede agregar/editar productos).
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || (session.rol !== 'ADMIN' && session.rol !== 'SUPERVISOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { nombre, descripcion, imagenUrl, categoriaId, precioVenta, variantes, costo } = body;

    if (!nombre || nombre.trim().length < 2) {
      return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 });
    }

    if (precioVenta <= costo) {
      return NextResponse.json({ error: 'El precio de venta debe ser mayor al costo' }, { status: 400 });
    }

    // Verificar SKUs únicos dentro de la lista enviada
    if (variantes && variantes.length > 0) {
      const skus = variantes.map((v: any) => v.sku.trim().toUpperCase());
      const skusDuplicados = skus.filter((s: string, i: number) => skus.indexOf(s) !== i);
      if (skusDuplicados.length > 0) {
        return NextResponse.json(
          { error: `SKUs duplicados en la lista: ${skusDuplicados.join(', ')}` },
          { status: 400 }
        );
      }

      // Verificar que ningún SKU choque con variantes de OTROS productos
      const conflictos = await db.variante.findMany({
        where: {
          sku: { in: skus },
          productoId: { not: params.id },
        },
        select: { sku: true },
      });
      if (conflictos.length > 0) {
        return NextResponse.json(
          { error: `Los siguientes SKUs ya existen en otro producto: ${conflictos.map((c) => c.sku).join(', ')}` },
          { status: 409 }
        );
      }

      // Validar precio de venta de variante si viene definido
      for (const v of variantes) {
        if (v.precioVenta != null && v.precioVenta !== '' && parseFloat(v.precioVenta) <= 0) {
          return NextResponse.json({ error: 'El precio de venta de la variante debe ser mayor a 0' }, { status: 400 });
        }
      }
    }

    const producto = await db.$transaction(async (tx) => {
      await tx.producto.update({
        where: { id: params.id },
        data: {
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          imagenUrl: imagenUrl || null,
          categoriaId,
          costo: parseFloat(costo),
          precioVenta: parseFloat(precioVenta),
        },
      });

      if (variantes && Array.isArray(variantes)) {
        for (const v of variantes) {
          const precioVarianteVal =
            v.precioVenta != null && v.precioVenta !== '' ? parseFloat(v.precioVenta) : null;

          if (v.id) {
            const varianteActual = await tx.variante.findUnique({
              where: { id: v.id },
              select: { stockActual: true },
            });
            const nuevoStock = parseInt(v.stockActual) ?? varianteActual?.stockActual ?? 0;
            await tx.variante.update({
              where: { id: v.id },
              data: {
                sku: v.sku.trim().toUpperCase(),
                talla: v.talla || null,
                color: v.color || null,
                colorHex: v.colorHex || null,
                precioVenta: precioVarianteVal,
                stockActual: nuevoStock,
                stockMinimo: parseInt(v.stockMinimo) || 2,
              },
            });
            if (varianteActual && nuevoStock !== varianteActual.stockActual) {
              const diff = nuevoStock - varianteActual.stockActual;
              await tx.movimientoInventario.create({
                data: {
                  varianteId: v.id,
                  tipo: diff > 0 ? 'AJUSTE_ENTRADA' : 'AJUSTE_SALIDA',
                  cantidad: Math.abs(diff),
                  stockAnterior: varianteActual.stockActual,
                  stockNuevo: nuevoStock,
                  motivo: 'Ajuste desde edición de producto',
                },
              });
            }
          } else {
            const nueva = await tx.variante.create({
              data: {
                sku: v.sku.trim().toUpperCase(),
                productoId: params.id,
                talla: v.talla || null,
                color: v.color || null,
                colorHex: v.colorHex || null,
                precioVenta: precioVarianteVal,
                stockActual: parseInt(v.stockActual) || 0,
                stockMinimo: parseInt(v.stockMinimo) || 2,
              },
            });
            if (nueva.stockActual > 0) {
              await tx.movimientoInventario.create({
                data: {
                  varianteId: nueva.id,
                  tipo: 'INVENTARIO_INICIAL',
                  cantidad: nueva.stockActual,
                  stockAnterior: 0,
                  stockNuevo: nueva.stockActual,
                  motivo: 'Inventario inicial al agregar variante',
                },
              });
            }
          }
        }
      }

      return tx.producto.findUnique({
        where: { id: params.id },
        include: { categoria: true, variantes: { where: { isActive: true } } },
      });
    });

    return NextResponse.json({ data: producto });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al actualizar producto: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { isActive } = body;

    const producto = await db.producto.update({
      where: { id: params.id },
      data: { isActive },
    });

    return NextResponse.json({ data: producto });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al cambiar estado del producto: ' + error.message },
      { status: 500 }
    );
  }
}
