import React from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import './Reports.css'

const statCards = [
  { label: 'Team Conversion Rate', value: '68.3%', sub: 'Above target (65%)', delta: '+5.2%', color: '#10b981', bg: '#d1fae5', Icon: TargetIcon },
  { label: 'Avg Response Time', value: '2.8 hrs', sub: 'Below target (4 hrs)', delta: '-0.5h', color: '#3b82f6', bg: '#eff6ff', Icon: ClockIcon },
  { label: 'Satisfaction Score', value: '4.6/5.0', sub: 'Parent feedback rating', delta: '+0.3', color: '#8b5cf6', bg: '#f5f3ff', Icon: StarIcon },
  { label: 'Activity Completion', value: '96%', sub: 'Tasks completed on time', delta: '+12%', color: '#f59e0b', bg: '#fef3c7', Icon: TrendIcon },
]

const staffData = [
  { rank: 1, name: 'Mrs. Sunita Kumar', leads: 187, contacted: 182, contactedPct: '97%', converted: 145, convPct: 78, convColor: '#10b981', avgResp: '2.1 hrs', sat: 4.9, rankColor: '#f59e0b' },
  { rank: 2, name: 'Mrs. Priya Sharma', leads: 245, contacted: 238, contactedPct: '97%', converted: 178, convPct: 73, convColor: '#3b82f6', avgResp: '2.5 hrs', sat: 4.8, rankColor: '#94a3b8' },
  { rank: 3, name: 'Mr. Amit Patel', leads: 198, contacted: 185, contactedPct: '93%', converted: 132, convPct: 67, convColor: '#3b82f6', avgResp: '3.2 hrs', sat: 4.5, rankColor: '#f59e0b' },
  { rank: 4, name: 'Mrs. Neha Joshi', leads: 172, contacted: 160, contactedPct: '93%', converted: 110, convPct: 69, convColor: '#3b82f6', avgResp: '3.8 hrs', sat: 4.4, rankColor: '#94a3b8' },
  { rank: 5, name: 'Mr. Rajesh Verma', leads: 156, contacted: 142, contactedPct: '91%', converted: 98, convPct: 63, convColor: '#f59e0b', avgResp: '4.1 hrs', sat: 4.3, rankColor: '#94a3b8' },
]

const radarData = [
  { metric: 'Lead Response Time', actual: 85, target: 80 },
  { metric: 'Conversion Rate', actual: 68, target: 65 },
  { metric: 'Customer Satisfaction', actual: 92, target: 85 },
  { metric: 'Follow-up Rate', actual: 78, target: 80 },
  { metric: 'Documentation Accuracy', actual: 88, target: 90 },
  { metric: 'Tour Conversion', actual: 72, target: 75 },
]

const convTrendData = [
  { month: 'Aug', leads: 148, converted: 98, rate: 66 },
  { month: 'Sep', leads: 162, converted: 108, rate: 67 },
  { month: 'Oct', leads: 132, converted: 88, rate: 67 },
  { month: 'Nov', leads: 178, converted: 122, rate: 69 },
  { month: 'Dec', leads: 155, converted: 100, rate: 65 },
  { month: 'Jan', leads: 195, converted: 140, rate: 72 },
  { month: 'Feb', leads: 168, converted: 118, rate: 70 },
]

const activityData = [
  { label: 'Calls Made', value: 1245, target: 1200, pct: 104, color: '#10b981' },
  { label: 'Emails Sent', value: 856, target: 900, pct: 95, color: '#f59e0b' },
  { label: 'Tours Conducted', value: 342, target: 350, pct: 98, color: '#f59e0b' },
  { label: 'Interviews Done', value: 289, target: 280, pct: 103, color: '#10b981' },
  { label: 'Follow-ups', value: 567, target: 600, pct: 95, color: '#f59e0b' },
]

const responseTimeData = [
  { range: '< 1 hour', count: 450 },
  { range: '1-4 hours', count: 320 },
  { range: '4-24 hours', count: 295 },
  { range: '> 24 hours', count: 130 },
]

export default function Performance() {
  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1 className="page-title">Performance Reports</h1>
          <p className="page-sub">Team and individual performance analytics</p>
        </div>
        <div className="reports-header-right">
          <select className="report-period-select"><option>This Month</option><option>Last Month</option><option>This Quarter</option></select>
          <button className="btn-primary"><DownloadIcon /> Export Report</button>
        </div>
      </div>

      {/* KPI Cards */}
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

      {/* Staff Performance Table */}
      <div className="staff-table-card chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Staff Performance Comparison</h3>
          <p className="chart-sub">Individual performance metrics and rankings</p>
        </div>
        <table className="staff-table">
          <thead><tr>
            <th>RANK</th><th>STAFF MEMBER</th><th>LEADS ASSIGNED</th>
            <th>CONTACTED</th><th>CONVERTED</th><th>CONVERSION RATE</th>
            <th>AVG RESPONSE</th><th>SATISFACTION</th>
          </tr></thead>
          <tbody>
            {staffData.map(s => (
              <tr key={s.rank}>
                <td><div className="rank-badge" style={{ background: s.rankColor + '20', color: s.rankColor }}>{s.rank}</div></td>
                <td><span className="staff-name">{s.name}</span></td>
                <td>{s.leads}</td>
                <td><div>{s.contacted}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.contactedPct}</div></td>
                <td>{s.converted}</td>
                <td>
                  <div className="conv-bar-wrap">
                    <div className="conv-bar"><div className="conv-bar-fill" style={{ width: `${s.convPct}%`, background: s.convColor }} /></div>
                    <span className="conv-pct">{s.convPct}%</span>
                  </div>
                </td>
                <td>{s.avgResp}</td>
                <td><span className="sat-score">{s.sat}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Radar + Conversion Trend */}
      <div className="charts-row-2">
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Team Performance Radar</h3>
            <p className="chart-sub">Key metrics vs targets</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Radar name="Actual" dataKey="actual" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
              <Radar name="Target" dataKey="target" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeDasharray="4 2" />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Monthly Conversion Trend</h3>
            <p className="chart-sub">Lead conversion over time</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={convTrendData} margin={{ top: 10, right: 30, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8edf2', fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left" type="monotone" dataKey="leads" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Total Leads" />
              <Line yAxisId="left" type="monotone" dataKey="converted" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Converted" />
              <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} name="Rate %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>


      {/* Activity Completion Metrics */}
      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Activity Completion Metrics</h3>
          <p className="chart-sub">Task completion vs targets</p>
        </div>
        <div className="perf-stats-row">
          {activityData.map((a, i) => (
            <div key={i} className="perf-mini-card">
              <div className="pmc-label">{a.label}</div>
              <div className="pmc-value">{a.value.toLocaleString()}</div>
              <div className="pmc-target">Target: {a.target.toLocaleString()} <span style={{ color: a.color, fontWeight: 600 }}>{a.pct}%</span></div>
              <div className="pmc-bar"><div className="pmc-bar-fill" style={{ width: `${Math.min(a.pct, 100)}%`, background: a.color }} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* Response Time Distribution */}
      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Response Time Distribution</h3>
          <p className="chart-sub">Time to first contact with leads</p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={responseTimeData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8edf2', fontSize: 12 }} />
            <Bar dataKey="count" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={80} name="Leads" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function TargetIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> }
function ClockIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function StarIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function TrendIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> }
function DownloadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
