import type { Expense } from './types';
import { formatAmount } from './format';
import { CATEGORY_LABELS } from './constants';
import { jsPDF } from 'jspdf';

export type ExportFormat = 'json' | 'csv' | 'txt' | 'pdf';

function dateLabel(d: string): string {
  const parts = d.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(expenses: Expense[]) {
  const blob = new Blob([JSON.stringify(expenses, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `spending-tracka-${new Date().toISOString().slice(0, 10)}.json`);
}

export function exportCSV(expenses: Expense[]) {
  const header = 'Date,Category,Amount';
  const rows = expenses.map((e) =>
    `${dateLabel(e.date)},${CATEGORY_LABELS[e.category] ?? e.category},${e.amount.toFixed(2)}`
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, `spending-tracka-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportTXT(expenses: Expense[]) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const lines = [
    `spending-tracka — Expense Report`,
    `Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    `Total expenses: ${expenses.length}`,
    `Total amount: ${formatAmount(total)}`,
    ``,
    `---`,
    ``,
    ...expenses.map((e) =>
      `  ${dateLabel(e.date)}  │ ${(CATEGORY_LABELS[e.category] ?? e.category).padEnd(10)} │ ${formatAmount(e.amount)}`
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  downloadBlob(blob, `spending-tracka-${new Date().toISOString().slice(0, 10)}.txt`);
}

export function exportPDF(expenses: Expense[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFontSize(18);
  doc.text('spending-tracka', pageW / 2, y, { align: 'center' });
  y += 28;

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageW / 2, y, { align: 'center' });
  y += 20;

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  doc.setFontSize(11);
  doc.text(`Total expenses: ${expenses.length}  │  Total: ${formatAmount(total)}`, pageW / 2, y, { align: 'center' });
  y += 30;

  const colX = [40, 130, 220, 340];
  const headerRow = ['Date', 'Category', 'Amount'];

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  headerRow.forEach((h, i) => doc.text(h, colX[i], y));
  y += 16;

  doc.setFont('helvetica', 'normal');
  for (const e of expenses) {
    if (y > 760) {
      doc.addPage();
      y = 40;
      doc.setFont('helvetica', 'bold');
      headerRow.forEach((h, i) => doc.text(h, colX[i], y));
      y += 16;
      doc.setFont('helvetica', 'normal');
    }
    doc.text(dateLabel(e.date), colX[0], y);
    doc.text(CATEGORY_LABELS[e.category] ?? e.category, colX[1], y);
    doc.text(formatAmount(e.amount), colX[2], y);
    y += 16;
  }

  doc.save(`spending-tracka-${new Date().toISOString().slice(0, 10)}.pdf`);
}
