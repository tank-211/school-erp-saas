import React from 'react'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts'
import './Reports.css'

const revenueData = [
  { month: 'Aug 2025', actual: 2950000, target: 3000000 },
  { month: 'Sep 2025', actual: 3200000, target: 3100000 },
  { month: 'Oct 2025', actual: 2800000, target: 3050000 },
  { month: 'Nov 2025', actual: 3400000, target: 3200000 },
  { month: 'Dec 2025', actual: 3000000, target: 3250000 },
  { month: 'Jan 2026', actual: 4300000, target: 3800000 },
  { month: 'Feb 2026', actual: 3300000, target: 3500000 },
]

const gradeData = [
  { grade: 'Grade 1', revenue: 280000 },
  { grade: 'Grade 2', revenue: 320000 },
  { grade: 'Grade 3', revenue: 290000 },
  { grade: 'Grade 4', revenue: 350000 },
  { grade: 'Grade 5', revenue: 420000 },
  { grade: 'Grade 6', revenue: 310000 },
  { grade: 'Grade 7', revenue: 260000 },
  { grade: 'Grade 8', revenue: 390000 },
  { grade: 'Grade 9', revenue: 180000 },
]

const sourceData = [
  { source: 'Website', revenue: '₹86.4L', students: 288, pct: 32 },
  { source: 'Referral', revenue: '₹64.8L', students: 216, pct: 24 },
  { source: 'Walk-in', revenue: '₹43.2L', students: 144, pct: 16 },
  { source: 'Events', revenue: '₹37.8L', students: 126, pct: 14 },
  { source: 'Phone Inquiry', revenue: '₹21.6L', students: 72, pct: 8 },
  { source: 'Email Campaign', revenue: '₹16.2L', students: 54, pct: 6 },
]

const quarterlyData = [
  { q: 'Q1 2025', new: 148, renewals: 340 },
  { q: 'Q2 2025', new: 130, renewals: 345 },
  { q: 'Q3 2025', new: 160, renewals: 360 },
  { q: 'Q4 2025', new: 150, renewals: 365 },
]

const statCards = [
  { label: 'Total Revenue', value: '₹2.33Cr', sub: 'Academic Year 2025-26', delta: '+12.5%', color: '#10b981', bg: '#d1fae5', Icon: RevenueIcon },
  { label: 'Total Enrollments', value: '778', sub: 'New students enrolled', delta: '+8.3%', color: '#3b82f6', bg: '#eff6ff', Icon: EnrollIcon },
  { label: 'Avg Monthly Revenue', value: '₹33.3L', sub: 'Per month average', delta: '₹3334K', color: '#8b5cf6', bg: '#f5f3ff', Icon: AvgIcon },
  { label: 'Target Achievement', value: '101%', sub: 'Of annual target', delta: '101.5%', color: '#f59e0b', bg: '#fef3c7', Icon: TargetIcon },
]

export default function SalesReports() {
  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1 className="page-title">Sales Reports</h1>
          <p className="page-sub">Revenue analysis and enrollment metrics</p>
        </div>
        <div className="reports-header-right">
          <select className="report-period-select"><option>This Academic Year</option><option>Last Year</option></select>
          <button className="btn-primary"><DownloadIcon /> Export Report</button>
        </div>
      </div>

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

      {/* Monthly Revenue vs Target */}
      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Monthly Revenue vs Target</h3>
          <p className="chart-sub">Revenue performance against monthly targets</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={revenueData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/100000).toFixed(0)}L`} />
            <Tooltip formatter={(v, n) => [`₹${(v/100000).toFixed(1)}L`, n]} contentStyle={{ borderRadius: 8, border: '1px solid #e8edf2', fontSize: 12 }} />
            <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="actual" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={60} name="Actual Revenue" />
            <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: '#f59e0b' }} name="Target" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by Grade + Lead Source */}
      <div className="charts-row-2">
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Revenue by Grade</h3>
            <p className="chart-sub">Enrollment and revenue breakdown</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={gradeData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}K`} />
              <YAxis type="category" dataKey="grade" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => `₹${(v/100000).toFixed(1)}L`} contentStyle={{ borderRadius: 8, border: '1px solid #e8edf2', fontSize: 12 }} />
              <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={18} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Revenue by Lead Source</h3>
            <p className="chart-sub">Top performing acquisition channels</p>
          </div>
          <div className="source-list">
            {sourceData.map((s, i) => (
              <div key={i} className="source-row">
                <div className="source-info">
                  <span className="source-name">{s.source}</span>
                  <div className="source-meta">
                    <span className="source-rev">{s.revenue}</span>
                    <span className="source-students">{s.students} students</span>
                  </div>
                </div>
                <div className="source-bar-wrap">
                  <div className="source-bar"><div className="source-bar-fill" style={{ width: `${s.pct}%` }} /></div>
                  <span className="source-pct">{s.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quarterly Performance */}
      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Quarterly Performance</h3>
          <p className="chart-sub">New admissions vs renewals</p>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={quarterlyData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="renewGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="q" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8edf2', fontSize: 12 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="renewals" stroke="#8b5cf6" fill="url(#renewGrad)" strokeWidth={2} name="Renewals" />
            <Area type="monotone" dataKey="new" stroke="#10b981" fill="url(#newGrad)" strokeWidth={2} name="New Admissions" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Payment Status Overview */}
      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Payment Status Overview</h3>
          <p className="chart-sub">Fee collection and payment tracking</p>
        </div>
        <div className="payment-status-grid">
          {[
            { label: 'Paid in Full',     count: 645, amount: '₹193.5L', pct: '72% of total', accent: '#10b981', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)' },
            { label: 'Installment Plan', count: 198, amount: '₹59.4L',  pct: '22% of total', accent: '#3b82f6', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)' },
            { label: 'Pending Payment',  count: 45,  amount: '₹13.5L',  pct: '5% of total',  accent: '#f59e0b', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)' },
            { label: 'Overdue',          count: 12,  amount: '₹3.6L',   pct: '1% of total',  accent: '#ef4444', bg: 'linear-gradient(135deg,#fff5f5,#fee2e2)' },
          ].map((p, i) => (
            <div key={i} className="payment-card" style={{ background: p.bg, borderLeft: `4px solid ${p.accent}` }}>
              <div className="pc-label">{p.label}</div>
              <div className="pc-count" style={{ color: p.accent }}>{p.count}</div>
              <div className="pc-amount">{p.amount}</div>
              <div className="pc-pct">{p.pct}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RevenueIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
function EnrollIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function AvgIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> }
function TargetIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> }
function DownloadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
