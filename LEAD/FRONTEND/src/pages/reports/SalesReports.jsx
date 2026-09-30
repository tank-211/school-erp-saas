import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts'
import './Reports.css'
import { reportsAPI } from '../../services/api'
import { inr, pctText, downloadCsv, ReportState, EmptyChart } from './reportUtils'

// Fee collection for an academic year, from the school's invoices and payments.
export default function SalesReports() {
  const [yearId, setYearId] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    reportsAPI.sales({ academic_year_id: yearId })
      .then((res) => setReport(res.data))
      .catch((err) => setError(err.message || 'Could not load the sales report'))
      .finally(() => setLoading(false))
  }, [yearId])

  const stats = report?.stats || {}
  const statCards = [
    { label: 'Fees Collected', value: inr(stats.collected), sub: report?.academic_year?.name || '', delta: stats.growth_vs_previous_year === null || stats.growth_vs_previous_year === undefined ? '' : `${stats.growth_vs_previous_year > 0 ? '+' : ''}${stats.growth_vs_previous_year}% vs ${stats.previous_year}`, Icon: RevenueIcon, color: '#10b981', bg: '#f0fdf4' },
    { label: 'Students Enrolled', value: String(stats.enrolled_students ?? 0), sub: 'Admissions this year', delta: '', Icon: EnrollIcon, color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Fees Billed', value: inr(stats.billed), sub: 'Invoices raised', delta: '', Icon: AvgIcon, color: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'Collection Rate', value: pctText(stats.collection_rate), sub: 'Collected of billed', delta: '', Icon: TargetIcon, color: '#f59e0b', bg: '#fffbeb' },
  ]

  const exportReport = () => {
    if (!report) return
    const rows = [
      ...report.monthly.map((m) => ({ section: 'Monthly', item: m.month, billed: m.billed, collected: m.collected })),
      ...report.by_class.map((c) => ({ section: 'By class', item: c.name, collected: c.collected })),
      ...report.by_source.map((x) => ({ section: 'By lead source', item: x.source, collected: x.collected, students: x.students })),
      ...Object.entries(report.payment_status).map(([k, v]) => ({ section: 'Invoice status', item: k, invoices: v.count, amount: v.amount })),
    ]
    downloadCsv(`sales-report-${report.academic_year?.name || 'year'}.csv`, [
      { key: 'section', label: 'Section' }, { key: 'item', label: 'Item' }, { key: 'billed', label: 'Billed (₹)' },
      { key: 'collected', label: 'Collected (₹)' }, { key: 'students', label: 'Students' }, { key: 'invoices', label: 'Invoices' }, { key: 'amount', label: 'Amount (₹)' },
    ], rows)
  }

  const status = report?.payment_status || {}
  const invoiceCount = Object.values(status).reduce((t, v) => t + (v?.count || 0), 0)

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1 className="page-title">Sales Reports</h1>
          <p className="page-sub">Fee collection and enrolment for the academic year</p>
        </div>
        <div className="reports-header-right">
          <select className="report-period-select" value={yearId || report?.academic_year?.id || ''} onChange={(e) => setYearId(e.target.value)}>
            {(report?.academic_years || []).map((y) => (
              <option key={y.id} value={y.id}>{y.name}{y.is_active ? ' (current)' : ''}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={exportReport} disabled={!report || report.empty}><DownloadIcon /> Export Report</button>
        </div>
      </div>

      <ReportState loading={loading && !report} error={error} empty={report?.empty} emptyText="No academic year is set up yet. An admin can add one in School Setup." />

      {report && !report.empty && (
        <>
          <div className="report-stats">
            {statCards.map((c, i) => (
              <div key={i} className="report-stat-card">
                <div className="rsc-icon" style={{ background: c.bg, color: c.color }}><c.Icon /></div>
                <div className="rsc-delta" style={{ color: c.color }}>{c.delta}</div>
                <div className="rsc-label">{c.label}</div>
                <div className="rsc-value">{c.value}</div>
                <div className="rsc-sub">{c.sub}</div>
              </div>
            ))}
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Monthly Billed vs Collected</h3>
              <p className="chart-sub">Invoices raised and payments received each month</p>
            </div>
            {report.monthly.some((m) => m.billed || m.collected) ? (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={report.monthly} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={inr} />
                  <Tooltip formatter={(v, n) => [inr(v), n]} contentStyle={{ borderRadius: 8, border: '1px solid #e8edf2', fontSize: 12 }} />
                  <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="billed" fill="#c7d2fe" radius={[5, 5, 0, 0]} maxBarSize={40} name="Billed" />
                  <Bar dataKey="collected" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={40} name="Collected" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <EmptyChart text="No invoices or payments in this academic year yet." />}
          </div>

          <div className="charts-row-2">
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Collected by Class</h3>
                <p className="chart-sub">Payments by the student's class this year</p>
              </div>
              {report.by_class.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={report.by_class} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={inr} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e8edf2', fontSize: 12 }} />
                    <Bar dataKey="collected" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={18} name="Collected" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart text="No payments yet." />}
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Collected by Lead Source</h3>
                <p className="chart-sub">Where paying families first came from</p>
              </div>
              {report.by_source.length ? (
                <div className="source-list">
                  {report.by_source.map((s) => (
                    <div key={s.source} className="source-row">
                      <div className="source-info">
                        <span className="source-name">{s.source}</span>
                        <div className="source-meta">
                          <span className="source-rev">{inr(s.collected)}</span>
                          <span className="source-students">{s.students} student{s.students === 1 ? '' : 's'}</span>
                        </div>
                      </div>
                      <div className="source-bar-wrap">
                        <div className="source-bar"><div className="source-bar-fill" style={{ width: `${s.share || 0}%` }} /></div>
                        <span className="source-pct">{pctText(s.share)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyChart text="No payments yet." />}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Quarterly Performance</h3>
              <p className="chart-sub">New admissions and fees collected per quarter</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={report.quarterly} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="a" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="c" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={inr} />
                <Tooltip formatter={(v, n) => [n === 'Fees collected' ? inr(v) : v, n]} contentStyle={{ borderRadius: 8, border: '1px solid #e8edf2', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="a" dataKey="admissions" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} name="New admissions" />
                <Bar yAxisId="c" dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} name="Fees collected" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Invoice Status</h3>
              <p className="chart-sub">{invoiceCount} invoice{invoiceCount === 1 ? '' : 's'} raised this academic year</p>
            </div>
            <div className="payment-status-grid">
              {[
                { key: 'paid', label: 'Paid in Full', accent: '#10b981', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', note: 'collected' },
                { key: 'partial', label: 'Partly Paid', accent: '#3b82f6', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', note: 'still due' },
                { key: 'unpaid', label: 'Not Paid Yet', accent: '#f59e0b', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', note: 'due' },
                { key: 'overdue', label: 'Overdue', accent: '#ef4444', bg: 'linear-gradient(135deg,#fff5f5,#fee2e2)', note: 'overdue' },
              ].map((p) => (
                <div key={p.key} className="payment-card" style={{ background: p.bg, borderLeft: `4px solid ${p.accent}` }}>
                  <div className="pc-label">{p.label}</div>
                  <div className="pc-count" style={{ color: p.accent }}>{status[p.key]?.count ?? 0}</div>
                  <div className="pc-amount">{inr(status[p.key]?.amount)}</div>
                  <div className="pc-pct">{p.note}{invoiceCount ? ` · ${Math.round(((status[p.key]?.count || 0) / invoiceCount) * 100)}% of invoices` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function RevenueIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
function EnrollIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function AvgIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> }
function TargetIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> }
function DownloadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
