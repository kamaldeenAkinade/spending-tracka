export type Category = 'food' | 'transport' | 'data' | 'fun' | 'other';
export type FilterRange = 'this-week' | 'last-week' | 'all-time';

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: number;
}

export const CATEGORIES: Category[] = ['food', 'transport', 'data', 'fun', 'other'];

export const CATEGORY_COLORS: Record<Category, string> = {
  food: '#f97316',
  transport: '#3b82f6',
  data: '#8b5cf6',
  fun: '#ec4899',
  other: '#6b7280',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  food: 'Food',
  transport: 'Transport',
  data: 'Data',
  fun: 'Fun',
  other: 'Other',
};
