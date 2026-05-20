import type { Expense } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../types';
import { formatDisplayDate } from '../dateUtils';

interface Props {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

export default function ExpenseList({ expenses, onDelete }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 text-sm">
        No expenses to show
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {expenses.map((e) => (
        <div
          key={e.id}
          className="flex items-center gap-3 bg-[#1a1a24] border border-[#2a2a38] rounded-xl px-4 py-3 group"
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: CATEGORY_COLORS[e.category] }}
          />
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-md flex-shrink-0"
            style={{
              backgroundColor: `${CATEGORY_COLORS[e.category]}22`,
              color: CATEGORY_COLORS[e.category],
            }}
          >
            {CATEGORY_LABELS[e.category]}
          </span>
          <span className="text-gray-400 text-sm flex-shrink-0">
            {formatDisplayDate(e.date)}
          </span>
          <span className="ml-auto font-semibold text-white">
            ₦{e.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <button
            onClick={() => onDelete(e.id)}
            className="ml-2 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none"
            title="Delete"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
