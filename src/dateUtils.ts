import type { FilterRange } from './types';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function mondayOf(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

// Returns YYYY-MM-DD in local time (avoids the UTC shift from toISOString)
function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function localToday(): string {
  return localDateString(new Date());
}

export function getFilterBounds(range: FilterRange): { from: Date | null; to: Date | null } {
  const today = new Date();
  if (range === 'all-time') return { from: null, to: null };

  const thisMonday = mondayOf(today);

  if (range === 'this-week') {
    const sunday = new Date(thisMonday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { from: thisMonday, to: sunday };
  }

  // last-week
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setMilliseconds(-1);
  return { from: lastMonday, to: lastSunday };
}

export function filterExpensesByRange<T extends { date: string }>(
  expenses: T[],
  range: FilterRange
): T[] {
  const { from, to } = getFilterBounds(range);
  if (!from && !to) return expenses;
  return expenses.filter((e) => {
    const d = new Date(e.date + 'T00:00:00');
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

export function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(localDateString(d));
  }
  return days;
}

export function formatShortDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDisplayDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function thisWeekTotal<T extends { date: string; amount: number }>(expenses: T[]): number {
  const filtered = filterExpensesByRange(expenses, 'this-week');
  return filtered.reduce((sum, e) => sum + e.amount, 0);
}
