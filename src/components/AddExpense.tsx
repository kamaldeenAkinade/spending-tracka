import { useState } from 'react';
import type { Category } from '../types';
import { CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS } from '../types';

interface Props {
  onAdd: (expense: { amount: number; category: Category; date: string }) => void;
}

export default function AddExpense({ onAdd }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('food');
  const [date, setDate] = useState(today);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!date) {
      setError('Pick a date');
      return;
    }
    setError('');
    onAdd({ amount: parsed, category, date });
    setAmount('');
    setDate(today);
  }

  return (
    <div className="bg-[#1a1a24] border border-[#2a2a38] rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-white mb-5">Add Expense</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Amount */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">
            Amount (₦)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₦</span>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#0f0f13] border border-[#2a2a38] rounded-xl pl-8 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">
            Category
          </label>
          <div className="grid grid-cols-5 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`py-2 rounded-xl text-xs font-medium transition-all border ${
                  category === cat
                    ? 'text-white border-transparent'
                    : 'bg-[#0f0f13] text-gray-400 border-[#2a2a38] hover:border-gray-500'
                }`}
                style={
                  category === cat
                    ? { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] }
                    : {}
                }
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#0f0f13] border border-[#2a2a38] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-colors mt-1"
        >
          Add Expense
        </button>
      </form>
    </div>
  );
}
