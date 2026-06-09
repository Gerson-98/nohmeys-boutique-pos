export function formatPrecio(monto: number): string {
  return `Q ${monto.toFixed(2)}`;
}

export function calcularMargen(costo: number, precioVenta: number): number {
  if (precioVenta === 0) return 0;
  return ((precioVenta - costo) / precioVenta) * 100;
}

export function generarSKU(skuPadre: string, color: string, talla: string): string {
  const colorInicial = color.substring(0, 2).toUpperCase();
  const tallaFmt = talla.toUpperCase().replace(/\s/g, '');
  return `${skuPadre}-${colorInicial}${tallaFmt}`;
}

export function badgeStock(stockActual: number, stockMinimo: number) {
  if (stockActual === 0) return { label: 'Agotado', color: 'bg-[#E57373] text-white' };
  if (stockActual <= stockMinimo) return { label: 'Stock bajo', color: 'bg-[#F5C842] text-[#2C2C2C]' };
  return { label: 'En stock', color: 'bg-[#6DBF94] text-white' };
}
