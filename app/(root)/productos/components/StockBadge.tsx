import { badgeStock } from '@/lib/boutique';

interface Props {
  stockActual: number;
  stockMinimo: number;
}

export function StockBadge({ stockActual, stockMinimo }: Props) {
  const { label, color } = badgeStock(stockActual, stockMinimo);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
