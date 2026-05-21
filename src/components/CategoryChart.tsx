import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Expense, Category } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../constants';
import { formatAmount } from '../format';

interface Props {
  expenses: Expense[];
}

export default function CategoryChart({ expenses }: Props) {
  const totals: Partial<Record<Category, number>> = {};
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] ?? 0) + e.amount;
  }

  const data = Object.entries(totals)
    .filter(([cat]) => cat in CATEGORY_LABELS)
    .map(([cat, value]) => ({
      name: CATEGORY_LABELS[cat as Category],
      value: Math.round((value ?? 0) * 100) / 100,
      color: CATEGORY_COLORS[cat as Category],
    }));

  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, fontSize: 13, color: 'var(--text-3)' }}>
        No expenses yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [formatAmount(Number(value)), '']}
          contentStyle={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-2)',
            borderRadius: 10,
            fontSize: 13,
            color: 'var(--text)',
          }}
        />
        <Legend
          iconSize={8}
          iconType="circle"
          formatter={(value) => (
            <span style={{ color: 'var(--text-2)', fontSize: 12 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
