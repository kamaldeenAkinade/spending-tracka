# Stage 6 — Five Statements, One Lie

Read the five statements. Find the lie. Reply with your answer — then the verdict gets revealed.

---

## The Statements

1. The app has exactly five expense categories: food, transport, data, fun, and other.

2. The default filter when the app first loads is "this-week", not "all-time".

3. Both charts — "By Category" and "Last 7 Days" — update their data when you switch filter tabs.

4. The header expense count (e.g. "50 expenses") reflects total expenses across all time, regardless of which filter tab is active.

5. The "this week" period starts on Monday, not Sunday.

---

## Your answer

**Statement 3** — correct.

First instinct: "there is no option to switch filter tabs" — wrong reasoning, right number.  
Self-correction: "clicking this week / last week / all time only changes the category chart, last 7 days is fixed" — exactly right.

---

## Verdict

**The lie is Statement 3.**

`CategoryChart` receives `filtered` (the tab-respecting slice).  
`DailyChart` receives `expenses` (the full unfiltered list) — see [App.tsx:66-69](../src/App.tsx#L66-L69).

Switching filter tabs never touches the "Last 7 Days" chart. It always shows the last 7 calendar days across all expenses, regardless of which tab is active.

