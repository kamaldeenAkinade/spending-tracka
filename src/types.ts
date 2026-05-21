export type Category = 'food' | 'transport' | 'data' | 'fun' | 'other';
export type FilterRange = 'this-week' | 'last-week' | 'all-time';

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  date: string;
}
