'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart2,
  ClipboardList,
  Settings,
  ChevronDown,
  ChevronRight,
  CreditCard,
  RotateCcw,
  ListChecks,
  BookOpen,
  UserCog,
  Sliders,
  LogOut,
  Tag,
  Wifi,
  Award,
} from 'lucide-react';
import { useShopConfig } from '@/lib/useShopConfig';
import { useUser } from '@/app/context/UserContext';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavItem[];
  rolesPermitidos?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/home', icon: <LayoutDashboard size={18} /> },
  { label: 'Punto de Venta', href: '/pos', icon: <ShoppingCart size={18} /> },
  {
    label: 'Productos',
    icon: <Package size={18} />,
    children: [
      { label: 'Catálogo', href: '/productos', icon: <Package size={16} /> },
      { label: 'Etiquetas / Códigos', href: '/productos/etiquetas', icon: <Tag size={16} /> },
    ],
  },
  { label: 'Clientes', href: '/clientes', icon: <Users size={18} /> },
  {
    label: 'Reportes',
    icon: <BarChart2 size={18} />,
    children: [
      { label: 'Dashboard', href: '/reportes', icon: <BarChart2 size={16} /> },
      { label: 'Ventas', href: '/reportes/ventas', icon: <CreditCard size={16} /> },
      { label: 'Cierre de Caja', href: '/caja', icon: <ClipboardList size={16} /> },
      { label: 'Devoluciones', href: '/reportes/devoluciones', icon: <RotateCcw size={16} /> },
      { label: 'Transferencias', href: '/finanzas/transferencias', icon: <Wifi size={16} /> },
      { label: 'Reporte Financiero', href: '/reportes/financiero', icon: <Award size={16} />, rolesPermitidos: ['ADMIN'] },
    ],
  },
  {
    label: 'Inventario',
    icon: <ListChecks size={18} />,
    children: [
      { label: 'Ajustes de Stock', href: '/inventario/ajustes', icon: <Sliders size={16} /> },
      { label: 'Kardex / Bitácora', href: '/inventario/kardex', icon: <BookOpen size={16} /> },
    ],
  },
  {
    label: 'Configuración',
    icon: <Settings size={18} />,
    rolesPermitidos: ['ADMIN', 'SUPERVISOR'],
    children: [
      { label: 'Configuración', href: '/configuracion', icon: <Settings size={16} /> },
      { label: 'Usuarios y Roles', href: '/usuarios', icon: <UserCog size={16} /> },
    ],
  },
];

const ROL_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  CAJERO: 'Cajero',
};

function NavLink({ item, depth = 0, rol }: { item: NavItem; depth?: number; rol: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => {
    if (!item.children) return false;
    return item.children.some((c) => c.href && pathname.startsWith(c.href));
  });

  const isActive = item.href
    ? pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href))
    : false;

  const groupId = `nav-group-${item.label.toLowerCase().replace(/\s+/g, '-')}`;

  if (item.children) {
    const visibles = item.children.filter((c) => !c.rolesPermitidos || (rol && c.rolesPermitidos.includes(rol)));
    if (visibles.length === 0) return null;
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={groupId}
          className={`w-full flex items-center justify-between gap-3 px-3 py-2 min-h-[44px] rounded-xl text-sm font-medium transition-all
            ${open ? 'text-gold-dark bg-gold-warm' : 'text-boutique-dark hover:bg-blush-light'}`}
          style={{ paddingLeft: depth > 0 ? `${depth * 16 + 12}px` : undefined }}
        >
          <span className="flex items-center gap-3">
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </span>
          <span aria-hidden="true">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>
        {open && (
          <div id={groupId} className="mt-0.5 space-y-0.5">
            {visibles.map((child) => (
              <NavLink key={child.label} item={child} depth={depth + 1} rol={rol} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={`flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-xl text-sm font-medium transition-all
        ${
          isActive
            ? 'bg-blush text-boutique-dark font-semibold'
            : 'text-boutique-dark hover:bg-blush-light'
        }`}
      style={{ paddingLeft: depth > 0 ? `${depth * 16 + 12}px` : undefined }}
    >
      <span aria-hidden="true">{item.icon}</span>
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const router = useRouter();
  const config = useShopConfig();
  const { usuario } = useUser();

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Network error — redirect anyway; session expires server-side
    } finally {
      router.replace('/login');
    }
  }

  return (
    <aside className="flex flex-col h-full bg-white border-r border-blush">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-blush">
        <div aria-hidden="true" className="w-8 h-8 rounded-full bg-blush flex items-center justify-center text-gold font-bold text-sm font-playfair flex-shrink-0">
          {(config?.nombreComercial ?? "Nohemy's Boutique").charAt(0).toUpperCase()}
        </div>
        <span className="font-playfair text-boutique-dark font-semibold text-sm leading-tight">
          {config?.nombreComercial ?? "Nohemy's Boutique"}
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS
          .filter((item) => !item.rolesPermitidos || (usuario && item.rolesPermitidos.includes(usuario.rol)))
          .map((item) => (
            <NavLink key={item.label} item={item} rol={usuario?.rol ?? null} />
          ))}
      </nav>

      {/* Usuario + Logout */}
      <div className="px-4 py-3 border-t border-blush space-y-2">
        {usuario && (
          <div className="flex items-center gap-2">
            <div aria-hidden="true" className="w-7 h-7 rounded-full bg-blush flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-gold">{usuario.nombre.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-boutique-dark truncate">{usuario.nombre}</p>
              <p className="text-[10px] text-boutique-gray-mid">{ROL_LABELS[usuario.rol] ?? usuario.rol}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-boutique-gray-mid hover:bg-blush-light hover:text-boutique-danger transition-colors"
        >
          <span aria-hidden="true"><LogOut size={14} /></span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
