'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, Mail, User, ShoppingBag, Tag, CreditCard, MapPin, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatPrecio } from '@/lib/boutique';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-toastify';
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
  COMPLETADA: { label: 'Completada', color: 'bg-boutique-success/20 text-boutique-success' },
  ANULADA: { label: 'Anulada', color: 'bg-boutique-danger/20 text-boutique-danger' },
  DEVOLUCION_PARCIAL: { label: 'Dev. parcial', color: 'bg-boutique-warning/20 text-boutique-dark' },
};

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transf.', MIXTO: 'Mixto', VALE_CREDITO: 'Vale',
};

export default function ClientePerfilPage({ params }: { params: { id: string } }) {
  const [cliente, setCliente] = useState<ClienteDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [editarOpen, setEditarOpen] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(false);
    try {
      const res = await fetch(`/api/clientes/${params.id}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setCliente(d.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      toast.error('Error al cargar el perfil: ' + msg);
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  }, [params.id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return (
    <div className="space-y-6 max-w-4xl animate-pulse">
      <div className="h-4 w-28 rounded bg-blush/30" />
      <div className="card-boutique p-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-blush/40 flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-2">
            <div className="h-5 w-40 rounded bg-blush/50" />
            <div className="h-3 w-28 rounded bg-blush/30" />
            <div className="h-3 w-24 rounded bg-blush/30" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-blush/30">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-7 w-20 rounded bg-blush/40 mx-auto" />
              <div className="h-3 w-16 rounded bg-blush/20 mx-auto" />
            </div>
          ))}
        </div>
      </div>
      <div className="card-boutique p-5 space-y-3">
        <div className="h-4 w-36 rounded bg-blush/40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-blush/20" />
        ))}
      </div>
    </div>
  );
  if (errorCarga) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle size={28} className="text-boutique-danger mb-3" />
      <p className="text-sm font-semibold text-boutique-dark mb-1">No pudimos cargar el perfil del cliente</p>
      <p className="text-xs text-[#757575] mb-4">Verifica tu conexión e intenta de nuevo.</p>
      <button onClick={cargar} className="btn-boutique-primary text-sm px-4 py-2 flex items-center gap-2">
        <RefreshCw size={14} /> Reintentar
      </button>
    </div>
  );
  if (!cliente) return <p className="text-center text-boutique-gray-mid py-10">Cliente no encontrado.</p>;

  return (
    <>
      <div className="space-y-6 max-w-4xl">
        {/* Breadcrumb */}
        <Link href="/clientes" className="flex items-center gap-2 text-sm text-boutique-gray-mid hover:text-gold transition-colors">
          <ArrowLeft size={15} /> Volver a clientes
        </Link>

        {/* Perfil */}
        <div className="card-boutique p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blush flex items-center justify-center flex-shrink-0">
                <span className="font-playfair text-2xl font-bold text-gold">{cliente.nombre.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h1 className="font-playfair text-xl font-bold text-boutique-dark">{cliente.nombre}</h1>
                <div className="flex flex-col gap-0.5 mt-1">
                  {cliente.telefono && <div className="flex items-center gap-1.5 text-xs text-boutique-gray-mid"><Phone size={11} /> {cliente.telefono}</div>}
                  {cliente.email && <div className="flex items-center gap-1.5 text-xs text-boutique-gray-mid"><Mail size={11} /> {cliente.email}</div>}
                  {cliente.nit && <div className="flex items-center gap-1.5 text-xs text-boutique-gray-mid"><User size={11} /> NIT: {cliente.nit}</div>}
                  {cliente.direccion && <div className="flex items-center gap-1.5 text-xs text-boutique-gray-mid"><MapPin size={11} /> {cliente.direccion}</div>}
                </div>
              </div>
            </div>
            <button onClick={() => setEditarOpen(true)} className="btn-boutique-secondary text-sm self-start">
              Editar datos
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-blush">
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-gold">{formatPrecio(cliente.totalCompras)}</p>
              <p className="text-xs text-boutique-gray-mid">Total compras</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-boutique-dark">{cliente.cantidadVentas}</p>
              <p className="text-xs text-boutique-gray-mid">Visitas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-boutique-dark">{cliente.vales.length}</p>
              <p className="text-xs text-boutique-gray-mid">Vales activos</p>
            </div>
          </div>
        </div>

        {/* Vales de crédito */}
        {cliente.vales.length > 0 && (
          <div className="card-boutique p-5">
            <h2 className="font-playfair text-lg font-semibold text-boutique-dark mb-3 flex items-center gap-2">
              <CreditCard size={18} className="text-gold" /> Vales de crédito disponibles
            </h2>
            <div className="space-y-2">
              {cliente.vales.map((v) => (
                <div key={v.id} className="flex items-center justify-between px-4 py-3 bg-blush-light rounded-xl">
                  <div>
                    <p className="font-mono text-sm font-bold text-boutique-dark">{v.codigo}</p>
                    <p className="text-xs text-boutique-gray-mid">Original: {formatPrecio(v.montoOriginal)}</p>
                    {v.expiraEn && <p className="text-xs text-boutique-gray-mid">Expira: {format(new Date(v.expiraEn), "dd/MM/yyyy")}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-mono font-bold text-gold">{formatPrecio(v.saldoActual)}</p>
                    <p className="text-xs text-boutique-gray-mid">Saldo disponible</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial de compras */}
        <div className="card-boutique p-5">
          <h2 className="font-playfair text-lg font-semibold text-boutique-dark mb-4 flex items-center gap-2">
            <ShoppingBag size={18} className="text-gold" /> Historial de compras
          </h2>
          {cliente.ventas.length === 0 ? (
            <p className="text-sm text-boutique-gray-mid text-center py-6">Sin compras registradas.</p>
          ) : (
            <div className="space-y-3">
              {cliente.ventas.map((v) => {
                const estado = ESTADO_LABEL[v.estado] ?? { label: v.estado, color: '' };
                return (
                  <div key={v.id} className="border border-blush rounded-xl overflow-hidden">
                    {/* Header venta */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-boutique-white">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-boutique-dark">{v.numeroTicket}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estado.color}`}>{estado.label}</span>
                        <span className="text-xs text-[#757575] flex items-center gap-1">
                          <Tag size={9} /> {METODO_LABEL[v.metodoPago] ?? v.metodoPago}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-sm text-gold">{formatPrecio(v.total)}</p>
                        <p className="text-xs text-[#757575]">{format(new Date(v.createdAt), "dd/MM/yyyy HH:mm")}</p>
                      </div>
                    </div>
                    {/* Prendas */}
                    <div className="px-4 py-2 space-y-1">
                      {v.detalles.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-boutique-dark">
                            {d.cantidad}× {d.variante.producto.nombre}
                            {(d.variante.talla || d.variante.color) && (
                              <span className="text-boutique-gray-mid ml-1">
                                ({[d.variante.talla, d.variante.color].filter(Boolean).join(' / ')})
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-boutique-gray-mid">{formatPrecio(d.subtotal)}</span>
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
