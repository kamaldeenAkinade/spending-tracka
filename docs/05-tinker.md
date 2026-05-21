# Stage 5 — Tinker Test

**Task:** Add fifty fake expenses by hand or by script. Predict what the dashboard will look like before you load the page. Compare. Document.

---

## Prediction (before loading)

> "Fifty expenses will show a long list on the dashboard"

---

## How the data was added

Script: `scripts/seed-expenses.js`  
Run: `node scripts/seed-expenses.js` → paste output into browser console → refresh.

Distribution across time:
| Period | Dates | Count |
|--------|-------|-------|
| This week | May 18–21 (Mon–Thu) | 14 |
| Last week | May 11–17 | 14 |
| Older | Apr 14 – May 10 | 22 |
| **Total** | | **50** |

Category breakdown across all 50: food (20), transport (10), data (5), fun (8), other (7).

---

## What actually showed (default "this-week" filter)

| Element | Expected (from prediction) | Actual |
|---------|---------------------------|--------|
| Expense list length | 50 (long list) | **14** — only this week |
| Header count | — (not predicted) | "50 expenses" |
| This week's spend | — | ₦24,600 |
| Transactions stat | — | 14 |
| All-time total | — | ₦91,400 |
| Category chart | — | 100% food (all 14 this-week entries are food) |
| Last 7 Days chart | — | Bars appeared for May 15–21 |

---

## Verdict: Was the prediction right?

**Partially.** The prediction was directionally correct — switching to "all-time" does show all 50 in a long list. But the default view tells a different story:

1. **The filter matters.** The app opens on "this-week". Only 14 out of 50 expenses appear in the list and stats by default. The prediction ignored the filter entirely.

2. **Header vs. list count diverge.** The header says "50 expenses" (total) while the list below shows 14. Seeing both at once is mildly surprising.

3. **Charts came alive — but unevenly.** The "By Category" chart showed 100% food for this week (the seed happened to put all food entries first). Switching to "all-time" made all 5 colors appear. The "Last 7 Days" bar chart showed real spikes regardless of filter.

4. **The long list only appears under "all-time".** Scroll fatigue is a real concern at scale — the list has no pagination.

---

## Lesson

Predicting "what the UI looks like" without accounting for **default filter state** leads to wrong mental models. The first thing a user sees is shaped by which filter is active on load, not total data volume.
