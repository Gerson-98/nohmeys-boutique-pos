'use client';
import { useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, ImageIcon } from 'lucide-react';
import { toast } from 'react-toastify';

interface Props {
  value?: string;
  onChange: (url: string) => void;
}

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const TAMANO_MAXIMO_MB = 5;

export function ImageUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function uploadFile(file: File) {
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      toast.error('Formato no permitido. Use JPG, PNG o WEBP');
      return;
    }
    if (file.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
      toast.error(`La imagen supera el límite de ${TAMANO_MAXIMO_MB}MB`);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onChange(data.url);
    } catch (e: any) {
      toast.error('Error al subir imagen: ' + e.message);
    } finally {
      setUploading(false);
    }
  }

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      uploadFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  if (value) {
    return (
      <div className="relative w-full h-44 rounded-xl overflow-hidden border border-gold-light bg-blush-light">
        <Image
          src={value}
          alt="Imagen del producto"
          fill
          className="object-contain"
          unoptimized={value.startsWith('/uploads/')}
        />
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-2 right-2 w-11 h-11 bg-boutique-danger text-white rounded-full flex items-center justify-center hover:bg-[#d65f5f] transition-colors shadow-md"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`w-full h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors
        ${dragging
          ? 'border-gold bg-blush-light'
          : 'border-gold-light bg-boutique-white hover:border-gold hover:bg-blush-light'
        }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {uploading ? (
        <>
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-boutique-gray-mid">Subiendo imagen...</p>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-full bg-blush flex items-center justify-center">
            {dragging ? <Upload size={20} className="text-gold" /> : <ImageIcon size={20} className="text-gold" />}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-boutique-dark">
              {dragging ? 'Suelta la imagen aquí' : 'Arrastra o haz clic para subir'}
            </p>
            <p className="text-xs text-boutique-gray-mid mt-0.5">JPG, JPEG, PNG o WEBP · máx. 5MB</p>
          </div>
        </>
      )}
    </div>
  );
}
