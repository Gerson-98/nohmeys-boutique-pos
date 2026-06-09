'use client';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 rounded-xl hover:bg-[#F8E1E7] transition-colors"
      >
        <Menu size={22} className="text-[#2C2C2C]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl z-10">
            <div className="flex justify-end p-3">
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[#F8E1E7]"
              >
                <X size={18} className="text-[#2C2C2C]" />
              </button>
            </div>
            <div className="h-[calc(100%-52px)]">
              <Sidebar />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
