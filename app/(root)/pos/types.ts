export interface VariantePOS {
  id: string;
  sku: string;
  talla: string | null;
  color: string | null;
  colorHex: string | null;
  stockActual: number;
  stockMinimo: number;
}

export interface ProductoPOS {
  id: string;
  nombre: string;
  imagenUrl: string | null;
  precioVenta: number;
  categoria: { id: string; nombre: string; icono: string | null };
  variantes: VariantePOS[];
  stockTotal: number;
}

export interface CartItem {
  varianteId: string;
  productoId: string;
  nombre: string;
  varianteLabel: string; // "M / Azul marino"
  sku: string;
  imagenUrl: string | null;
  precio: number;
  cantidad: number;
  descuentoPct: number;
  stockActual: number;
}

export interface ClientePOS {
  id: string;
  nombre: string;
  telefono: string | null;
  nit: string | null;
}

export interface CajeroPOS {
  id: string;
  nombre: string;
  rol: string;
}

export interface PagoInput {
  metodo: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'VALE_CREDITO';
  monto: number;
  referencia?: string;
}
