import { FixedSizeList } from 'react-window';
import type { ListChildComponentProps } from 'react-window';
import type { Expense } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../constants';
import { formatAmount } from '../format';
import { formatDisplayDate } from '../dateUtils';

const ROW_HEIGHT = 50;
const MAX_VISIBLE_ROWS = 10;

interface Props {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

export default function ExpenseList({ expenses, onDelete }: Props) {
  if (expenses.length === 0) {
    return <div className="expense-empty">No expenses to show</div>;
  }

  const listHeight = Math.min(expenses.length * ROW_HEIGHT, MAX_VISIBLE_ROWS * ROW_HEIGHT);

  return (
    <FixedSizeList
      height={listHeight}
      width="100%"
      itemCount={expenses.length}
      itemSize={ROW_HEIGHT}
      style={{ outline: 'none' }}
    >
      {({ index, style }: ListChildComponentProps) => {
        const e = expenses[index];
        return (
          <div style={{ ...style, paddingBottom: 6 }}>
            <div className="expense-row">
              <span
                className="expense-dot"
                style={{ backgroundColor: CATEGORY_COLORS[e.category] }}
              />
              <span
                className="expense-badge"
                style={{
                  backgroundColor: `${CATEGORY_COLORS[e.category]}1f`,
                  color: CATEGORY_COLORS[e.category],
                }}
              >
                {CATEGORY_LABELS[e.category]}
              </span>
              <span className="expense-date">{formatDisplayDate(e.date)}</span>
              <span className="expense-amount">{formatAmount(e.amount)}</span>
              <button
                className="expense-delete"
                onClick={() => onDelete(e.id)}
                title="Delete"
              >
                ×
              </button>
            </div>
          </div>
        );
      }}
    </FixedSizeList>
  );
}
