// Run with: node scripts/seed-expenses.js
// Then paste the printed output into the browser console

import { randomUUID } from 'crypto';

const categories = ['food', 'transport', 'data', 'fun', 'other'];

// Spread 50 expenses: 14 this week, 14 last week, 22 older
// Today = 2026-05-21 (Thursday). This week Mon = 2026-05-18.
const datePools = [
  // this week: May 18-21
  ...['2026-05-18','2026-05-18','2026-05-19','2026-05-19','2026-05-19',
      '2026-05-20','2026-05-20','2026-05-21','2026-05-21','2026-05-21',
      '2026-05-21','2026-05-18','2026-05-20','2026-05-21'],
  // last week: May 11-17
  ...['2026-05-11','2026-05-12','2026-05-12','2026-05-13','2026-05-13',
      '2026-05-14','2026-05-14','2026-05-15','2026-05-15','2026-05-16',
      '2026-05-16','2026-05-17','2026-05-17','2026-05-11'],
  // older: Apr 14 - May 10
  ...['2026-05-10','2026-05-09','2026-05-08','2026-05-07','2026-05-06',
      '2026-05-05','2026-05-04','2026-05-03','2026-05-02','2026-05-01',
      '2026-04-30','2026-04-28','2026-04-25','2026-04-22','2026-04-19',
      '2026-04-16','2026-04-14','2026-05-09','2026-04-27','2026-04-23',
      '2026-04-20','2026-04-17'],
];

const catWeights = [
  ...Array(20).fill('food'),
  ...Array(10).fill('transport'),
  ...Array(5).fill('data'),
  ...Array(8).fill('fun'),
  ...Array(7).fill('other'),
];

const amounts = [
  500, 1200, 800, 3500, 2000, 1500, 700, 4500, 900, 1100,
  2500, 600, 1800, 3000, 750, 1300, 5000, 400, 2200, 1600,
  850, 2800, 1400, 700, 3200, 950, 1750, 4000, 1050, 2100,
  600, 1900, 3500, 800, 1250, 2700, 450, 1600, 5500, 900,
  2000, 1300, 700, 3800, 1100, 2400, 600, 1700, 3100, 850,
];

const expenses = datePools.map((date, i) => ({
  id: randomUUID(),
  amount: amounts[i],
  category: catWeights[i % catWeights.length],
  date,
  createdAt: Date.now() - i * 60000,
}));

const json = JSON.stringify(expenses);
console.log('// Paste this into your browser console:');
console.log(`localStorage.setItem('receipts_expenses', '${json.replace(/'/g, "\\'")}');`);
console.log('// Then refresh the page.');
console.log('');
console.log(`// Summary: ${expenses.length} expenses`);
console.log(`// This week (May 18-21): ${expenses.filter(e => e.date >= '2026-05-18').length}`);
console.log(`// Last week (May 11-17): ${expenses.filter(e => e.date >= '2026-05-11' && e.date < '2026-05-18').length}`);
console.log(`// Older: ${expenses.filter(e => e.date < '2026-05-11').length}`);
const thisWeekTotal = expenses.filter(e => e.date >= '2026-05-18').reduce((s,e) => s + e.amount, 0);
const allTotal = expenses.reduce((s,e) => s + e.amount, 0);
console.log(`// This-week total: ₦${thisWeekTotal.toLocaleString()}`);
console.log(`// All-time total: ₦${allTotal.toLocaleString()}`);
