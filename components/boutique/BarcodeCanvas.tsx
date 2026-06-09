'use client';
import { useEffect, useRef } from 'react';

interface Props {
  value: string;       // SKU / código a codificar
  width?: number;      // ancho del módulo en píxeles
  height?: number;     // alto en píxeles
  className?: string;
}

/**
 * Renderiza un código de barras Code128 usando bwip-js.
 * Code128 soporta todos los caracteres alfanuméricos de un SKU boutique.
 */
export function BarcodeCanvas({ value, width = 2, height = 40, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    // Importación dinámica para evitar SSR issues
    import('bwip-js').then((bwipjs) => {
      try {
        bwipjs.toCanvas(canvasRef.current!, {
          bcid: 'code128',
          text: value,
          scale: width,
          height,
          includetext: false, // el SKU lo mostramos por separado con CSS
          backgroundcolor: 'ffffff',
        });
      } catch {
        // SKU con caracteres inválidos: fallback silencioso
      }
    });
  }, [value, width, height]);

  return <canvas ref={canvasRef} className={className} />;
}
