import type { Category } from './types';

export const CATEGORIES: Category[] = ['food', 'transport', 'data', 'fun', 'other'];

export const CATEGORY_CONFIG: { value: Category; label: string; color: string }[] = [
  { value: 'food',      label: 'Food',      color: '#f97316' },
  { value: 'transport', label: 'Transport',  color: '#3b82f6' },
  { value: 'data',      label: 'Data',       color: '#8b5cf6' },
  { value: 'fun',       label: 'Fun',        color: '#ec4899' },
  { value: 'other',     label: 'Other',      color: '#6b7280' },
];

export const CATEGORY_COLORS: Record<Category, string> = Object.fromEntries(
  CATEGORY_CONFIG.map((c) => [c.value, c.color])
) as Record<Category, string>;

export const CATEGORY_LABELS: Record<Category, string> = Object.fromEntries(
  CATEGORY_CONFIG.map((c) => [c.value, c.label])
) as Record<Category, string>;

export const CURRENCY = { symbol: '₦', locale: 'en-NG' } as const;
