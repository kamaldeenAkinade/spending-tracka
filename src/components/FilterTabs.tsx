import type { FilterRange } from '../types';

const TABS = [
  { label: 'This Week', value: 'this-week' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'All Time',  value: 'all-time'  },
] as const satisfies ReadonlyArray<{ label: string; value: FilterRange }>;

interface Props {
  value: FilterRange;
  onChange: (v: FilterRange) => void;
}

export default function FilterTabs({ value, onChange }: Props) {
  return (
    <div className="filter-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`filter-tab${value === tab.value ? ' filter-tab-active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
