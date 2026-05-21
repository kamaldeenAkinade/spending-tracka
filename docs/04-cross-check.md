# Receipts — Cross‑Check Audit

> A thorough independent audit that re‑examines everything in `03‑audit.md`,
> then digs into **charts, data shape, and interaction patterns** that the
> first audit never touched. Every line of code has been read. Every data
> flow has been traced.

---

## How this audit relates to the first one

The original audit (`03‑audit.md`) is well‑researched and correctly identifies
all of these issues:

| Finding | Severity |
|---|---|
| `save()` missing try/catch → silent data loss | 🔴 Critical |
| `JSON.parse` trusted without validation | 🟠 High |
| No list virtualization | 🟠 High |
| Empty state / no first‑run guidance | 🟡 Medium |
| No `useMemo` on derived values | 🟡 Medium |
| ₦ symbol hardcoded 8 times | 🟡 Medium |
| Locale/symbol mismatch in `toLocaleString` | 🟡 Medium |
| No currency field in `Expense` | 🟢 Low |

This cross‑check audit does **not** re‑list those. Instead it finds:

1. **Things the first audit missed entirely** (new findings)
2. **Things it saw but undercounted or underestimated** (severity adjustments)
3. **Things it saw in one place but missed in another** (same bug, different component)

---

## How to read the severity ratings

| Rating | Meaning |
|---|---|
| 🔴 Critical | Silent data loss or unrecoverable crash |
| 🟠 High | Noticeable problems under normal use, or likely data corruption path |
| 🟡 Medium | Works today, causes pain as the app grows |
| 🟢 Low | Minor; acceptable trade‑off for a no‑backend app |

---

## 1. Charts — Data shape issues

### Finding 1A — DailyChart timezone off‑by‑one 🟠 High

**File:** `src/components/DailyChart.tsx:15`

```ts
const total = expenses
  .filter((e) => e.date === day)   // exact string match
  .reduce((sum, e) => sum + e.amount, 0);
```

`day` comes from `getLast7Days()` (`src/dateUtils.ts:52–60`):

```ts
function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));  // ← UTC conversion
  }
  return days;
}
```

**The root cause:**

- `new Date()` creates a date in **local** time.
- `d.setDate(d.getDate() - i)` manipulates in **local** time.
- `.toISOString()` converts to **UTC** before slicing.

Expenses store dates as plain `"YYYY-MM-DD"` strings from a `<input type="date">`
picker, which uses **local** time with no timezone component.

**What breaks:**

A user in UTC‑5 (e.g. New York) opens the app at 11 PM local time.
- `new Date()` → May 20, 11:00 PM local.
- `.toISOString()` → `"2026-05-21T04:00:00Z"` (next day in UTC).
- `getLast7Days()` returns days ending with `"2026-05-21"`.
- The expense entered on May 20 has date `"2026-05-20"`.
- `"2026-05-20" === "2026-05-21"` → `false`.
- **The expense disappears from the chart.**

This affects every user in a negative UTC offset when they add expenses in the
evening. It is not rare — it is every night for half the world's timezones.

**Why the first audit missed it:**

The audit assumed the string comparison was safe because both sides are ISO
date strings. It never traced `toISOString()`'s implicit UTC conversion. The
audit focused on the filter's date comparison (which correctly uses
`+ 'T00:00:00'` to stay in local time) but didn't check `getLast7Days()`.

**Fix:**

Replace `toISOString().slice(0, 10)` with a local‑time date formatter:

```ts
function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
```

---

### Finding 1B — `cat as Category` in CategoryChart is an unsafe cast 🟠 High

**File:** `src/components/CategoryChart.tsx:15–19`

```ts
const data = Object.entries(totals).map(([cat, value]) => ({
  name: CATEGORY_LABELS[cat as Category],   // ← assertion, not validation
  value: Math.round(value * 100) / 100,
  color: CATEGORY_COLORS[cat as Category],  // ← same
}));
```

**The data flow:**

1. `totals` is `Partial<Record<Category, number>>`. The `for` loop on lines
   11–13 writes into it using `e.category` which comes from `JSON.parse` —
   already widened from `any`, so it could be any string.
2. `Object.entries(totals)` returns `[string, number][]` — the key is typed
   as `string`, not `Category`. `as Category` is a compile‑only cast.
3. If localStorage contains a corrupt category like `"groceries"`:
   - `CATEGORY_LABELS["groceries"]` → `undefined`
   - `CATEGORY_COLORS["groceries"]` → `undefined`
   - Recharts receives `{ name: undefined, value: 2500, color: undefined }`

**Why worse than the audit described:**

The first audit (Finding 4B) traced this through `ExpenseList` where
`"undefined1f"` becomes an invisible badge. But in `CategoryChart` the
consequences can be more severe: Recharts may crash rather than silently
skip the slice, and without an error boundary the entire app goes white.

**Why the first audit missed it:**

The audit correctly identified the runtime validation gap, but only traced
the consequences through `ExpenseList`. The exact same corrupted data flows
through `CategoryChart` too, just one prop away.

**Fix:**

Same as the audit recommends — validate data on load. Additionally, filter
out invalid categories before building chart data:

```ts
const data = Object.entries(totals)
  .filter(([cat]) => cat in CATEGORY_LABELS)
  .map(([cat, value]) => ({
    name: CATEGORY_LABELS[cat as Category],
    value: Math.round(value * 100) / 100,
    color: CATEGORY_COLORS[cat as Category],
  }));
```

---

### Finding 1C — `value` typed as `number | undefined` can produce NaN 🟡 Medium

**File:** `src/components/CategoryChart.tsx:15–17`

```ts
const data = Object.entries(totals).map(([cat, value]) => ({
  name: CATEGORY_LABELS[cat as Category],
  value: Math.round(value * 100) / 100,   // value is number | undefined
  color: CATEGORY_COLORS[cat as Category],
}));
```

`totals` is `Partial<Record<Category, number>>`. `Object.entries` returns
`[string, number | undefined][]` because `Partial` makes every value
optional. `Math.round(undefined * 100)` → `NaN`.

Practically impossible because the `for` loop initialises with `?? 0` before
incrementing. But the type says "this could be `undefined`" and nothing
defends against it.

---

### Finding 1D — Chart tooltip formatters use locale‑less `toLocaleString` 🟢 Low

**Files:**
- `src/components/CategoryChart.tsx:47`
- `src/components/DailyChart.tsx:52`

```ts
formatter={(value) => [`₦${Number(value).toLocaleString()}`, '']}
```

Same class of issue as the audit's Finding 5B (locale mismatch), but these
2 instances were **not counted** in the audit's search for `₦` — it found
8 hardcoded `₦` symbols, but these are actually 9 and 10. The search missed
them because they are inside arrow functions in JSX prop expressions.

---

### Finding 1E — Bar chart colours are magic strings 🟢 Low

**File:** `src/components/DailyChart.tsx:67`

```ts
fill={entry.isToday ? '#d4d4d8' : '#2a2a30'}
```

Unlike category colours which have a single source of truth
(`CATEGORY_COLORS` in `types.ts`), the daily bar colours are literal hex
values that appear nowhere else. Same class as the ₦ hardcoding issue.

---

### Finding 1F — DailyChart ignores the filter tab, showing unfiltered data 🟡 Medium

**File:** `src/App.tsx:70`

```ts
<DailyChart expenses={expenses} />   // ← full array, NOT filtered
```

This is a documented design choice. But it creates a confusing state:
- User selects "Last Week" tab → stats show last week's totals
- Expense list shows last week's entries
- DailyChart still shows the **current** 7‑day window with today's data

A user looking at "Last Week" data sees a bar chart that includes today.
The chart and the list are telling different stories.

**Fix:** Either pass `filtered` to DailyChart too, or label the chart
clearly: "Last 7 Days (all time)" to signal that it ignores the filter.

---

## 2. Interaction & UX — What the form does not protect against

### Finding 2A — No undo or confirmation for delete 🟠 High

**File:** `src/useExpenses.ts:35–37`

```ts
function deleteExpense(id: string) {
  setExpenses((prev) => prev.filter((e) => e.id !== id));
}
```

One click deletes permanently. No confirmation dialog. No undo. No trash.
Given that localStorage is the **only** storage, this is irreversible data
loss through a completely frictionless action.

The first audit flagged `save()`'s missing error handling as Critical
because it causes silent data loss. Delete with no confirmation is the
**same outcome** — data loss — just through deliberate action rather than
a latent bug. The user has no way to recover from a mis‑click.

**Fix:** Add a brief undo mechanism (keep the item in a "recently deleted"
state for 5 seconds with an "Undo" button), or at minimum a `window.confirm`.

---

### Finding 2B — Double‑submit creates duplicate expenses 🟠 High

**File:** `src/components/AddExpense.tsx:16–31`

```ts
function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  const parsed = parseFloat(amount);
  if (!amount || isNaN(parsed) || parsed <= 0) { ... return; }
  ...
  onAdd({ amount: parsed, category, date });
  setAmount('');
  setDate(today);
}
```

No guard against rapid clicking. Four clicks before React re‑renders →
four identical expenses with different `id` and `createdAt` values.

React 19's automatic batching means all four `setExpenses` calls execute,
each prepending a duplicate to the array.

**Fix:** Disable the submit button immediately:
```ts
const [submitting, setSubmitting] = useState(false);

function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (submitting) return;
  setSubmitting(true);
  // ... validation, onAdd, reset ...
  setSubmitting(false);
}
```

---

### Finding 2C — Form error does not clear when user fixes the input 🟠 High

**File:** `src/components/AddExpense.tsx`

- User types `"abc"`, clicks submit → error "Enter a valid amount" appears.
- User types `"500"` over the `"abc"` → **error stays visible**.
- User must click submit **again** to clear it.

`setError('')` only runs in the success path (line 27). The error is never
cleared reactively. Every incorrect submission adds friction.

**Fix:** Clear error on input change:
```ts
onChange={(e) => { setAmount(e.target.value); setError(''); }}
```

---

## 3. Data shape & persistence — What the type system does not enforce

### Finding 3A — `createdAt` is stored, serialised, and never read 🟡 Medium

**File:** `src/types.ts:9`

```ts
export interface Expense {
  id: string;
  amount: number;
  category: Category;
  date: string;
  createdAt: number;   // ← set by addExpense, used by nobody
}
```

The field is populated (`Date.now()`), serialised (`JSON.stringify`),
persisted (localStorage), deserialised (`JSON.parse`), and never referenced
anywhere in the UI or logic.

The list is ordered by insertion (`[next, ...prev]`), not by `createdAt`.
If data were imported from another source, there would be no way to recover
the original chronological order.

This is dead weight: ~15 bytes per expense in storage, and a misleading
clue for future developers who might assume it is used for sorting.

---

### Finding 3B — `input type="number" step="any"` allows unlimited decimal places 🟡 Medium

**File:** `src/components/AddExpense.tsx:44`

```tsx
<input type="number" min="0" step="any" ... />
```

A user can enter `1500.9999`. The amount is stored as-is. Only the
aggregation in `CategoryChart` rounds (`Math.round(value * 100) / 100`).
The expense list displays with `maximumFractionDigits: 2` which rounds for
display but the stored value still has 4 decimal places.

This creates an internal inconsistency: the same expense contributes
`₦1500.9999` to chart totals but displays as `₦1501.00` in the list.

**Fix:** Use `step="0.01"` on the input, or round on submission:
```ts
const parsed = Math.round(parseFloat(amount) * 100) / 100;
```

---

### Finding 3C — `crypto.randomUUID()` requires HTTPS 🟢 Low

**File:** `src/useExpenses.ts:29`

```ts
id: crypto.randomUUID(),
```

`crypto.randomUUID()` throws in non‑secure contexts (plain HTTP). If the app
is deployed on HTTP, every expense creation crashes silently.

**Fix:** Add a fallback:
```ts
const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
```

---

### Finding 3D — No data export / backup mechanism 🟡 Medium

The app stores 100% of user data in localStorage. This is:
- Tied to one browser on one device
- Lost when the user clears browsing data
- Lost when the user switches devices
- Unrecoverable if corrupted

There is no "Export as JSON" button, no import, no sync. The first audit
accepted the "no‑backend app" constraint and stopped there. But even a
no‑backend app can offer a one‑click JSON download.

---

## 4. Code quality & maintainability — Dead weight and blind spots

### Finding 4A — `App.css` is 184 lines of completely dead code 🟡 Medium

**File:** `src/App.css`

Styles for `.counter`, `.hero`, `#center`, `#next-steps`, `#docs`, `#spacer`,
`.ticks` — none of these selectors exist anywhere in the actual app. This is
leftover Vite/React boilerplate from `npm create vite@latest`.

`App.css` is **never imported** (confirmed by searching all files for
`App.css` imports). Yet it is present in the project and could be bundled.
184 lines of CSS that do nothing.

---

### Finding 4B — Tailwind imported but unused 🟢 Low

**File:** `src/index.css:2`

```css
@import "tailwindcss";
```

No component uses Tailwind utility classes (`flex`, `p-4`, etc.). All styling
is done via plain CSS in `styles.css`. Tailwind is a build dependency that
only contributes its Preflight reset (~5–10 KB CSS) for no benefit.

---

### Finding 4C — No error boundary 🟢 Low

**File:** `src/main.tsx`

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

No error boundary wrapping the app tree. If any component throws during
render (e.g. Recharts receives a corrupt data point), the entire app
unmounts to a blank white screen.

Combined with the unvalidated localStorage data (audit Finding 4B), the
crash chain is:

1. localStorage contains `"category": "groceries"`
2. `CategoryChart` receives `{ name: undefined, value: 2500, color: undefined }`
3. Recharts encounters `fill: undefined` → may throw
4. No error boundary → white screen
5. User reloads → same crash (localStorage unchanged)
6. **App is bricked** until localStorage is manually cleared

This is worse than the first audit's assessment ("may silently skip the
slice"). Without an error boundary, a corrupt localStorage entry can make
the app permanently unusable.

---

### Finding 4D — `thisWeekTotal` duplicates work when filter is `'this-week'` 🟡 Medium

**File:** `src/App.tsx:15–17`

```ts
const filtered = filterExpensesByRange(expenses, filter);
const weekTotal = thisWeekTotal(expenses);       // always 'this-week'
const filteredTotal = filtered.reduce(...);
```

When `filter === 'this-week'`:
- `filtered` calls `filterExpensesByRange` with `'this-week'`
- `thisWeekTotal` calls `filterExpensesByRange` with `'this-week'` **again** internally
- `filteredTotal` reduces the already‑filtered result

That is **4 full array passes** instead of 2. The first audit counted 3
passes but missed that the 4th exists whenever the user is on the default
"This Week" tab (i.e., the most common state of the app).

**Fix:** Derive `weekTotal` from `filtered` when the filter is `'this-week'`:
```ts
const weekTotal = filter === 'this-week'
  ? filteredTotal
  : thisWeekTotal(expenses);
```

---

### Finding 4E — `FilterTabs` `TABS` is not `as const` 🟢 Low

**File:** `src/components/FilterTabs.tsx:3–7`

```ts
const TABS: { label: string; value: FilterRange }[] = [
  { label: 'This Week', value: 'this-week' },
  ...
];
```

`label` is typed as `string` (too wide). `as const` would narrow it.

---

### Finding 4F — `<title>` says `spending-tracka`, brand says "Receipts" 🟢 Low

**File:** `index.html:7`

```html
<title>spending-tracka</title>
```

The app's visible logo calls itself "Receipts." The tab title uses the
project folder name.

---

## 5. The audit that counts (summary table)

### Issues the first audit found correctly

| Finding | Severity |
|---|---|
| `save()` has no try/catch → silent data loss | 🔴 Critical |
| Loaded data is never validated | 🟠 High |
| Expense list has no virtualization | 🟠 High |
| Empty state gives no first‑run guidance | 🟡 Medium |
| Calculations not memoized | 🟡 Medium |
| ₦ symbol hardcoded in 8 places | 🟡 Medium |
| Locale mismatches currency symbol | 🟡 Medium |
| Stored expenses have no currency field | 🟢 Low |

### Issues the first audit missed or undercounted

| # | Finding | Severity | Why it was missed |
|---|---|---|---|
| 1A | DailyChart timezone off‑by‑one (`.toISOString()` UTC vs local dates) | 🟠 High | Assumed string comparison was safe; didn't trace `toISOString`'s UTC conversion |
| 1B | `cat as Category` unsafe cast in chart (same corrupt data, different component) | 🟠 High | Traced through ExpenseList but not CategoryChart |
| 2A | No undo/confirmation for delete | 🟠 High | Focused on localStorage errors, not user‑triggered data loss |
| 2B | Double‑submit creates duplicate expenses | 🟠 High | Didn't test rapid interaction patterns |
| 2C | Form error never clears on input correction | 🟠 High | Didn't test interaction flows |
| 3A | `createdAt` stored/serialised but never read | 🟡 Medium | Didn't audit unused fields |
| 3B | `step="any"` allows >2 decimal places | 🟡 Medium | Didn't inspect input validation |
| 3D | No data export/backup | 🟡 Medium | Accepted "no‑backend app" constraint without questioning |
| 4A | `App.css` = 184 lines dead code | 🟡 Medium | Didn't check for dead files |
| 4D | `thisWeekTotal` + filtered duplicate work on default tab | 🟡 Medium | Counted 3 passes, missed the 4th when filter = 'this‑week' |
| 1C | `value` typed `number \| undefined` → potential NaN in chart | 🟡 Medium | Didn't trace type narrowing gaps |
| 1F | DailyChart ignores filter — shows unfiltered data | 🟡 Medium | Checked components in isolation, not cross‑component consistency |
| 1D | Chart tooltip formatters use locale‑less `toLocaleString` (2 more `₦` instances) | 🟢 Low | Searched for `₦` literal strings, missed arrow functions in JSX props |
| 1E | Bar chart colours are magic hex strings | 🟢 Low | Only checked category colours for SSOT |
| 3C | `crypto.randomUUID()` fails on HTTP | 🟢 Low | Assumed browser API availability |
| 4C | No error boundary → corrupt data can brick the app | 🟢 Low | Noted "may silently skip" but didn't check for crash path |
| 4B | Tailwind imported but unused | 🟢 Low | Didn't check dependency usage |
| 4E | `TABS` not `as const` | 🟢 Low | Minor type‑narrowing concern |
| 4F | `<title>` says `spending-tracka`, brand says Receipts | 🟢 Low | Missed HTML/metadata entirely |

---

## The three most important fixes (in order)

### 1. Fix `save()` error handling — from the first audit 🔴 Critical

Five lines. Silent data loss is the worst outcome for a data‑tracking app.
The first audit's recommendation is exactly right.

### 2. Fix the DailyChart timezone bug 🟠 High

The `e.date === day` comparison combined with `.toISOString()` silently
drops expenses from the chart for users in UTC‑negative timezones who
enter expenses in the evening. This affects roughly half the world's
timezones, every single night.

Fix: replace `.toISOString().slice(0, 10)` with a local‑time formatter
using `getFullYear()`, `getMonth()`, `getDate()`.

### 3. Validate data on load + add an error boundary 🟠 High / 🟢 Low

Unvalidated `JSON.parse` data can reach `CategoryChart` and potentially
crash Recharts, bricking the app. The validation fix from the first
audit plus a single `<ErrorBoundary>` wrapper transforms a permanent‑crash
vector into a graceful "something went wrong" message.
