import type { FilterRange } from '../types';

const TABS: { label: string; value: FilterRange }[] = [
  { label: 'This Week', value: 'this-week' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'All Time', value: 'all-time' },
];

interface Props {
  value: FilterRange;
  onChange: (v: FilterRange) => void;
}

export default function FilterTabs({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 bg-[#1a1a24] border border-[#2a2a38] rounded-xl p-1">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            value === tab.value
              ? 'bg-violet-600 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
