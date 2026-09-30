// Shared helpers for the report pages.

export const inr = (value) => {
  const n = Number(value || 0);
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

export const pctText = (value) => (value === null || value === undefined ? '—' : `${value}%`);

// Download rows as a CSV file (Excel opens it). columns: [{ key, label }]
export const downloadCsv = (filename, columns, rows) => {
  const cell = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => cell(c.label)).join(','), ...rows.map((r) => columns.map((c) => cell(r[c.key])).join(','))];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export function ReportState({ loading, error, empty, emptyText }) {
  if (loading) return <div className="chart-card" style={{ textAlign: 'center', color: '#64748b' }}>Loading report...</div>;
  if (error) return <div className="chart-card" style={{ color: '#b91c1c', background: '#fef2f2' }}>{error}</div>;
  if (empty) return <div className="chart-card" style={{ textAlign: 'center', color: '#64748b' }}>{emptyText}</div>;
  return null;
}

export function EmptyChart({ text = 'No data for this period yet.' }) {
  return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>{text}</div>;
}
