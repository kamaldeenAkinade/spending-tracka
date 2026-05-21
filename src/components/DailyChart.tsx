import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Expense } from '../types';
import { CURRENCY } from '../constants';
import { formatAmount } from '../format';
import { getLast7Days, formatShortDate, localToday } from '../dateUtils';

const BAR_DEFAULT = '#2a2a30';
const BAR_TODAY   = '#d4d4d8';

interface Props {
  expenses: Expense[];
}

export default function DailyChart({ expenses }: Props) {
  const days = getLast7Days();
  const today = localToday();

  const data = days.map((day) => {
    const total = expenses
      .filter((e) => e.date === day)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      day,
      label: formatShortDate(day),
      total: Math.round(total * 100) / 100,
      isToday: day === today,
      fill: day === today ? BAR_TODAY : BAR_DEFAULT,
    };
  });

  const hasData = data.some((d) => d.total > 0);

  if (!hasData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, fontSize: 13, color: 'var(--text-3)' }}>
        No expenses in the last 7 days
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--text-3)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--text-3)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(v) => `${CURRENCY.symbol}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
        />
        <Tooltip
          formatter={(value) => [formatAmount(Number(value)), 'Spent']}
          labelStyle={{ color: 'var(--text-2)', fontSize: 12 }}
          contentStyle={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-2)',
            borderRadius: 10,
            fontSize: 13,
            color: 'var(--text)',
          }}
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
        />
        <Bar dataKey="total" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
