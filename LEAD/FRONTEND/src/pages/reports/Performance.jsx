import React, { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './Reports.css'
import { reportsAPI } from '../../services/api'
import { pctText, downloadCsv, ReportState, EmptyChart } from './reportUtils'

const DAY = 24 * 60 * 60 * 1000
const iso = (d) => new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10) // India date

// Periods the selector offers, as date ranges
const PERIODS = {
  this_month: 'This month',
  last_month: 'Last month',
  last_90: 'Last 90 days',
  last_180: 'Last 6 months',
  last_365: 'Last 12 months',
}
const rangeFor = (key) => {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  const y = ist.getUTCFullYear()
  const m = ist.getUTCMonth()
  if (key === 'this_month') return { from: iso(new Date(Date.UTC(y, m, 1) - 5.5 * 3600000)), to: iso(now) }
  if (key === 'last_month') return { from: iso(new Date(Date.UTC(y, m - 1, 1) - 5.5 * 3600000)), to: iso(new Date(Date.UTC(y, m, 0) - 5.5 * 3600000)) }
  const days = { last_90: 90, last_180: 180, last_365: 365 }[key]
  return { from: iso(new Date(now.getTime() - days * DAY)), to: iso(now) }
}
const hours = (h) => (h === null || h === undefined ? '—' : h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${h} hrs` : `${Math.round(h / 24)} days`)

// Counselor performance from the school's leads, contacts, applications and tasks.
export default function Performance() {
  const [period, setPeriod] = useState('last_180')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    reportsAPI.performance(rangeFor(period))
      .then((res) => setReport(res.data))
      .catch((err) => setError(err.message || 'Could not load the performance report'))
      .finally(() => setLoading(false))
  }, [period])

  const staff = useMemo(
    () => [...(report?.staff || [])].sort((a, b) => (b.applications - a.applications) || (b.leads - a.leads)),
    [report],
  )
  const k = report?.kpis || {}
  const statCards = [
    { label: 'Lead Conversion', value: pctText(k.conversion_rate), sub: `${k.leads ?? 0} leads in period`, Icon: TrendIcon, color: '#10b981', bg: '#f0fdf4' },
    { label: 'Avg First Response', value: hours(k.avg_response_hours), sub: 'Lead created to first contact', Icon: ClockIcon, color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Contacted Within 24h', value: pctText(k.contacted_within_24h), sub: 'Of new leads', Icon: StarIcon, color: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'Follow-ups Done', value: pctText(k.follow_up_completion), sub: 'Tasks due in period', Icon: TargetIcon, color: '#f59e0b', bg: '#fffbeb' },
  ]

  const exportReport = () => {
    if (!report) return
    downloadCsv(`performance-${report.range.from}-to-${report.range.to}.csv`, [
      { key: 'name', label: 'Staff member' }, { key: 'role', label: 'Role' }, { key: 'leads', label: 'Leads assigned' },
      { key: 'contacted', label: 'Contacted' }, { key: 'applications', label: 'Applications' }, { key: 'admissions', label: 'Admissions' },
      { key: 'conversion_rate', label: 'Conversion %' }, { key: 'avg_response_hours', label: 'Avg first response (hrs)' },
      { key: 'activities', label: 'Contacts made' }, { key: 'tasks_done', label: 'Tasks done' }, { key: 'tasks_total', label: 'Tasks due' },
    ], staff)
  }

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1 className="page-title">Performance Reports</h1>
          <p className="page-sub">Counselor and team performance{report ? `, ${report.range.from} to ${report.range.to}` : ''}</p>
        </div>
        <div className="reports-header-right">
          <select className="report-period-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {Object.entries(PERIODS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <button className="btn-primary" onClick={exportReport} disabled={!report}><DownloadIcon /> Export Report</button>
        </div>
      </div>

      <ReportState loading={loading && !report} error={error} />

      {report && (
        <>
          <div className="report-stats">
            {statCards.map((c, i) => (
              <div key={i} className="report-stat-card">
                <div className="rsc-icon" style={{ background: c.bg, color: c.color }}><c.Icon /></div>
                <div className="rsc-label">{c.label}</div>
                <div className="rsc-value">{c.value}</div>
                <div className="rsc-sub">{c.sub}</div>
              </div>
            ))}
          </div>

          <div className="staff-table-card chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Staff Performance Comparison</h3>
              <p className="chart-sub">Leads created in the period, by assigned counselor</p>
            </div>
            {staff.length ? (
              <table className="staff-table">
                <thead><tr>
                  <th>RANK</th><th>STAFF MEMBER</th><th>LEADS ASSIGNED</th>
                  <th>CONTACTED</th><th>APPLICATIONS</th><th>CONVERSION RATE</th>
                  <th>AVG RESPONSE</th><th>FOLLOW-UPS</th>
                </tr></thead>
                <tbody>
                  {staff.map((s, i) => (
                    <tr key={s.id}>
                      <td><div className="rank-badge" style={{ background: '#10b98120', color: '#10b981' }}>{i + 1}</div></td>
                      <td><span className="staff-name">{s.name}</span>{s.role === 'admin' ? <span style={{ color: '#94a3b8', fontSize: 11 }}> (Admin)</span> : null}</td>
                      <td>{s.leads}</td>
                      <td>{s.contacted}</td>
                      <td>{s.applications}{s.admissions ? <span style={{ color: '#94a3b8', fontSize: 11 }}> ({s.admissions} admitted)</span> : null}</td>
                      <td>
                        <div className="conv-bar-wrap">
                          <div className="conv-bar"><div className="conv-bar-fill" style={{ width: `${s.conversion_rate || 0}%`, background: '#10b981' }} /></div>
                          <span className="conv-pct">{pctText(s.conversion_rate)}</span>
                        </div>
                      </td>
                      <td>{hours(s.avg_response_hours)}</td>
                      <td>{s.tasks_total ? `${s.tasks_done}/${s.tasks_total}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyChart text="No counselors in this school yet." />}
          </div>

          <div className="charts-row-2">
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">First Response Time</h3>
                <p className="chart-sub">How soon new leads were first contacted</p>
              </div>
              {k.leads ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={report.response_time} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8edf2', fontSize: 12 }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48} name="Leads" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart text="No new leads in this period." />}
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Monthly Conversion Trend</h3>
                <p className="chart-sub">Leads created each month and how many applied</p>
              </div>
              {report.trend.some((t) => t.leads) ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={report.trend} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8edf2', fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="leads" stroke="#94a3b8" strokeWidth={2} name="Leads" />
                    <Line type="monotone" dataKey="applications" stroke="#10b981" strokeWidth={2.5} name="Applications" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyChart text="No leads in this period." />}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Contact Activity</h3>
              <p className="chart-sub">Calls, messages and meetings logged in the period</p>
            </div>
            {report.activity.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={report.activity} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8edf2', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={56} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart text="No calls, messages or meetings logged in this period." />}
          </div>
        </>
      )}
    </div>
  )
}

function TargetIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> }
function ClockIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function StarIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function TrendIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> }
function DownloadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
