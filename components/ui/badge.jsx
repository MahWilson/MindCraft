"use client";
import React from 'react';
import { cn } from '@/lib/utils';

export function Badge({ children, variant = 'default', className }) {
  const base = 'inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium';
  const variants = {
    default: 'bg-gray-100 text-gray-700 border-gray-200',
    outline: 'bg-transparent text-gray-700 border-gray-300',
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    secondary: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return (
    <span className={cn(base, variants[variant] || variants.default, className)}>
      {children}
    </span>
  );
}

