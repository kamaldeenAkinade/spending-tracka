import { useState, useMemo, useRef, useEffect } from 'react';
import { useExpenses } from './useExpenses';
import { filterExpensesByRange } from './dateUtils';
import AddExpense from './components/AddExpense';
import CategoryChart from './components/CategoryChart';
import DailyChart from './components/DailyChart';
import ExpenseList from './components/ExpenseList';
import FilterTabs from './components/FilterTabs';
import type { Expense, FilterRange } from './types';
import { formatAmount } from './format';
import { useTheme } from './useTheme';
import { exportJSON, exportCSV, exportTXT, exportPDF } from './export';
import type { ExportFormat } from './export';

export default function App() {
  const { expenses, addExpense, deleteExpense, restoreExpense, saveError } = useExpenses();
  const [filter, setFilter] = useState<FilterRange>('this-week');
  const [undoItem, setUndoItem] = useState<Expense | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [light, toggleTheme] = useTheme();
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(
    () => filterExpensesByRange(expenses, filter),
    [expenses, filter]
  );

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, e) => sum + e.amount, 0),
    [filtered]
  );

  const weekTotal = useMemo(
    () => filter === 'this-week'
      ? filteredTotal
      : filterExpensesByRange(expenses, 'this-week').reduce((sum, e) => sum + e.amount, 0),
    [expenses, filter, filteredTotal]
  );

  function handleDelete(id: string) {
    const deleted = deleteExpense(id);
    if (!deleted) return;
    setUndoItem(deleted);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoItem(null), 5000);
  }

  function handleUndo() {
    if (!undoItem) return;
    restoreExpense(undoItem);
    setUndoItem(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  useEffect(() => {
    if (!exportOpen) return;
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [exportOpen]);

  function handleExport(fmt: ExportFormat) {
    setExportOpen(false);
    const exporters = { json: exportJSON, csv: exportCSV, txt: exportTXT, pdf: exportPDF };
    exporters[fmt](expenses);
  }

  return (
    <div className="app">
      {saveError && (
        <div className="save-error-banner">
          Storage unavailable — expenses entered this session will not be saved.
        </div>
      )}

      <header className="app-header">
        <div className="app-header-inner">
          <div className="logo">
            <div className="logo-mark">S</div>
            <span className="logo-name">spending-tracka</span>
          </div>
          <div className="header-actions">
            <button className="btn-theme" onClick={toggleTheme} title="Toggle theme">
              {light ? '🌙' : '☀️'}
            </button>
            <span className="header-count">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
            </span>
            {expenses.length > 0 && (
              <div className="export-wrap" ref={exportRef}>
                <button className="btn-export" onClick={() => setExportOpen((p) => !p)}>
                  Export ▾
                </button>
                {exportOpen && (
                  <div className="export-dropdown">
                    <button onClick={() => handleExport('json')}>JSON</button>
                    <button onClick={() => handleExport('csv')}>CSV</button>
                    <button onClick={() => handleExport('txt')}>TXT</button>
                    <button onClick={() => handleExport('pdf')}>PDF</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="app-grid">
          <div className="col-left">
            <div className="card">
              <p className="week-label">This week's spend</p>
              <p className="week-amount">{formatAmount(weekTotal)}</p>
            </div>
            <AddExpense onAdd={addExpense} />
          </div>

          <div className="col-right">
            {expenses.length === 0 ? (
              <div className="card zero-state">
                <div className="zero-state-icon">📋</div>
                <h2 className="zero-state-title">Track your spending</h2>
                <p className="zero-state-text">
                  Add your first expense using the form on the left. Your
                  expenses are saved in this browser — no account needed.
                </p>
              </div>
            ) : (
              <>
                <FilterTabs value={filter} onChange={setFilter} />

                <div className="stats-row">
                  <div className="card">
                    <p className="stat-label">Total Spent</p>
                    <p className="stat-value">{formatAmount(filteredTotal)}</p>
                  </div>
                  <div className="card">
                    <p className="stat-label">Transactions</p>
                    <p className="stat-value">{filtered.length}</p>
                  </div>
                </div>

                <div className="charts-row">
                  <div className="card">
                    <p className="chart-title">By Category</p>
                    <CategoryChart expenses={filtered} />
                  </div>
                  <div className="card">
                    <p className="chart-title">Last 7 Days (all expenses)</p>
                    <DailyChart expenses={expenses} />
                  </div>
                </div>

                <div className="card">
                  <p className="list-heading">
                    Expenses
                    {filtered.length > 0 && (
                      <span className="list-count">{filtered.length} records</span>
                    )}
                  </p>
                  <ExpenseList expenses={filtered} onDelete={handleDelete} />
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {undoItem && (
        <div className="undo-toast">
          <span>Expense deleted</span>
          <button className="undo-btn" onClick={handleUndo}>Undo</button>
        </div>
      )}
    </div>
  );
}
