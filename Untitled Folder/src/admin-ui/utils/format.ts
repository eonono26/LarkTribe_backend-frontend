export const kes = (n: number | string | null | undefined) =>
  `KES ${Number(n ?? 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

export const dateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const dateOnly = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
