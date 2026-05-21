import { useState } from 'react';
import type { Category } from '../types';
import { CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS, CURRENCY } from '../constants';
import { localToday } from '../dateUtils';

interface Props {
  onAdd: (expense: { amount: number; category: Category; date: string }) => void;
}

export default function AddExpense({ onAdd }: Props) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('food');
  const [date, setDate] = useState(localToday);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const parsed = Math.round(parseFloat(amount) * 100) / 100;
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!date) {
      setError('Pick a date');
      return;
    }
    setSubmitting(true);
    setError('');
    onAdd({ amount: parsed, category, date });
    setAmount('');
    setDate(localToday());
    setSubmitting(false);
  }

  return (
    <div className="card">
      <p className="form-title">Add Expense</p>
      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label">Amount ({CURRENCY.symbol})</label>
          <div className="input-wrap">
            <span className="input-prefix">{CURRENCY.symbol}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(''); }}
              placeholder="0.00"
              className="input input-with-prefix"
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label">Category</label>
          <div className="cat-grid">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`cat-btn${category === cat ? ' cat-btn-active' : ''}`}
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

        <div className="field">
          <label className="field-label">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          Add Expense
        </button>
      </form>
    </div>
  );
}
