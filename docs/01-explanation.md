# Receipts — Line-by-Line Explanation

> ELI7: explained like you're 7 years old, but still technically complete.
> Pay close attention to the three callout boxes marked **HOW CHARTS GET DATA**,
> **HOW STATE IS DERIVED**, and **HOW FILTERING WORKS**.

---

## The big picture first

Imagine the app is a school classroom:

- **localStorage** is the backpack — it holds everything even when you go home (close the browser).
- **`useExpenses`** is the teacher — the single person who owns the class list and decides who gets added or removed.
- **`App`** is the classroom — it gets the list from the teacher and decides what everyone else gets to see.
- **Filters** are like coloured glasses — they don't change the real list, they just make you see only part of it.
- **Charts** are the whiteboards — they read whatever the classroom hands them and draw pictures from it.

---

## `src/types.ts` — The Vocabulary File

This file doesn't run any logic. It just defines the *shapes* and *names* that every other file agrees to use — like a dictionary everyone shares.

```ts
export type Category = 'food' | 'transport' | 'data' | 'fun' | 'other';
```
TypeScript type that says: "a category can only ever be one of these five exact strings." If you tried to write `'coffee'` somewhere that expects a `Category`, TypeScript would error. The `|` means "or."

```ts
export type FilterRange = 'this-week' | 'last-week' | 'all-time';
```
Same idea for the three filter options the user can pick.

```ts
export interface Expense {
  id: string;
  amount: number;
  category: Category;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: number;
}
```
An `interface` is a blueprint — it says every expense object must have exactly these five fields:
- `id` — a unique random string so we can find and delete one specific expense later.
- `amount` — a number (₦500, ₦1200, etc.).
- `category` — must be one of the five Category words above.
- `date` — stored as a plain text string like `"2026-05-20"` (year-month-day). We use this format because strings sort alphabetically in the same order as dates, which makes comparisons easy.
- `createdAt` — a timestamp (milliseconds since Jan 1 1970). Used to keep the list in newest-first order.

```ts
export const CATEGORIES: Category[] = ['food', 'transport', 'data', 'fun', 'other'];
```
A plain array of all five categories. Used by `AddExpense` to loop and draw the five pill buttons without having to type each one manually.

```ts
export const CATEGORY_COLORS: Record<Category, string> = {
  food: '#f97316',
  transport: '#3b82f6',
  data: '#8b5cf6',
  fun: '#ec4899',
  other: '#6b7280',
};
```
`Record<Category, string>` means: "an object where every key is a Category and every value is a string." This is the single source of truth for colours — charts, list badges, and category buttons all read from here. Change one hex code and every place updates automatically.

```ts
export const CATEGORY_LABELS: Record<Category, string> = {
  food: 'Food',
  ...
};
```
Same idea for display text. The internal key is lowercase (`'food'`), the label shown to the user is capitalised (`'Food'`). Keeping them separate means the internal code never has to guess about capitalisation.

---

## `src/useExpenses.ts` — The Memory Hook

This is a **custom React hook** — a function whose name starts with `use`. Hooks are how React components share stateful logic without copy-pasting code.

```ts
const STORAGE_KEY = 'receipts_expenses';
```
The key we use inside localStorage. Think of localStorage as a giant key-value dictionary built into your browser. This constant makes sure every read and write uses the exact same key string.

---

### The `load` function

```ts
function load(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
```
- `localStorage.getItem(STORAGE_KEY)` — asks the browser: "do you have anything stored under this name?" Returns `null` if nothing is there.
- `raw ? JSON.parse(raw) : []` — if something was found, parse it from the JSON string back into a real JavaScript array. If nothing was found, return an empty array `[]`. We never return `null` — the rest of the app always expects an array.
- The whole thing is wrapped in `try/catch` because `JSON.parse` will throw an error if the stored string is somehow corrupted. The `catch` silently returns `[]` so the app keeps working instead of crashing.

---

### The `save` function

```ts
function save(expenses: Expense[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}
```
`JSON.stringify` turns the JavaScript array into a plain string (localStorage can only store strings). `setItem` writes that string into the browser's storage. Every time the expenses list changes, this runs and overwrites whatever was there before.

---

### The `useExpenses` hook itself

```ts
export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>(load);
```
`useState` creates a piece of state — a variable React will remember across re-renders. The `load` here is passed as a **lazy initialiser**: instead of calling `load()` right now and passing the result, we pass the function itself. React calls it *once* on the first render only. That means we only hit localStorage once at startup, not on every render.

> **HOW STATE IS DERIVED**
>
> `expenses` is the **single source of truth** — the master list. It never gets trimmed, sorted differently, or sliced. Every statistic, every chart, every list the user sees is *calculated from this one array* at render time. The array itself is never modified — only replaced.
>
> When the user changes the filter, `expenses` stays the same. When the user deletes an entry, `expenses` is replaced with a new array that doesn't contain that entry. Nothing ever reaches into the array and edits an item in place. This is the core React data pattern.

```ts
  useEffect(() => {
    save(expenses);
  }, [expenses]);
```
`useEffect` runs *after* React finishes painting the screen. The second argument `[expenses]` is the **dependency array** — React only re-runs this effect when `expenses` changes. So every time the list changes, we persist it to localStorage automatically. The effect doesn't run on every render, only when the value it depends on actually changed.

---

### `addExpense`

```ts
  function addExpense(expense: Omit<Expense, 'id' | 'createdAt'>) {
    const next: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setExpenses((prev) => [next, ...prev]);
  }
```
- `Omit<Expense, 'id' | 'createdAt'>` — TypeScript utility type. It says: "give me everything in the Expense interface *except* `id` and `createdAt`." The caller (the form) only provides amount, category, and date. This function fills in the rest.
- `crypto.randomUUID()` — generates a random string like `"a3f8c2d1-..."` that is guaranteed to be unique even if you add thousands of expenses.
- `Date.now()` — the current time in milliseconds.
- `{ ...expense, id: ..., createdAt: ... }` — the spread operator copies all fields from `expense` into a new object, then adds the two extra fields. It does NOT modify `expense`.
- `setExpenses((prev) => [next, ...prev])` — this is the **functional update form** of `setExpenses`. Instead of passing a new value directly, we pass a function that receives the *current* value (`prev`) and returns the new value. This is safer when multiple state updates could stack up. `[next, ...prev]` builds a brand-new array with the new expense first, then all the old ones — so the list is always newest-first.

---

### `deleteExpense`

```ts
  function deleteExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }
```
- `prev.filter(...)` — creates a brand-new array containing only the items where the condition is `true`. It never modifies `prev`.
- `e.id !== id` — the condition: keep every expense whose id is NOT the one we want to delete. The one expense whose id matches will fail the condition and be excluded from the new array.
- The old array `prev` is untouched. React replaces the state with the new array, triggering a re-render.

---

## `src/dateUtils.ts` — The Calendar Toolkit

---

### `startOfDay`

```ts
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
```
`new Date(date)` copies the date — important because `setHours` modifies in place, and we don't want to accidentally change the original. `setHours(0, 0, 0, 0)` sets hours, minutes, seconds, and milliseconds all to zero. So 14 May 2026 at 3:47pm becomes 14 May 2026 at midnight exactly. This makes day comparisons predictable.

---

### `mondayOf`

```ts
function mondayOf(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, 2=Tue ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
```
`getDay()` returns a number 0–6. Monday is 1. To get back to Monday:
- If today is Wednesday (day = 3), `diff = 1 - 3 = -2` → go back 2 days.
- If today is Monday (day = 1), `diff = 1 - 1 = 0` → stay here.
- If today is Sunday (day = 0), `diff = -6` → go back 6 days to last Monday.

This function is used twice — once to find the start of *this* week, and once to find the start of *last* week.

---

### `getFilterBounds`

```ts
export function getFilterBounds(range: FilterRange): { from: Date | null; to: Date | null } {
  const today = new Date();
  if (range === 'all-time') return { from: null, to: null };

  const thisMonday = mondayOf(today);

  if (range === 'this-week') {
    const sunday = new Date(thisMonday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { from: thisMonday, to: sunday };
  }

  // last-week
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setMilliseconds(-1);
  return { from: lastMonday, to: lastSunday };
}
```
Returns two Date objects — a `from` and a `to` — that define the edges of the selected time window.

- **all-time**: returns `null` for both. The caller treats `null` as "no boundary."
- **this-week**: `from` = this Monday at midnight, `to` = this Sunday at 23:59:59.999 (one millisecond before Monday).
- **last-week**: `from` = last Monday at midnight. `to` is `thisMonday` minus one millisecond — setting `setMilliseconds(-1)` on a midnight Date steps back one millisecond into the previous day's 23:59:59.999. Neat trick to avoid off-by-one errors.

---

### `filterExpensesByRange` — The Heart of Filtering

> **HOW FILTERING WORKS**
>
> This is the most important function in the app. Here is the key insight: **it never touches the original array**. It takes the full `expenses` array in and produces a *new* array out. The original is left completely alone.

```ts
export function filterExpensesByRange<T extends { date: string }>(
  expenses: T[],
  range: FilterRange
): T[] {
```
The `<T extends { date: string }>` is a **generic type constraint**. It says: "I'll work with any array whose items have at least a `date` field." This makes the function reusable — `thisWeekTotal` uses it too, with the same signature.

```ts
  const { from, to } = getFilterBounds(range);
  if (!from && !to) return expenses;
```
Get the time window boundaries. If both are `null` (all-time), return the original array immediately — no work needed.

```ts
  return expenses.filter((e) => {
    const d = new Date(e.date + 'T00:00:00');
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
```
- `expenses.filter(...)` — just like `deleteExpense`, this builds a brand-new array. The original `expenses` is never changed.
- `new Date(e.date + 'T00:00:00')` — expenses store dates as plain strings like `"2026-05-20"`. Appending `'T00:00:00'` tells JavaScript to parse it as local midnight, not UTC midnight. Without this, dates near midnight can shift by a day depending on your timezone.
- `if (from && d < from) return false` — if the expense's date is before the window start, exclude it.
- `if (to && d > to) return false` — if the expense's date is after the window end, exclude it.
- `return true` — survived both checks, keep it.

The result is a fresh array containing only the expenses that fall inside the selected window. The word "filter" here is doing double duty: it's what the user clicked, and it's the JavaScript array method used to implement it.

---

### `getLast7Days`

```ts
export function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}
```
Counts from 6 down to 0. When `i = 6`, we go back 6 days. When `i = 0`, we stay on today. The loop builds an array of 7 date strings in chronological order, always ending with today. Example output: `["2026-05-14", "2026-05-15", ..., "2026-05-20"]`. The bar chart uses exactly this array as its x-axis.

---

### `thisWeekTotal`

```ts
export function thisWeekTotal<T extends { date: string; amount: number }>(expenses: T[]): number {
  const filtered = filterExpensesByRange(expenses, 'this-week');
  return filtered.reduce((sum, e) => sum + e.amount, 0);
}
```
Reuses `filterExpensesByRange` to get this week's expenses, then `reduce` adds all the amounts together. `reduce` walks through the array keeping a running total (`sum`), starting at `0`. The "This week's spend" card in the header is always calculated this way — it ignores whatever filter tab the user picked.

---

## `src/App.tsx` — The Classroom

```ts
const { expenses, addExpense, deleteExpense } = useExpenses();
```
Calls the hook. `expenses` is the full unfiltered list. `addExpense` and `deleteExpense` are the only two ways to change it. The component does not call `setExpenses` directly — it goes through the hook.

```ts
const [filter, setFilter] = useState<FilterRange>('this-week');
```
The filter is its own separate piece of state. Default is `'this-week'`. When the user clicks a tab, `setFilter` is called, React re-renders, and everything that depends on `filter` gets recalculated.

---

### Derived state — calculated every render

```ts
const filtered = filterExpensesByRange(expenses, filter);
const weekTotal = thisWeekTotal(expenses);
const filteredTotal = filtered.reduce((sum, e) => sum + e.amount, 0);
```

> **HOW STATE IS DERIVED — the App level**
>
> These three lines are *not* stored in state. They are recalculated from scratch on every render. This is intentional. There is only one variable stored in `useState` for data: `expenses`. Everything else — `filtered`, `weekTotal`, `filteredTotal` — is derived from it.
>
> Why not store them in state too? Because then you'd have to keep multiple pieces of state in sync manually, which is a common source of bugs. Instead: store the minimum, derive the rest. React is fast enough to recalculate these on every render without performance issues.

- `filtered` — the expenses visible under the current tab. Passed to `CategoryChart`, `ExpenseList`, and the stats cards.
- `weekTotal` — always calculated from the *full* `expenses` array, not from `filtered`. That's why the "This week's spend" card doesn't change when you switch to "All Time."
- `filteredTotal` — the sum of whatever is currently filtered. Used in the "Total Spent" stats card.

---

### Passing data down

```ts
<CategoryChart expenses={filtered} />
<DailyChart expenses={expenses} />
<ExpenseList expenses={filtered} onDelete={deleteExpense} />
```
Notice:
- `CategoryChart` gets `filtered` — the donut responds to the filter tab.
- `DailyChart` gets the full `expenses` — the last-7-days bar chart always shows real history regardless of filter.
- `ExpenseList` gets `filtered` — the list matches the selected tab.

This is a deliberate design choice. Both chart components receive a plain array of expenses — they don't know about filters, dates, or state. They just draw whatever they're given.

---

## `src/components/FilterTabs.tsx`

```ts
const TABS: { label: string; value: FilterRange }[] = [
  { label: 'This Week', value: 'this-week' },
  ...
];
```
A static array of objects that maps display labels to internal values. Defined outside the component so it's created once, not on every render.

```ts
interface Props {
  value: FilterRange;
  onChange: (v: FilterRange) => void;
}
```
The component receives two props: `value` (which tab is currently active) and `onChange` (a function to call when a tab is clicked). It does not own any state — it's a **controlled component**. The parent (`App`) owns the state; this component just renders it and reports events back up.

```ts
onClick={() => onChange(tab.value)}
```
When clicked, calls `onChange` with the tab's value. `onChange` is `setFilter` in App. React updates state, re-renders App, passes the new `value` back down to FilterTabs, and the active button highlights.

```ts
className={`... ${value === tab.value ? 'bg-violet-600 text-white' : 'text-gray-400 ...'}`}
```
A ternary expression inside the className string. Compares the tab's value to the current active value. If they match, apply the active styles; otherwise apply the inactive styles. No separate `isActive` variable needed — it's derived inline.

---

## `src/components/AddExpense.tsx`

```ts
const today = new Date().toISOString().slice(0, 10);
const [amount, setAmount] = useState('');
const [category, setCategory] = useState<Category>('food');
const [date, setDate] = useState(today);
const [error, setError] = useState('');
```
`today` is computed once when the component mounts (using `slice(0, 10)` to trim the full ISO string down to just `"YYYY-MM-DD"`). Each form field has its own piece of state. They all start empty or at sensible defaults.

```ts
function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
```
`e.preventDefault()` stops the browser from doing its default form behaviour, which is to reload the whole page. Without this line, the page would refresh and all state would be lost every time you submitted.

```ts
  const parsed = parseFloat(amount);
  if (!amount || isNaN(parsed) || parsed <= 0) {
    setError('Enter a valid amount');
    return;
  }
```
`amount` is stored as a string (because input values are always strings). `parseFloat` converts it to a number. Three checks in one condition:
- `!amount` — the field is empty.
- `isNaN(parsed)` — couldn't parse as a number (e.g. user typed "abc").
- `parsed <= 0` — zero or negative amounts don't make sense.

If any of these is true, set an error message and `return` early. The expense is NOT added.

```ts
  onAdd({ amount: parsed, category, date });
  setAmount('');
  setDate(today);
```
On success: call the `onAdd` prop (which is `addExpense` from the hook), then reset the amount and date fields. The category intentionally stays — most people buy food multiple times and don't want to re-click the same category every time.

---

### Category pill buttons

```ts
{CATEGORIES.map((cat) => (
  <button
    key={cat}
    type="button"
    onClick={() => setCategory(cat)}
    style={
      category === cat
        ? { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] }
        : {}
    }
  >
```
`type="button"` is critical. Without it, every `<button>` inside a `<form>` defaults to `type="submit"`. Clicking a category pill would submit the form. `type="button"` overrides that.

The `style` prop applies a coloured background only to the selected category. When `category === cat` is true, the button gets that category's colour from `CATEGORY_COLORS`. Otherwise `{}` means no inline styles — Tailwind classes handle the unselected look.

---

## `src/components/CategoryChart.tsx`

> **HOW CHARTS GET DATA — the donut chart**

```ts
const totals: Partial<Record<Category, number>> = {};
for (const e of expenses) {
  totals[e.category] = (totals[e.category] ?? 0) + e.amount;
}
```
This loop **aggregates** the expenses into totals per category. `totals` starts as an empty object. For each expense:
- Look up the running total for that category: `totals[e.category]`.
- `?? 0` — if no total exists yet for this category, use `0` instead of `undefined`.
- Add the expense's amount to it.

After the loop, `totals` might look like: `{ food: 4500, transport: 1200, fun: 800 }`. Categories with no expenses simply don't appear as keys.

`Partial<Record<Category, string>>` means the object doesn't have to have all five categories — it might only have two or three, depending on what expenses exist.

```ts
const data = Object.entries(totals).map(([cat, value]) => ({
  name: CATEGORY_LABELS[cat as Category],
  value: Math.round(value * 100) / 100,
  color: CATEGORY_COLORS[cat as Category],
}));
```
`Object.entries(totals)` turns `{ food: 4500, transport: 1200 }` into `[['food', 4500], ['transport', 1200]]`. The `.map` then transforms each `[key, value]` pair into the exact object shape Recharts expects: `{ name, value, color }`.

`Math.round(value * 100) / 100` rounds to two decimal places. Multiplying by 100, rounding, then dividing avoids floating-point weirdness like `₦1200.0000000001`.

This `data` array is what the chart actually draws. The raw `expenses` array has been fully transformed into chart-ready data.

```ts
<Pie
  data={data}
  innerRadius={65}
  outerRadius={100}
  dataKey="value"
>
  {data.map((entry) => (
    <Cell key={entry.name} fill={entry.color} stroke="transparent" />
  ))}
</Pie>
```
- `innerRadius={65}` creates the hole in the middle — making it a donut instead of a full pie.
- `dataKey="value"` tells Recharts which field in each data object determines the slice size.
- Each `<Cell>` maps to one slice. The `fill` comes from the `color` field we attached earlier in the transform step. `stroke="transparent"` removes the border line between slices.

---

## `src/components/DailyChart.tsx`

> **HOW CHARTS GET DATA — the bar chart**

```ts
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
```
This builds the bar chart data differently from the donut chart. Instead of grouping by category, it groups by day:
- `getLast7Days()` generates an array of 7 date strings.
- For each day, filter all expenses to only those where `e.date === day` (exact string match — possible because all dates are stored in the same `"YYYY-MM-DD"` format).
- `reduce` sums those expenses into a single `total`.
- `isToday` is a boolean flag that the chart uses to colour today's bar differently.

The result is exactly 7 objects — one per day — even for days with no spending (they get `total: 0`). Recharts needs a data point for every position on the x-axis or it would leave gaps.

```ts
<Bar dataKey="total" radius={[6, 6, 0, 0]}>
  {data.map((entry) => (
    <Cell
      key={entry.day}
      fill={entry.isToday ? '#8b5cf6' : '#3b3b52'}
    />
  ))}
</Bar>
```
`radius={[6, 6, 0, 0]}` rounds the top-left and top-right corners of each bar (the four values are top-left, top-right, bottom-right, bottom-left). The bottom stays sharp so bars look like they sit on a floor.

Each `<Cell>` applies a different colour depending on `isToday`: violet for today, dark grey for all other days.

```ts
tickFormatter={(v) => `₦${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
```
Custom formatter for the Y axis labels. Numbers below 1000 show as-is (`₦500`). Numbers at 1000 or above are shortened (`₦2k` instead of `₦2000`). Keeps the axis readable without needing wide spacing.

---

## `src/components/ExpenseList.tsx`

```ts
<div ... className="... group">
```
The Tailwind class `group` on the parent div unlocks the `group-hover:` prefix on child elements. When the mouse hovers anywhere inside the parent, all children with `group-hover:` classes activate.

```ts
className="... opacity-0 group-hover:opacity-100 ..."
```
The delete button is invisible by default (`opacity-0`). It becomes visible (`opacity-100`) when the parent row is hovered — the `group-hover:` prefix makes this work. No JavaScript event listeners needed.

```ts
style={{
  backgroundColor: `${CATEGORY_COLORS[e.category]}22`,
  color: CATEGORY_COLORS[e.category],
}}
```
`22` appended to a 6-digit hex colour is a two-digit hex alpha value (roughly 13% opacity). This makes a semi-transparent tinted background for the category badge using the same colour as the text — giving a "coloured pill" look with a single source of truth.

```ts
onClick={() => onDelete(e.id)}
```
The delete button passes the expense's `id` up to `onDelete`, which is `deleteExpense` from the hook. It does not touch any state directly — it tells the parent which id to remove, and the parent handles the rest.

---

## The complete data flow, summarised

```
localStorage
    │  (read once on first render, via useState lazy init)
    ▼
expenses  ──────────────────────────────────────────────┐
(full array, lives in useExpenses hook)                 │
    │                                                   │
    │  filterExpensesByRange(expenses, filter)           │  thisWeekTotal(expenses)
    ▼                                                   ▼
filtered                                          weekTotal
(new array, never touches expenses)               (always current week)
    │
    ├──► CategoryChart  (aggregates by category → donut slices)
    ├──► ExpenseList    (renders each item)
    ├──► filteredTotal  (.reduce to a single number)
    └──► filtered.length (transaction count)

expenses (full, unfiltered)
    └──► DailyChart     (groups by day for last 7 days → bars)
```

Three rules that hold everywhere in this codebase:
1. **One source of truth.** `expenses` is the only array stored in state. Everything else is calculated.
2. **Never mutate.** `filter`, `map`, `reduce`, and spread (`...`) always produce new arrays or objects. The originals are never changed.
3. **Data flows down, events flow up.** Parent components hold state and pass it to children as props. Children report user actions back up via callback props (`onAdd`, `onDelete`, `onChange`).
