// src/lib/utils.ts

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatCurrency(amount: number, currency: string = 'KES'): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Shared department → brand-accent-color mapping used across the homepage,
// shop PLP, and categories index so tiles, pills, and headers read as one
// coherent set instead of every page inventing its own palette.
const DEPT_ACCENTS: Record<string, string> = {
  women: "var(--dept-women)",
  men: "var(--dept-men)",
  kids: "var(--dept-kids)",
  baby: "var(--dept-kids)",
  beauty: "var(--dept-beauty)",
  maternity: "var(--dept-maternity)",
  home: "var(--dept-home)",
};

export function deptAccent(slug?: string | null): string {
  if (!slug) return "var(--color-accent)";
  return DEPT_ACCENTS[slug] || "var(--color-accent)";
}