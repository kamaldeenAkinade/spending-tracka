import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Expense } from '../types';
import { getLast7Days, formatShortDate } from '../dateUtils';

interface Props {
  expenses: Expense[];
}

export default function DailyChart({ expenses }: Props) {
  const days = getLast7Days();
  const today = new Date().toISOString().slice(0, 10);

  const data = days.map((day) => {
    const total = expenses
      .filter((e) => e.date === day)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      day,
      label: formatShortDate(day),
      total: Math.round(total * 100) / 100,
      isToday: day === today,
    };
  });

  const hasData = data.some((d) => d.total > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        No expenses in the last 7 days
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={55}
          tickFormatter={(v) => `₦${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
        />
        <Tooltip
          formatter={(value) => [`₦${Number(value).toLocaleString()}`, 'Spent']}
          labelStyle={{ color: '#e2e2e8' }}
          contentStyle={{
            background: '#1a1a24',
            border: '1px solid #2a2a38',
            borderRadius: '12px',
            color: '#e2e2e8',
          }}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
        />
        <Bar dataKey="total" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.day}
              fill={entry.isToday ? '#8b5cf6' : '#3b3b52'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
