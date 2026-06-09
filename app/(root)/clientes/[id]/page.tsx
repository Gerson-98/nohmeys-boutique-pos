'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, Mail, User, ShoppingBag, Tag, CreditCard, MapPin } from 'lucide-react';
import { formatPrecio } from '@/lib/boutique';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ClienteModal } from '../components/ClienteModal';

interface VentaHistorial {
  id: string;
  numeroTicket: string;
  total: number;
  estado: string;
  metodoPago: string;
  createdAt: string;
  detalles: Array<{
    cantidad: number;
    subtotal: number;
    variante: {
      sku: string;
      talla: string | null;
      color: string | null;
      producto: { nombre: string };
    };
  }>;
}

interface ValeCredito {
  id: string;
  codigo: string;
  montoOriginal: number;
  saldoActual: number;
  expiraEn: string | null;
  createdAt: string;
}

interface ClienteDetalle {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  nit: string | null;
  direccion: string | null;
  isActive: boolean;
  createdAt: string;
  totalCompras: number;
  cantidadVentas: number;
  ventas: VentaHistorial[];
  vales: ValeCredito[];
}

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  COMPLETADA: { label: 'Completada', color: 'bg-[#6DBF94]/20 text-[#6DBF94]' },
  ANULADA: { label: 'Anulada', color: 'bg-[#E57373]/20 text-[#E57373]' },
  DEVOLUCION_PARCIAL: { label: 'Dev. parcial', color: 'bg-[#F5C842]/20 text-[#2C2C2C]' },
};

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transf.', MIXTO: 'Mixto', VALE_CREDITO: 'Vale',
};

export default function ClientePerfilPage({ params }: { params: { id: string } }) {
  const [cliente, setCliente] = useState<ClienteDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [editarOpen, setEditarOpen] = useState(false);

  const cargar = () => {
    setCargando(true);
    fetch(`/api/clientes/${params.id}`)
      .then((r) => r.json())
      .then((d) => setCliente(d.data))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, [params.id]);

  if (cargando) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!cliente) return <p className="text-center text-[#9E9E9E] py-10">Cliente no encontrado.</p>;

  return (
    <>
      <div className="space-y-6 max-w-4xl">
        {/* Breadcrumb */}
        <Link href="/clientes" className="flex items-center gap-2 text-sm text-[#9E9E9E] hover:text-[#C9A84C] transition-colors">
          <ArrowLeft size={15} /> Volver a clientes
        </Link>

        {/* Perfil */}
        <div className="card-boutique p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#F2C4CE] flex items-center justify-center flex-shrink-0">
                <span className="font-playfair text-2xl font-bold text-[#C9A84C]">{cliente.nombre.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h1 className="font-playfair text-xl font-bold text-[#2C2C2C]">{cliente.nombre}</h1>
                <div className="flex flex-col gap-0.5 mt-1">
                  {cliente.telefono && <div className="flex items-center gap-1.5 text-xs text-[#9E9E9E]"><Phone size={11} /> {cliente.telefono}</div>}
                  {cliente.email && <div className="flex items-center gap-1.5 text-xs text-[#9E9E9E]"><Mail size={11} /> {cliente.email}</div>}
                  {cliente.nit && <div className="flex items-center gap-1.5 text-xs text-[#9E9E9E]"><User size={11} /> NIT: {cliente.nit}</div>}
                  {cliente.direccion && <div className="flex items-center gap-1.5 text-xs text-[#9E9E9E]"><MapPin size={11} /> {cliente.direccion}</div>}
                </div>
              </div>
            </div>
            <button onClick={() => setEditarOpen(true)} className="btn-boutique-secondary text-sm self-start">
              Editar datos
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#F2C4CE]">
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-[#C9A84C]">{formatPrecio(cliente.totalCompras)}</p>
              <p className="text-xs text-[#9E9E9E]">Total compras</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-[#2C2C2C]">{cliente.cantidadVentas}</p>
              <p className="text-xs text-[#9E9E9E]">Visitas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-[#2C2C2C]">{cliente.vales.length}</p>
              <p className="text-xs text-[#9E9E9E]">Vales activos</p>
            </div>
          </div>
        </div>

        {/* Vales de crédito */}
        {cliente.vales.length > 0 && (
          <div className="card-boutique p-5">
            <h2 className="font-playfair text-lg font-semibold text-[#2C2C2C] mb-3 flex items-center gap-2">
              <CreditCard size={18} className="text-[#C9A84C]" /> Vales de crédito disponibles
            </h2>
            <div className="space-y-2">
              {cliente.vales.map((v) => (
                <div key={v.id} className="flex items-center justify-between px-4 py-3 bg-[#F8E1E7] rounded-xl">
                  <div>
                    <p className="font-mono text-sm font-bold text-[#2C2C2C]">{v.codigo}</p>
                    <p className="text-xs text-[#9E9E9E]">Original: {formatPrecio(v.montoOriginal)}</p>
                    {v.expiraEn && <p className="text-xs text-[#9E9E9E]">Expira: {format(new Date(v.expiraEn), "dd/MM/yyyy")}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-mono font-bold text-[#C9A84C]">{formatPrecio(v.saldoActual)}</p>
                    <p className="text-xs text-[#9E9E9E]">Saldo disponible</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial de compras */}
        <div className="card-boutique p-5">
          <h2 className="font-playfair text-lg font-semibold text-[#2C2C2C] mb-4 flex items-center gap-2">
            <ShoppingBag size={18} className="text-[#C9A84C]" /> Historial de compras
          </h2>
          {cliente.ventas.length === 0 ? (
            <p className="text-sm text-[#9E9E9E] text-center py-6">Sin compras registradas.</p>
          ) : (
            <div className="space-y-3">
              {cliente.ventas.map((v) => {
                const estado = ESTADO_LABEL[v.estado] ?? { label: v.estado, color: '' };
                return (
                  <div key={v.id} className="border border-[#F2C4CE] rounded-xl overflow-hidden">
                    {/* Header venta */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAFAFA]">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-[#2C2C2C]">{v.numeroTicket}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${estado.color}`}>{estado.label}</span>
                        <span className="text-[10px] text-[#9E9E9E] flex items-center gap-1">
                          <Tag size={9} /> {METODO_LABEL[v.metodoPago] ?? v.metodoPago}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-sm text-[#C9A84C]">{formatPrecio(v.total)}</p>
                        <p className="text-[10px] text-[#9E9E9E]">{format(new Date(v.createdAt), "dd/MM/yyyy HH:mm")}</p>
                      </div>
                    </div>
                    {/* Prendas */}
                    <div className="px-4 py-2 space-y-1">
                      {v.detalles.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-[#2C2C2C]">
                            {d.cantidad}× {d.variante.producto.nombre}
                            {(d.variante.talla || d.variante.color) && (
                              <span className="text-[#9E9E9E] ml-1">
                                ({[d.variante.talla, d.variante.color].filter(Boolean).join(' / ')})
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-[#9E9E9E]">{formatPrecio(d.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ClienteModal
        open={editarOpen}
        clienteId={cliente.id}
        onClose={() => setEditarOpen(false)}
        onSuccess={() => { setEditarOpen(false); cargar(); }}
      />
    </>
  );
}
