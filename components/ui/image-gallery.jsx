"use client";
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export function ImageGallery({ images = [], className }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  if (!Array.isArray(images) || images.length === 0) return null;

  const show = (idx) => { setCurrent(idx); setOpen(true); };
  const next = () => setCurrent((i) => (i + 1) % images.length);
  const prev = () => setCurrent((i) => (i - 1 + images.length) % images.length);

  return (
    <div className={cn('w-full', className)}>
      {/* Main image (Reddit-style: large, object-contain, rounded) */}
      <div className="bg-gray-100 rounded-lg border overflow-hidden cursor-pointer" onClick={() => show(0)}>
        <img src={images[0]} alt="post image" className="w-full h-auto max-h-[520px] object-contain" />
      </div>
      {/* Thumbnails for additional images */}
      {images.length > 1 && (
        <div className="mt-2 grid grid-cols-4 gap-2">
          {images.slice(1).map((src, idx) => (
            <button key={idx} onClick={() => show(idx + 1)} className="bg-gray-100 rounded-md border overflow-hidden">
              <img src={src} alt="thumbnail" className="w-full h-24 object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center" onClick={() => setOpen(false)}>
          <div className="max-w-5xl w-full px-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <button className="px-3 py-1 rounded bg-white/80 text-sm" onClick={() => setOpen(false)}>Close</button>
              <div className="text-white text-sm">{current + 1} / {images.length}</div>
            </div>
            <div className="bg-black rounded-lg overflow-hidden flex items-center justify-center">
              <img src={images[current]} alt="full" className="max-h-[80vh] w-auto object-contain" />
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex items-center justify-between">
                <button className="px-3 py-1 rounded bg-white/80 text-sm" onClick={prev}>Prev</button>
                <button className="px-3 py-1 rounded bg-white/80 text-sm" onClick={next}>Next</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

