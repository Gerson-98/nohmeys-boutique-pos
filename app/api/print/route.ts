export const dynamic = 'force-dynamic';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const PRINTER_NAME = 'AON250-Ticket';

export interface TicketData {
  nombreComercial?: string;
  direccion?: string;
  nit?: string;
  fecha: string;
  numeroTicket: string;
  cajero: string;
  cliente?: string;
  items: Array<{
    nombre: string;
    variante?: string;
    cantidad: number;
    subtotal: number;
    descuento: number;
  }>;
  descuento: number;
  impuesto: number;
  total: number;
  cambio: number;
  pagos: Array<{ metodo: string; monto: number; referencia?: string }>;
  politicaCambios?: string;
}

const ESC = 0x1b;
const GS  = 0x1d;

function buildTicket(v: TicketData): Buffer {
  const W = 42; // 80mm paper = 42 chars/line at default font
  const buf: number[] = [];

  const line   = (t: string) => { for (const c of t) buf.push(c.charCodeAt(0) > 127 ? 0x3f : c.charCodeAt(0)); buf.push(0x0a); };
  const dash   = () => line('-'.repeat(W));
  const center = (t: string) => { buf.push(ESC, 0x61, 0x01); line(t.substring(0, W)); buf.push(ESC, 0x61, 0x00); };
  const bold   = (on: boolean) => buf.push(ESC, 0x45, on ? 0x01 : 0x00);
  const big    = (on: boolean) => buf.push(ESC, 0x21, on ? 0x10 : 0x00);
  const col2   = (l: string, r: string) => { const g = W - l.length - r.length; line(l + ' '.repeat(Math.max(1, g)) + r); };
  const price  = (n: number) => `Q${n.toFixed(2)}`;

  buf.push(ESC, 0x40); // init

  bold(true); big(true);
  center((v.nombreComercial ?? "Nohemy's Boutique").substring(0, 16));
  big(false); bold(false);

  if (v.direccion) center(v.direccion.substring(0, W));
  if (v.nit)       center(`NIT: ${v.nit}`);
  center(v.fecha.substring(0, W));
  dash();

  col2('Ticket:', v.numeroTicket.substring(0, 20));
  col2('Cajero:', v.cajero.substring(0, 20));
  if (v.cliente) col2('Cliente:', v.cliente.substring(0, 20));
  dash();

  bold(true); line('Producto                    Cant  Precio'); bold(false);

  for (const item of v.items) {
    const nom  = item.nombre.substring(0, 26).padEnd(26);
    const cant = String(item.cantidad).padStart(4);
    const pre  = price(item.subtotal).padStart(10);
    line(`${nom}${cant}${pre}`);
    if (item.variante) line(`  ${item.variante.substring(0, 38)}`);
    if (item.descuento > 0) line(`  Desc: -${price(item.descuento)}`);
  }
  dash();

  if (v.descuento > 0) col2('Descuento:', `-${price(v.descuento)}`);
  if (v.impuesto  > 0) col2('IVA:', price(v.impuesto));
  bold(true); col2('TOTAL:', price(v.total)); bold(false);
  dash();

  for (const p of v.pagos) {
    col2(`${p.metodo}:`, price(p.monto));
    if (p.referencia) line(`  Ref: ${p.referencia.substring(0, 26)}`);
  }
  if (v.cambio > 0) col2('Cambio:', price(v.cambio));
  dash();

  center('Gracias por su compra!');
  if (v.politicaCambios) {
    const pol = v.politicaCambios.substring(0, 96);
    for (const c of pol) buf.push(c.charCodeAt(0) > 127 ? 0x3f : c.charCodeAt(0));
    buf.push(0x0a);
  }

  buf.push(0x0a, 0x0a, 0x0a, 0x0a);
  buf.push(GS, 0x56, 0x41, 0x05); // corte parcial

  return Buffer.from(buf);
}

export async function POST(req: NextRequest) {
  const tmpFile = join(tmpdir(), `ticket-${Date.now()}.bin`);
  try {
    const data: TicketData = await req.json();
    const ticket = buildTicket(data);

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
    console.error('[print]', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    unlink(tmpFile).catch(() => {});
  }
}
