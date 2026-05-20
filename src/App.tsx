import { useState } from 'react';
import { useExpenses } from './useExpenses';
import { filterExpensesByRange, thisWeekTotal } from './dateUtils';
import AddExpense from './components/AddExpense';
import CategoryChart from './components/CategoryChart';
import DailyChart from './components/DailyChart';
import ExpenseList from './components/ExpenseList';
import FilterTabs from './components/FilterTabs';
import type { FilterRange } from './types';

export default function App() {
  const { expenses, addExpense, deleteExpense } = useExpenses();
  const [filter, setFilter] = useState<FilterRange>('this-week');

  const filtered = filterExpensesByRange(expenses, filter);
  const weekTotal = thisWeekTotal(expenses);
  const filteredTotal = filtered.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      {/* Header */}
      <header className="border-b border-[#2a2a38] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-sm font-bold">
              R
            </div>
            <h1 className="text-xl font-bold text-white">Receipts</h1>
          </div>
          <span className="text-sm text-gray-400">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8">
          {/* Left column: Add form + this week total */}
          <div className="flex flex-col gap-6">
            {/* This week total card */}
            <div className="bg-gradient-to-br from-violet-600/20 to-purple-900/10 border border-violet-500/20 rounded-2xl p-6">
              <p className="text-sm text-violet-300 mb-1">This week's spend</p>
              <p className="text-3xl font-bold text-white">
                ₦{weekTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <AddExpense onAdd={addExpense} />
          </div>

          {/* Right column: Charts + list */}
          <div className="flex flex-col gap-6">
            {/* Filter tabs */}
            <FilterTabs value={filter} onChange={setFilter} />

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1a1a24] border border-[#2a2a38] rounded-2xl p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Total Spent</p>
                <p className="text-2xl font-bold text-white">
                  ₦{filteredTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-[#1a1a24] border border-[#2a2a38] rounded-2xl p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Transactions</p>
                <p className="text-2xl font-bold text-white">{filtered.length}</p>
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#1a1a24] border border-[#2a2a38] rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Spending by Category</h3>
                <CategoryChart expenses={filtered} />
              </div>
              <div className="bg-[#1a1a24] border border-[#2a2a38] rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Last 7 Days</h3>
                <DailyChart expenses={expenses} />
              </div>
            </div>

            {/* Expense list */}
            <div className="bg-[#1a1a24] border border-[#2a2a38] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">
                Expenses
                {filtered.length > 0 && (
                  <span className="ml-2 text-xs text-gray-500 font-normal">{filtered.length} records</span>
                )}
              </h3>
              <ExpenseList expenses={filtered} onDelete={deleteExpense} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
