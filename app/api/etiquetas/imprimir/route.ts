export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';

const execFileAsync = promisify(execFile);

const PRINTER   = 'AiyinE40';
const PAGE_SIZE = 'Custom.142x71'; // 50mm × 25mm en PostScript points

export async function POST(req: NextRequest) {
  try {
    const { images } = await req.json();
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'Falta images[]' }, { status: 400 });
    }

    const printer = PRINTER;

    const ts = Date.now();
    const tmpFiles = await Promise.all(
      images.map((b64: string, i: number) => {
        const f = join(tmpdir(), `etiqueta-${ts}-${i}.png`);
        return writeFile(f, Buffer.from(b64, 'base64')).then(() => f);
      })
    );

    try {
      await execFileAsync('/usr/bin/lp', [
        '-d', printer,
        '-o', `PageSize=${PAGE_SIZE}`,
        '-o', 'job-sheets=none,none',
        ...tmpFiles,
      ]);
    } finally {
      await Promise.all(tmpFiles.map((f) => unlink(f).catch(() => {})));
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[etiquetas/imprimir]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
