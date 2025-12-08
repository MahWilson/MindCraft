"use client";
import React from 'react';
import { cn } from '@/lib/utils';

export function Avatar({ src, alt, name, className }) {
  const initials = (name || '').split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase() || '?';
  return (
    <div className={cn('inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-700 border border-gray-300 overflow-hidden', className)} style={{ width: 28, height: 28 }}>
      {src ? (<img src={src} alt={alt || name || 'user'} className="w-full h-full object-cover" />) : (<span className="text-xs font-semibold">{initials}</span>)}
    </div>
  );
}

