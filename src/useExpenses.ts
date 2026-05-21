import { useState, useEffect } from 'react';
import type { Expense } from './types';
import { CATEGORIES } from './types';

const STORAGE_KEY = 'receipts_expenses';

const VALID_CATEGORIES = new Set<string>(CATEGORIES);

function isValidExpense(x: unknown): x is Expense {
  if (typeof x !== 'object' || x === null) return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.amount === 'number' &&
    e.amount > 0 &&
    VALID_CATEGORIES.has(e.category as string) &&
    typeof e.date === 'string'
  );
}

function load(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidExpense);
  } catch {
    return [];
  }
}

function save(expenses: Expense[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    return true;
  } catch {
    return false;
  }
}

const uuid = (): string =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>(load);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    const ok = save(expenses);
    setSaveError(!ok);
  }, [expenses]);

  function addExpense(expense: Omit<Expense, 'id'>) {
    const next: Expense = { ...expense, id: uuid() };
    setExpenses((prev) => [next, ...prev]);
  }

  function deleteExpense(id: string): Expense | undefined {
    const deleted = expenses.find((e) => e.id === id);
    if (deleted) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    }
    return deleted;
  }

  function restoreExpense(expense: Expense) {
    setExpenses((prev) => [expense, ...prev]);
  }

  return { expenses, addExpense, deleteExpense, restoreExpense, saveError };
}
