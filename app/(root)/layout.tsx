'use client';
import React from 'react';
import { Sidebar } from '@/components/boutique/Sidebar';
import { MobileSidebar } from '@/components/boutique/MobileSidebar';
import { useShopConfig } from '@/lib/useShopConfig';
import { UserProvider } from '@/app/context/UserContext';

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const config = useShopConfig();
  return (
    <UserProvider>
      <div className="min-h-screen bg-boutique-gray-soft">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar desktop */}
          <div className="hidden md:flex md:w-[240px] lg:w-[270px] flex-shrink-0">
            <div className="w-full">
              <Sidebar />
            </div>
          </div>

          {/* Contenido principal */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header móvil */}
            <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-blush shadow-sm">
              <MobileSidebar />
              <span className="font-playfair font-semibold text-boutique-dark text-sm">
                {config?.nombreComercial ?? "Nohemy's Boutique"}
              </span>
              <div className="w-8" aria-hidden="true" />
            </header>

            {/* Área de contenido */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </UserProvider>
  );
}
