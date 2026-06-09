import React from 'react';
import { Sidebar } from '@/components/boutique/Sidebar';
import { MobileSidebar } from '@/components/boutique/MobileSidebar';

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F5F5F5]">
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
          <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#F2C4CE] shadow-sm">
            <MobileSidebar />
            <span className="font-playfair font-semibold text-[#2C2C2C] text-sm">
              Nohemy&apos;s <span className="text-[#C9A84C]">Boutique</span>
            </span>
            <div className="w-8" />
          </header>

          {/* Área de contenido */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
