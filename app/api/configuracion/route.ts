import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    let config = await db.shopConfig.findFirst();
    if (!config) {
      config = await db.shopConfig.create({
        data: { nombreComercial: "Nohemy's Boutique" },
      });
    }
    return NextResponse.json({ data: config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nombreComercial, razonSocial, nit, direccion, telefono,
      correo, instagram, facebook, whatsapp, logoUrl,
      politicaCambios, ivaPorcentaje,
    } = body;

    if (!nombreComercial?.trim()) {
      return NextResponse.json({ error: 'El nombre comercial es requerido' }, { status: 400 });
    }

    let config = await db.shopConfig.findFirst();
    const data = {
      nombreComercial: nombreComercial.trim(),
      razonSocial: razonSocial?.trim() || null,
      nit: nit?.trim() || null,
      direccion: direccion?.trim() || null,
      telefono: telefono?.trim() || null,
      correo: correo?.trim() || null,
      instagram: instagram?.trim() || null,
      facebook: facebook?.trim() || null,
      whatsapp: whatsapp?.trim() || null,
      logoUrl: logoUrl?.trim() || null,
      politicaCambios: politicaCambios?.trim() || null,
      ivaPorcentaje: ivaPorcentaje != null ? parseFloat(ivaPorcentaje) : 12.0,
    };

    config = config
      ? await db.shopConfig.update({ where: { id: config.id }, data })
      : await db.shopConfig.create({ data });

    return NextResponse.json({ data: config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
