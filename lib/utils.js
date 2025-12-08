import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

export function timeAgo(value) {
	const ms = typeof value === 'number' ? value : value?.toMillis ? value.toMillis() : new Date(value).getTime();
	const diff = Date.now() - ms;
	const s = Math.floor(diff / 1000);
	if (s < 60) return `${s}s ago`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	const d = Math.floor(h / 24);
	if (d < 7) return `${d}d ago`;
	const w = Math.floor(d / 7);
	if (w < 4) return `${w}w ago`;
	const mo = Math.floor(d / 30);
	if (mo < 12) return `${mo}mo ago`;
	const y = Math.floor(d / 365);
	return `${y}y ago`;
}

export function roleFlair(role) {
  const r = (role || 'student').toLowerCase();
  if (r === 'admin') return { emoji: '🛡️', label: 'admin', variant: 'warning' };
  if (r === 'teacher') return { emoji: '👩‍🏫', label: 'teacher', variant: 'secondary' };
  return { emoji: '👨‍🎓', label: 'student', variant: 'default' };
}

