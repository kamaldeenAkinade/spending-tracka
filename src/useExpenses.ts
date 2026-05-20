import { useState, useEffect } from 'react';
import type { Expense } from './types';

const STORAGE_KEY = 'receipts_expenses';

function load(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(expenses: Expense[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>(load);

  useEffect(() => {
    save(expenses);
  }, [expenses]);

  function addExpense(expense: Omit<Expense, 'id' | 'createdAt'>) {
    const next: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setExpenses((prev) => [next, ...prev]);
  }

  function deleteExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  return { expenses, addExpense, deleteExpense };
}
