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

export async function retry<T>(
  fn: () => Promise<T>,
  options?: { maxAttempts?: number; baseDelayMs?: number; onRetry?: (attempt: number, error: unknown) => void },
): Promise<T> {
  const max = options?.maxAttempts ?? 3;
  const baseDelay = options?.baseDelayMs ?? 1000;

  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === max) throw err;
      const delay = baseDelay * Math.pow(2, attempt - 1);
      if (options?.onRetry) {
        options.onRetry(attempt, err);
      }
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('retry: unreachable');
}

export * from './api';
export { api } from './api';
