# Receipts — Audit

> Five questions that every real app has to answer before shipping.
> Each one is explained from scratch, with the exact lines of code
> involved, an honest severity rating, and what a fix would look like.

---

## How to read the severity ratings

| Rating | Meaning |
|--------|---------|
| 🔴 Critical | Can cause silent data loss or a crash the user cannot recover from |
| 🟠 High | Likely to cause noticeable problems under normal use |
| 🟡 Medium | Works today, will cause pain as the app grows |
| 🟢 Low | Minor; acceptable trade-off for a no-backend app |

---

## 1. localStorage Failures

### The question

What happens when the browser refuses to read or write localStorage?
This is not hypothetical. It happens in the real world in at least three
situations:

1. **Private / incognito mode** — Safari in private mode blocks all
   `localStorage` writes and throws a hard JavaScript error.
2. **Storage quota exceeded** — every browser caps localStorage at roughly
   5 MB. A user who has many apps storing data there can run out of space.
   Any `setItem` call after that point throws a `QuotaExceededError`.
3. **User preference** — some users turn off local storage in browser
   settings for privacy reasons. Every single call throws.

---

### Finding A — The read path is protected. The write path is not.

The `load` function wraps its work in a `try/catch`:

```ts
// src/useExpenses.ts  lines 6–13
function load(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];          // ← safe: returns empty array if anything goes wrong
  }
}
```

Good. If `getItem` throws, or if `JSON.parse` throws on corrupted data, the
app starts with an empty list instead of crashing. The user loses their
history, but the app stays alive.

Now look at the `save` function right below it:

```ts
// src/useExpenses.ts  lines 15–17
function save(expenses: Expense[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}
```

No `try`. No `catch`. Nothing.

`save` is called by a `useEffect` every single time the expenses list changes:

```ts
// src/useExpenses.ts  lines 22–24
useEffect(() => {
  save(expenses);
}, [expenses]);
```

If `setItem` throws — because storage is full, or because the browser is
in private mode — that error is **completely unhandled**. It bubbles up, React
catches it silently in production, and the user has no idea that their new
expense was never saved. The next time they open the app, it is gone.

---

### Severity: 🔴 Critical

Silent data loss. The user does the right thing (adds an expense), sees it
on screen, closes the tab, and it is gone forever. They have no warning.

---

### What a fix looks like

Wrap `save` the same way `load` is wrapped, and surface the error to the user:

```ts
function save(expenses: Expense[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    return true;
  } catch {
    return false;   // caller can choose to show a warning banner
  }
}
```

The `useEffect` could then check the return value and set a state variable
like `saveError: true`, which `App` renders as a visible warning strip.
At minimum, the user should know their data is not persisting.

---

### Finding B — Loaded data is trusted blindly

```ts
// src/useExpenses.ts  line 9
return raw ? JSON.parse(raw) : [];
```

`JSON.parse` returns `any`. TypeScript immediately widens it to `Expense[]`
because that is the function's return type — but this is a **claim**, not a
**check**. The runtime does not verify that the parsed object actually has
the right fields. This matters more under the Category Typos section below.

---

## 2. Empty State Design

### The question

What does the user see when there are zero expenses? Is it clear what to do
next, or does it look broken?

---

### Finding A — Charts handle empty state with messages

Both charts check for empty data before trying to draw:

```ts
// src/components/CategoryChart.tsx  lines 21–27
if (data.length === 0) {
  return (
    <div style={{ ... }}>
      No expenses yet
    </div>
  );
}
```

```ts
// src/components/DailyChart.tsx  lines 27–33
if (!hasData) {
  return (
    <div style={{ ... }}>
      No expenses in the last 7 days
    </div>
  );
}
```

And the expense list:

```ts
// src/components/ExpenseList.tsx  lines 11–13
if (expenses.length === 0) {
  return <div className="expense-empty">No expenses to show</div>;
}
```

Good — no chart library crashes from being handed an empty array, and the
user gets a text message instead of a blank white box.

---

### Finding B — The stats cards show ₦0.00 and 0 with no context

When there are no expenses, the two stats cards show:

```
TOTAL SPENT          TRANSACTIONS
₦0.00                0
```

These numbers are correct, but they are indistinguishable from a broken
state. A first-time user sees ₦0.00 and does not know if the app failed to
load their data, or if zero is simply the correct answer.

There is no onboarding text, no "add your first expense" call to action, and
no explanation of what the filter tabs do until there is data to filter.

---

### Finding C — The filter tabs are present before there is anything to filter

On first load, the user sees three tabs — This Week, Last Week, All Time —
and nothing behind any of them. Clicking Last Week shows the same empty
expense list. This is not wrong, but it invites confusion. A new user may
click through all three tabs wondering if they are missing something.

---

### Severity: 🟡 Medium

Nothing crashes. The app is usable. But a first-time user faces a cold, silent
screen with no guidance. For a spending tracker — an app that is only useful
if you actually add expenses — the empty state is the first experience, and
it does not explain what to do.

---

### What a fix looks like

When `expenses.length === 0`, replace the entire right column with a single
friendly panel: a short sentence explaining what the app does, and an arrow
pointing toward the form. This is sometimes called a "zero state" or
"first-run experience." It only needs to appear once — the moment the first
expense is added, the normal dashboard takes over.

---

## 3. Performance at 1,000 Expenses

### The question

The app works fine at 5 expenses. Does it still work at 1,000?

---

### Finding A — Every calculation runs unsaved on every render

In `App`, three values are recalculated from scratch on every single render:

```ts
// src/App.tsx  lines 15–17
const filtered = filterExpensesByRange(expenses, filter);
const weekTotal = thisWeekTotal(expenses);
const filteredTotal = filtered.reduce((sum, e) => sum + e.amount, 0);
```

`thisWeekTotal` internally calls `filterExpensesByRange` again, so on every
render the full array is scanned **three times** — once for `filtered`, once
for `weekTotal`, once for `filteredTotal`.

Inside `CategoryChart`, the full array is looped again:

```ts
// src/components/CategoryChart.tsx  lines 10–13
for (const e of expenses) {
  totals[e.category] = (totals[e.category] ?? 0) + e.amount;
}
```

Inside `DailyChart`, the full array is filtered seven times — once per day:

```ts
// src/components/DailyChart.tsx  lines 13–23
const data = days.map((day) => {
  const total = expenses
    .filter((e) => e.date === day)
    .reduce((sum, e) => sum + e.amount, 0);
  ...
});
```

At 1,000 expenses that is 7 × 1,000 = 7,000 item-reads just to build the
bar chart, on top of the three full scans in `App`.

For context: a modern laptop processes millions of simple operations per
millisecond. 10,000 array reads is imperceptible. This is **not a crisis at
1,000 expenses**, but it is worth naming because the pattern scales poorly
and `useMemo` would eliminate the redundancy with very little code.

---

### Finding B — The expense list renders every row with no virtualization

```ts
// src/components/ExpenseList.tsx  lines 19–55
return (
  <div className="expense-list">
    {expenses.map((e) => (
      <div key={e.id} className="expense-row">
        ...
      </div>
    ))}
  </div>
);
```

At 1,000 expenses with the "All Time" filter selected, this renders 1,000
`<div>` elements into the DOM simultaneously. Each row contains roughly six
child elements, so the browser is managing ~6,000 DOM nodes just for the
list — plus the charts, header, form, and everything else.

This **will** cause noticeable lag on a mid-range or low-end phone:
- Initial render of the list takes longer.
- Scrolling becomes choppy because the browser is painting thousands of
  elements on every scroll frame.
- Adding a single new expense causes all 1,001 rows to re-evaluate.

The problem does not appear at 20 or 50 expenses, which is why it is easy
to miss during development.

---

### Finding C — localStorage is rewritten in full on every change

```ts
// src/useExpenses.ts  lines 22–24
useEffect(() => {
  save(expenses);
}, [expenses]);
```

```ts
function save(expenses: Expense[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}
```

Every time an expense is added or deleted, the **entire array** is serialised
to JSON and written to disk. At 1,000 expenses, that is serialising roughly
100–200 KB on every keystroke in the amount field — because typing in the
form does not change expenses, but adding one does trigger a full rewrite.

This is actually acceptable for the scale this app will realistically reach,
but worth understanding.

---

### Severity: 🟠 High (for the list) / 🟡 Medium (for the calculations)

The list rendering without virtualization is a real performance problem that
users on lower-end devices will feel once the list grows beyond a few hundred
items. The repeated calculations are fine at 1,000 but would benefit from
`useMemo` as a clean-up.

---

### What a fix looks like

**For the list:** use a windowing library like `react-window` or
`@tanstack/virtual`. These libraries only render the rows currently visible
in the scroll viewport — typically 10–20 rows — and swap in new ones as the
user scrolls. The DOM stays small regardless of how many expenses exist.

**For the calculations:** wrap each derived value in `useMemo` so it only
recalculates when its specific dependencies change:

```ts
const filtered = useMemo(
  () => filterExpensesByRange(expenses, filter),
  [expenses, filter]
);
```

This means switching from "This Week" to "Last Week" recalculates `filtered`
but does not re-trigger the `weekTotal` calculation, because `weekTotal`
only depends on `expenses`, not `filter`.

---

## 4. Category Typos — What Happens When Data Does Not Match the Type

### The question

TypeScript enforces that `category` must be one of five valid strings. But
TypeScript is a compile-time tool — it checks code, not data. What happens
when data arrives at runtime that the type system never sees?

---

### Finding A — The write path is fully protected

When the user adds an expense through the form, TypeScript ensures the
category is a valid `Category`:

```ts
// src/types.ts  line 1
export type Category = 'food' | 'transport' | 'data' | 'fun' | 'other';
```

```ts
// src/components/AddExpense.tsx  line 12
const [category, setCategory] = useState<Category>('food');
```

The buttons only ever call `setCategory(cat)` where `cat` comes from the
`CATEGORIES` array — which is a typed `Category[]`. You cannot add a bad
category through the UI. TypeScript would refuse to compile the code.

---

### Finding B — The read path is completely unprotected

When the app loads, it reads data from localStorage:

```ts
// src/useExpenses.ts  lines 8–9
const raw = localStorage.getItem(STORAGE_KEY);
return raw ? JSON.parse(raw) : [];
```

`JSON.parse` returns `any`. The function signature says it returns
`Expense[]`, but this is TypeScript's type system being optimistic — there
is no actual check that the parsed data has the right shape. TypeScript cannot
verify what is inside a string at runtime.

If someone opened DevTools and manually edited the localStorage entry to
change `"category": "food"` to `"category": "groceries"`, the data would
load without complaint. TypeScript would call it a `Category`. The app would
proceed.

Then, in `CategoryChart`, this line runs:

```ts
// src/components/CategoryChart.tsx  line 16
name: CATEGORY_LABELS[cat as Category],
```

`CATEGORY_LABELS['groceries']` returns `undefined`. The chart receives
`{ name: undefined, value: 2500, color: undefined }`. Recharts tries to
render a slice with no colour and no label. The exact result depends on
the chart library's own error handling — it may silently skip the slice,
it may show a blank legend entry, or it may crash.

In `ExpenseList`, this line runs:

```ts
// src/components/ExpenseList.tsx  lines 22–25
style={{
  backgroundColor: `${CATEGORY_COLORS[e.category]}1f`,
  color: CATEGORY_COLORS[e.category],
}}
```

`CATEGORY_COLORS['groceries']` is `undefined`. `${undefined}1f` becomes
the string `"undefined1f"` as the background colour. The browser ignores
invalid CSS values, so the badge renders with no background and no text
colour — invisible text on a transparent background.

---

### Severity: 🟠 High

The realistic attack vector here is not a malicious user — it is the
developer, in production, needing to rename or merge a category. If you
ever export users' localStorage data, migrate it, and reimport it without a
careful migration script, some expenses will silently lose their category.
The visual result is subtle enough that users might not notice immediately,
but the data is corrupted.

---

### What a fix looks like

Add a validation step inside `load`, before returning the parsed data:

```ts
const VALID_CATEGORIES = new Set(['food', 'transport', 'data', 'fun', 'other']);

function isValidExpense(x: unknown): x is Expense {
  if (typeof x !== 'object' || x === null) return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.amount === 'number' &&
    VALID_CATEGORIES.has(e.category as string) &&
    typeof e.date === 'string' &&
    typeof e.createdAt === 'number'
  );
}

function load(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidExpense);  // silently drops invalid rows
  } catch {
    return [];
  }
}
```

Any expense that does not pass validation is dropped rather than loaded.
You could also log a warning so a developer notices during debugging.

---

## 5. Currency Assumptions

### The question

The app uses ₦ (Nigerian Naira) everywhere. How deeply is this assumption
baked in? What breaks if a user in a different country uses the app?

---

### Finding A — The ₦ symbol is hardcoded in five separate files

Searching across the codebase:

```
src/App.tsx               line 42  — ₦{weekTotal...}
src/App.tsx               line 59  — ₦{filteredTotal...}
src/components/AddExpense.tsx
                          line 9   — Amount (₦)
                          line 43  — ₦  (the prefix symbol in the input)
src/components/ExpenseList.tsx
                          line 35  — ₦{e.amount...}
src/components/DailyChart.tsx
                          line 49  — ₦${v >= 1000...}
                          line 52  — ₦${Number(value)...}
src/components/CategoryChart.tsx
                          line 47  — ₦${Number(value)...}
```

Eight separate hardcoded `₦` characters across five files. This violates the
single source of truth principle from `docs/02-principles.md`. If you wanted
to change the currency symbol to `$` or `€`, you would need to find and edit
every one of these manually. Miss one and the UI is inconsistent.

---

### Finding B — The symbol and the number format come from different sources

The `₦` symbol is hardcoded (Nigerian Naira). But the number formatting
uses the browser's locale:

```ts
// src/App.tsx  line 42
₦{weekTotal.toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}
```

`undefined` as the locale argument means "use whatever locale this browser
is set to."

On a browser set to **en-NG** (Nigerian English):
```
₦50,000.00    ← comma as thousands separator, period as decimal
```

On a browser set to **de-DE** (German):
```
₦50.000,00    ← period as thousands separator, comma as decimal
```

On a browser set to **fr-FR** (French):
```
₦50 000,00    ← space as thousands separator, comma as decimal
```

The symbol says Nigeria, but the number format says wherever the browser
thinks it is. These two are not guaranteed to agree. A Nigerian user who
has their browser language set to English (US) will see the correct format.
A Nigerian user with a French-language browser will see `₦50 000,00` which,
while technically readable, is inconsistent with local convention.

---

### Finding C — Amount is stored without currency information

```ts
// src/types.ts  lines 4–10
export interface Expense {
  id: string;
  amount: number;       // ← just a number, no currency code
  category: Category;
  date: string;
  createdAt: number;
}
```

The stored expense does not record what currency the amount is in. This is
fine for a single-user, single-currency app. But if you ever wanted to add:
- A currency selector
- Multi-currency tracking
- Export to a spreadsheet that another app reads

...there is no way to know from the stored data whether `50000` means Naira,
Dollars, Yen, or anything else. The assumption is baked into the data format,
not just the display.

---

### Severity: 🟡 Medium

The app was built for a specific audience (Nigerian Naira), and the assumption
is consistent — every expense shows ₦. For that audience it is not a bug. The
problems are maintainability (eight hardcoded symbols) and the locale mismatch
between the symbol and the number format.

---

### What a fix looks like

**For the eight hardcoded symbols:** create a single constant in `types.ts`:

```ts
// src/types.ts
export const CURRENCY = { symbol: '₦', locale: 'en-NG', code: 'NGN' } as const;
```

Then every place that formats money calls a single helper:

```ts
// src/dateUtils.ts
export function formatAmount(amount: number): string {
  return `${CURRENCY.symbol}${amount.toLocaleString(CURRENCY.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
```

Now there is one place to change. The locale is tied to the currency symbol,
so they cannot drift apart.

**For the stored data:** if multi-currency support ever becomes a goal, add a
`currency: string` field to the `Expense` interface (defaulting to `'NGN'`
for existing data) so the stored record carries its own currency context.

---

## Summary

| Area | Severity | Root Cause | Fix Complexity |
|------|----------|-----------|----------------|
| localStorage `save` has no error handling | 🔴 Critical | Missing `try/catch` in one function | Simple — 5 lines |
| Loaded data is never validated | 🟠 High | `JSON.parse` returns `any`, trusted without checks | Moderate — ~20 lines |
| Expense list has no virtualization | 🟠 High | Every row is always in the DOM | Moderate — add `react-window` |
| Empty state gives no first-run guidance | 🟡 Medium | No zero-state screen designed | Design + ~30 lines |
| Calculations not memoized | 🟡 Medium | No `useMemo` | Simple — 4 wraps |
| ₦ symbol hardcoded in 8 places | 🟡 Medium | No currency constant | Simple — extract one helper |
| Number locale mismatches currency symbol | 🟡 Medium | `toLocaleString(undefined, ...)` | Simple — pin locale |
| Stored expenses have no currency field | 🟢 Low | Data model assumption | Future concern only |

---

## The single most important fix

If only one thing on this list were fixed today, it should be the missing
`try/catch` around `localStorage.setItem`. It is one of the simplest fixes
in the table — five lines of code — and it is the only issue that causes
**silent, unrecoverable data loss** with zero warning to the user.

Everything else on this list degrades gracefully. This one disappears the
user's work without telling them.
