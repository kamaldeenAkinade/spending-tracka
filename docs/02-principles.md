# Receipts — Principles Spotting

> Five software engineering principles that run through the whole codebase.
> Explained like a patient teacher to a 7-year-old — with real code examples
> pulled from the exact files so you can look them up.

---

## Principle 1 — Single Source of Truth

### What it means in plain English

Imagine your class is playing a game and keeping score. Three kids each write
the score on their own piece of paper. Halfway through, one says "it's 4–3",
another says "no, it's 5–2", and the third says "I have 4–4." Nobody knows
who is right. This is what happens when you store the same information in
multiple places.

**Single source of truth** means you pick **one place** to store something,
and everyone else reads from that one place. There is no second copy. There is
no risk of the copies disagreeing.

### Where it lives in this codebase

There is exactly one variable that holds the list of expenses. It lives inside
the `useExpenses` hook:

```ts
// src/useExpenses.ts  line 20
const [expenses, setExpenses] = useState<Expense[]>(load);
```

That is the only `useState` for expenses in the entire app. There is no second
array in `App`. There is no copy in `CategoryChart`. There is no cached version
in `FilterTabs`. Every piece of the UI reads from this one array — either
directly or through a calculation that starts from it.

The filter choice is another example. There is one place that stores which tab
is active:

```ts
// src/App.tsx  line 13
const [filter, setFilter] = useState<FilterRange>('this-week');
```

`FilterTabs` does not own this value — it is given the current value as a
**prop** and told to display it. If `FilterTabs` kept its own copy of which
tab was active, the two copies could drift out of sync. By having one source,
they can never disagree.

### The rule in one sentence

> Store a piece of information **once**. Let everything else read from that
> one place.

---

## Principle 2 — Derived State

### What it means in plain English

Imagine you have a jar of coins. You want to know:
- The total value of all the coins
- The total value of just the gold coins
- How many coins there are

You have two options:

**Option A:** Every time you add or remove a coin, you also update three
separate sticky notes that keep track of these numbers.

**Option B:** Whenever you need a number, you just count the coins in the jar
and calculate it on the spot.

Option A seems efficient, but it is a disaster waiting to happen. What if you
forget to update one sticky note? Now your notes lie. Option B is simple and
always correct — the jar is the truth, and the numbers come from counting it.

**Derived state** means choosing Option B. You store the minimum possible
amount of information in state (the coins), and you calculate everything else
from it (the totals) whenever you need it.

### Where it lives in this codebase

Look at these three lines in `App`. They are **not** stored in `useState`.
They are recalculated fresh on every render:

```ts
// src/App.tsx  lines 15–17
const filtered = filterExpensesByRange(expenses, filter);
const weekTotal = thisWeekTotal(expenses);
const filteredTotal = filtered.reduce((sum, e) => sum + e.amount, 0);
```

`filtered` is not stored anywhere. The moment `expenses` changes or `filter`
changes, React re-renders `App`, and these three lines run again and produce
fresh values. They cannot go stale. They cannot disagree with `expenses`.

Here is the same idea inside `CategoryChart`. The per-category totals are not
stored anywhere — they are built from scratch every time the chart renders:

```ts
// src/components/CategoryChart.tsx  lines 10–13
const totals: Partial<Record<Category, number>> = {};
for (const e of expenses) {
  totals[e.category] = (totals[e.category] ?? 0) + e.amount;
}
```

Every time `expenses` changes (someone adds or deletes one), the chart
re-renders and recalculates. No stale number is ever shown.

### The rule in one sentence

> If you can **calculate** a value from state you already have, do not store
> it separately — calculate it each time it is needed.

---

## Principle 3 — Pure Functions

### What it means in plain English

A **pure function** is like a vending machine. You put in the same coins, you
always get out the same snack. The vending machine:
- Does not remember what snack it gave you last Tuesday.
- Does not secretly change the price of a snack halfway through.
- Does not reach into your wallet and take extra coins you did not offer.

A function is "pure" when:
1. It only looks at what you **give** it — no secret reading from outside.
2. It always returns the **same output** for the same input.
3. It does **not change anything** outside itself while running.

An "impure" function is like a vending machine that sometimes gives you a
different snack based on the weather, and also resets the building alarm while
it's at it. Unpredictable. Hard to trust.

### Where it lives in this codebase

Every function in `dateUtils.ts` is pure. Here is the clearest example:

```ts
// src/dateUtils.ts  lines 38–50
export function filterExpensesByRange<T extends { date: string }>(
  expenses: T[],
  range: FilterRange
): T[] {
  const { from, to } = getFilterBounds(range);
  if (!from && !to) return expenses;
  return expenses.filter((e) => {
    const d = new Date(e.date + 'T00:00:00');
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}
```

You give it an array and a range. It gives you back a new array. It reads
nothing from outside. It changes nothing outside. Run it a thousand times with
the same inputs and you get the same answer every time.

Same with `thisWeekTotal`:

```ts
// src/dateUtils.ts  lines 72–75
export function thisWeekTotal<T extends { date: string; amount: number }>(expenses: T[]): number {
  const filtered = filterExpensesByRange(expenses, 'this-week');
  return filtered.reduce((sum, e) => sum + e.amount, 0);
}
```

Give it the same array, get the same number. No surprises. No side effects.

Pure functions are easy to test, easy to read, and easy to move around.
Because they do not depend on anything outside themselves, they work the same
no matter where in the codebase you call them.

### The rule in one sentence

> A function should take inputs, return an output, and **touch nothing else**.

---

## Principle 4 — Immutability

### What it means in plain English

Imagine you have a photo album with ten photos. Your friend wants to see the
album without the photo of the embarrassing haircut. You have two choices:

**Option A:** Rip out the photo from the original album.

**Option B:** Make a photocopy of the whole album, just leave out that photo.
The original is untouched.

**Immutability** means always choosing Option B. You never reach into an
existing piece of data and change it. Instead, you create a new copy with the
change applied. The old data stays exactly as it was.

Why does this matter? In React, if you change data in-place (Option A), React
cannot tell that anything changed — it is looking at the same object and sees
nothing new. It will not re-render. The screen stays stale. By always creating
new arrays and objects (Option B), React notices the new value and updates the
screen.

### Where it lives in this codebase

**Adding an expense** — a new array is created with the new item at the front.
The old array `prev` is never modified:

```ts
// src/useExpenses.ts  line 32
setExpenses((prev) => [next, ...prev]);
```

`[next, ...prev]` is a new array. `prev` is untouched. React sees a new
reference and re-renders.

**Deleting an expense** — `.filter()` always returns a brand new array:

```ts
// src/useExpenses.ts  line 36
setExpenses((prev) => prev.filter((e) => e.id !== id));
```

`.filter()` never changes `prev`. It reads from `prev` and builds a completely
new array without the deleted item. The original `prev` is left alone.

**Filtering for display** — same idea, in `filterExpensesByRange`:

```ts
// src/dateUtils.ts  line 44
return expenses.filter((e) => { ... });
```

This does not touch `expenses`. It produces a new array. The original
`expenses` that lives in `useExpenses` is never harmed.

**Building a new expense object** — the spread operator copies all fields
into a new object:

```ts
// src/useExpenses.ts  lines 27–31
const next: Expense = {
  ...expense,
  id: crypto.randomUUID(),
  createdAt: Date.now(),
};
```

`...expense` copies the fields from the form data into a brand new object. The
form data object is not changed.

You will not find a single line in this codebase that does something like
`expenses[0].amount = 999` or `expenses.push(something)`. Those are both
mutations — the kind of thing this codebase never does.

### The rule in one sentence

> Never change existing data — make a **new copy** with the change applied,
> and let the old version sit untouched.

---

## Principle 5 — Separation of Data and Presentation

### What it means in plain English

Think about a school report card. The **data** is the raw scores sitting in
the teacher's gradebook — just numbers. The **presentation** is how those
scores get printed on a card with colours, fonts, and a student's name at
the top.

The gradebook does not care what font the report card uses. The report card
does not care how the teacher calculated the scores. They are separate concerns.

If you mix them together, you get a mess: the data logic depends on display
decisions, and the display decisions depend on data logic. Changing one breaks
the other. Keeping them apart means you can change how something *looks*
without touching how it *works*, and vice versa.

### Where it lives in this codebase

**Data layer — no UI anywhere:**

`useExpenses.ts` — loads, saves, adds, deletes. Not one word about how anything
looks. No colours, no layouts, no class names.

`dateUtils.ts` — calculates date ranges, filters arrays, formats date strings.
Not one word about how anything looks. These functions would work identically
inside a CLI, a mobile app, or a server. The fact that we are using React is
irrelevant to them.

`types.ts` — defines the shape of data. Has colours and labels for categories,
but only as plain data that other layers read. It does not render anything.

**Presentation layer — no business logic:**

`CategoryChart.tsx` — receives a plain `expenses` array. Does one
transformation to group by category, then hands the result to Recharts to draw.
It knows nothing about localStorage, filter ranges, or the current week. It
just draws what it is given.

```ts
// src/components/CategoryChart.tsx  lines 5–7
interface Props {
  expenses: Expense[];
}
```

One prop. A plain array. No hooks, no state, no date math.

`ExpenseList.tsx` — receives a plain `expenses` array and an `onDelete`
callback. It renders them. It does not know how expenses are stored or where
the array came from. If you swapped localStorage for a database tomorrow,
`ExpenseList` would not change by a single character.

`FilterTabs.tsx` — receives the active tab value and a callback. Renders
buttons. Calls the callback when clicked. That is all it does. It does not
know what happens when a filter changes. The parent decides what to do.

**The handoff — `App.tsx` is the bridge:**

`App` is the only place where data and presentation meet. It calls the data
hooks, does the derivations, and passes plain values down to components as
props. The components get clean arrays and numbers — not hooks, not raw
localStorage, not date calculation functions.

```ts
// src/App.tsx  lines 15–17  (data)
const filtered = filterExpensesByRange(expenses, filter);
const weekTotal = thisWeekTotal(expenses);
const filteredTotal = filtered.reduce((sum, e) => sum + e.amount, 0);

// src/App.tsx  lines 60–61  (presentation uses those values)
<CategoryChart expenses={filtered} />
<DailyChart    expenses={expenses} />
```

`CategoryChart` never calls `filterExpensesByRange`. `filterExpensesByRange`
never renders a `<div>`. Each layer only knows about itself.

### The rule in one sentence

> Keep the code that **calculates things** completely separate from the code
> that **shows things**.

---

## All five principles together

Here is how they reinforce each other in this codebase:

```
Single Source of Truth
  └─ There is one expenses array.

Immutability
  └─ That array is never changed in place — only replaced with a new one.

Derived State
  └─ Everything else (totals, filtered views) is calculated from that array.

Pure Functions
  └─ The calculations are done by functions that only look at their inputs
     and never change anything outside themselves.

Separation of Data and Presentation
  └─ The array and the calculations live in hooks and utils.
     The rendering lives in components that receive plain values as props.
     App is the only place that connects the two.
```

Each principle protects the others. Immutability makes the single source of
truth trustworthy — nobody can quietly change it. Pure functions make derived
state safe — they are predictable. Separation means a bug in how a chart looks
cannot corrupt the data, and a bug in date math cannot break the layout.

Together, they mean: **if something looks wrong on screen, it is because
something wrong was passed in — and you only need to look at one place to find
what was passed in.**
