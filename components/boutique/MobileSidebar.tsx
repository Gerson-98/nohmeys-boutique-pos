'use client';
import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menú de navegación"
        aria-expanded={open}
        aria-controls="mobile-nav-dialog"
        className="md:hidden p-2 rounded-xl hover:bg-blush-light transition-colors min-w-[44px] min-h-[44px]"
      >
        <span aria-hidden="true"><Menu size={22} className="text-boutique-dark" /></span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            ref={dialogRef}
            id="mobile-nav-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl z-10"
          >
            <div className="flex justify-end p-3">
              <button
                ref={closeButtonRef}
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú de navegación"
                className="p-1.5 rounded-xl hover:bg-blush-light min-w-[44px] min-h-[44px]"
              >
                <span aria-hidden="true"><X size={18} className="text-boutique-dark" /></span>
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
