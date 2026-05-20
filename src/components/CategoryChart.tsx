import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Expense, Category } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../types';

interface Props {
  expenses: Expense[];
}

export default function CategoryChart({ expenses }: Props) {
  const totals: Partial<Record<Category, number>> = {};
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] ?? 0) + e.amount;
  }

  const data = Object.entries(totals).map(([cat, value]) => ({
    name: CATEGORY_LABELS[cat as Category],
    value: Math.round(value * 100) / 100,
    color: CATEGORY_COLORS[cat as Category],
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        No expenses yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`₦${Number(value).toLocaleString()}`, '']}
          contentStyle={{
            background: '#1a1a24',
            border: '1px solid #2a2a38',
            borderRadius: '12px',
            color: '#e2e2e8',
          }}
        />
        <Legend
          formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 13 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
