export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function calculateMargin(costPrice: number, sellingPrice: number): number {
  return ((sellingPrice - costPrice) / sellingPrice) * 100;
}

export function applyMarkup(price: number, multiplier: number = 2.7): number {
  return Math.round(price * multiplier * 100) / 100;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export * from './api';
export { api } from './api';
