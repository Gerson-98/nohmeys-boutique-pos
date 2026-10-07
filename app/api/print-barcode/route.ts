export const dynamic = 'force-dynamic';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const PRINTER_NAME = 'AON250-Ticket';
const ESC = 0x1b;
const GS  = 0x1d;

interface BarcodeData {
  sku: string;
  nombre: string;
  variante?: string;
  precio?: number;
}

function buildBarcodeTicket(d: BarcodeData): Buffer {
  const buf: number[] = [];

  const line = (t: string) => {
    for (const c of t) buf.push(c.charCodeAt(0) > 127 ? 0x3f : c.charCodeAt(0));
    buf.push(0x0a);
  };
  const center = (t: string) => { buf.push(ESC, 0x61, 0x01); line(t); buf.push(ESC, 0x61, 0x00); };
  const bold = (on: boolean) => buf.push(ESC, 0x45, on ? 0x01 : 0x00);

  buf.push(ESC, 0x40); // init

  // Encabezado
  bold(true);
  center("Nohemy's Boutique");
  bold(false);
  buf.push(0x0a);

  // Nombre del producto
  center(d.nombre.substring(0, 42));

  // Variante (talla/color)
  if (d.variante) center(d.variante.substring(0, 42));

  // Precio
  if (d.precio != null) {
    bold(true);
    center(`Q${d.precio.toFixed(2)}`);
    bold(false);
  }

  buf.push(0x0a);

  // Configuración del código de barras
  buf.push(GS, 0x68, 60);  // altura: 60 puntos
  buf.push(GS, 0x77, 2);   // ancho módulo: 2
  buf.push(GS, 0x48, 2);   // HRI debajo del barcode
  buf.push(GS, 0x66, 0);   // fuente HRI: A

  // Imprimir Code128 — formato nuevo: GS k 73 len {B <data>
  const skuClean = d.sku.replace(/[^\x20-\x7E]/g, '');
  const barcodePayload = `{B${skuClean}`;
  buf.push(GS, 0x6B, 73, barcodePayload.length);
  for (const c of barcodePayload) buf.push(c.charCodeAt(0));

  buf.push(0x0a, 0x0a, 0x0a);
  buf.push(GS, 0x56, 0x41, 0x05); // corte parcial

  return Buffer.from(buf);
}

export async function POST(req: NextRequest) {
  const tmpFile = join(tmpdir(), `barcode-${Date.now()}.bin`);
  try {
    const data: BarcodeData = await req.json();
    const ticket = buildBarcodeTicket(data);

    await writeFile(tmpFile, ticket);

    await new Promise<void>((resolve, reject) => {
      execFile(
        '/usr/bin/lp',
        ['-d', PRINTER_NAME, '-o', 'raw', tmpFile],
        { timeout: 10000 },
        (err, _stdout, stderr) => {
          if (err) reject(new Error(stderr || err.message));
          else resolve();
        }
      );
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error('[print-barcode]', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    unlink(tmpFile).catch(() => {});
  }
}
