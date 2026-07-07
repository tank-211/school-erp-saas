import React, { useState } from 'react'
import './Reports.css'
import './CustomReports.css'


/* ── Static data ── */
const savedTemplates = [
  { id: 1, name: 'Weekly Enrollment Summary',   desc: 'Summary of new enrollments and revenue for the past week',         tags: ['Enrollment','Weekly','Active'],    cls: ['tg-enrollment','tg-weekly','tg-active'],  lastRun: '2026-02-24' },
  { id: 2, name: 'Monthly Revenue Breakdown',   desc: 'Detailed revenue analysis by grade, source, and payment status',   tags: ['Sales','Monthly','Active'],       cls: ['tg-sales','tg-monthly','tg-active'],      lastRun: '2026-02-20' },
  { id: 3, name: 'Staff Performance Dashboard', desc: 'Individual and team performance metrics with KPIs',                 tags: ['Performance','Weekly','Active'],  cls: ['tg-performance','tg-weekly','tg-active'], lastRun: '2026-02-26' },
  { id: 4, name: 'Lead Source ROI Analysis',    desc: 'Cost per lead and conversion rates by acquisition channel',        tags: ['Custom','Monthly','Active'],      cls: ['tg-custom','tg-monthly','tg-active'],     lastRun: '2026-02-15' },
  { id: 5, name: 'Parent Satisfaction Survey Results', desc: 'Aggregated feedback and satisfaction scores from parents',  tags: ['Custom','Monthly','Active'],      cls: ['tg-custom','tg-monthly','tg-active'],     lastRun: '2026-02-10' },
  { id: 6, name: 'Q1 Admission Forecast',       desc: 'Projected enrollments and revenue for next quarter',               tags: ['Enrollment','On-Demand','Draft'], cls: ['tg-enrollment-2','tg-ondemand','tg-draft'], lastRun: 'Never' },
]

const quickStart = [
  { icon: '📊', name: 'Admissions Pipeline',  desc: 'Track leads through the admission funnel',        metrics: '5 metrics' },
  { icon: '💰', name: 'Revenue Forecast',      desc: 'Project future revenue based on trends',          metrics: '7 metrics' },
  { icon: '👥', name: 'Team Productivity',     desc: 'Monitor staff activity and performance',          metrics: '6 metrics' },
  { icon: '⭐', name: 'Parent Satisfaction',   desc: 'Analyze feedback and satisfaction scores',        metrics: '4 metrics' },
  { icon: '🎯', name: 'Lead Source Analysis',  desc: 'Compare effectiveness of marketing channels',    metrics: '8 metrics' },
  { icon: '📈', name: 'Enrollment Trends',     desc: 'Historical enrollment patterns and predictions', metrics: '6 metrics' },
]

const LEAD_METRICS     = ['Lead Source','Lead Status','Conversion Rate','Response Time']
const REVENUE_METRICS  = ['Revenue by Grade','Payment Status','Outstanding Fees','Revenue Forecast']
const PERF_METRICS     = ['Staff Performance','Activity Completion','Customer Satisfaction','Target Achievement']
const ENROLL_METRICS   = ['New Enrollments','Renewals','Grade Distribution','Enrollment Trends']

/* ── Report Builder inline form ── */
function ReportBuilder({ onClose }) {
  const [form, setForm] = useState({
    name: '', frequency: 'On-Demand', description: '',
    dateRange: 'Last 7 Days', gradeLevel: 'All Grades',
    leadSource: 'All Sources', status: 'All Statuses',
  })
  const [metrics, setMetrics] = useState({})

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleMetric = m => setMetrics(prev => ({ ...prev, [m]: !prev[m] }))

  const MetricCheck = ({ label }) => (
    <label className="metric-check">
      <input type="checkbox" checked={!!metrics[label]} onChange={() => toggleMetric(label)} />
      <span className="metric-box" />
      <span className="metric-label">{label}</span>
    </label>
  )

  const MetricGroup = ({ title, items }) => (
    <div className="metric-group">
      <div className="metric-group-title">{title}</div>
      <div className="metric-group-items">
        {items.map(m => <MetricCheck key={m} label={m} />)}
      </div>
    </div>
  )

  return (
    <div className="report-builder-card">
      {/* Builder Header */}
      <div className="rb-header">
        <span className="rb-title">Report Builder</span>
        <button className="rb-close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Name + Frequency */}
      <div className="rb-row">
        <div className="rb-field">
          <label className="rb-label">Report Name</label>
          <input className="rb-input" placeholder="Enter report name"
            value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="rb-field rb-field-sm">
          <label className="rb-label">Frequency</label>
          <select className="rb-select" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
            {['On-Demand','Daily','Weekly','Monthly','Quarterly'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="rb-field" style={{ marginBottom: 20 }}>
        <label className="rb-label">Description</label>
        <textarea className="rb-textarea" rows={3}
          placeholder="Describe what this report will show"
          value={form.description} onChange={e => set('description', e.target.value)} />
      </div>

      {/* Select Metrics */}
      <div className="rb-section-label">Select Metrics</div>
      <div className="metrics-grid">
        <div className="metrics-col">
          <MetricGroup title="" items={LEAD_METRICS} />
          <MetricGroup title="Performance Metrics" items={PERF_METRICS} />
        </div>
        <div className="metrics-col">
          <MetricGroup title="" items={REVENUE_METRICS} />
          <MetricGroup title="Enrollment Metrics" items={ENROLL_METRICS} />
        </div>
      </div>

      {/* Report Filters */}
      <div className="rb-section-label" style={{ marginTop: 20 }}>Report Filters</div>
      <div className="rb-filters-row">
        {[
          { label: 'Date Range',  key: 'dateRange',  opts: ['Last 7 Days','Last 30 Days','Last 90 Days','This Year','Custom'] },
          { label: 'Grade Level', key: 'gradeLevel', opts: ['All Grades','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9'] },
          { label: 'Lead Source', key: 'leadSource', opts: ['All Sources','Website','Referral','Walk-in','Ads','Social Media'] },
          { label: 'Status',      key: 'status',     opts: ['All Statuses','New','Contacted','Qualified','Application','Enrolled'] },
        ].map(f => (
          <div key={f.key} className="rb-filter-group">
            <label className="rb-label">{f.label}</label>
            <select className="rb-select" value={form[f.key]} onChange={e => set(f.key, e.target.value)}>
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="rb-footer">
        <button className="rb-btn-cancel" onClick={onClose}>Cancel</button>
        <div className="rb-footer-right">
          <button className="rb-btn-draft">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save as Draft
          </button>
          <button className="rb-btn-run">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Run Report
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function CustomReports() {
  const [showBuilder, setShowBuilder] = useState(false)

  return (
    <div className="custom-reports-page">

      {/* Page Header */}
      <div className="reports-header">
        <div>
          <h1 className="page-title">Custom Reports</h1>
          <p className="page-sub">Create and manage custom report templates</p>
        </div>
        <button className="btn-primary" onClick={() => setShowBuilder(true)}>
          + Create Report
        </button>
      </div>

      {/* Summary stat cards */}
      <div className="custom-stats">
        {[
          { label: 'Total Reports',   value: 6,       sub: 'Saved templates' },
          { label: 'Active Reports',  value: 5,       sub: 'Running automatically' },
          { label: 'Scheduled',       value: 5,       sub: 'Recurring reports' },
          { label: 'Last Generated',  value: 'Today', sub: '5 reports run' },
        ].map((s, i) => (
          <div key={i} className="custom-stat">
            <div className="cs-label">{s.label}</div>
            <div className="cs-value">{s.value}</div>
            <div className="cs-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Inline Report Builder ── */}
      {showBuilder && (
        <ReportBuilder onClose={() => setShowBuilder(false)} />
      )}

      {/* Saved Templates */}
      <div className="saved-templates-card">
        <div className="saved-templates-header">
          <h3 className="chart-title">Saved Report Templates</h3>
          <select className="report-period-select">
            <option>All Categories</option>
            <option>Enrollment</option>
            <option>Sales</option>
            <option>Performance</option>
          </select>
        </div>
        <div className="templates-grid">
          {savedTemplates.map(t => (
            <div key={t.id} className="template-card">
              <div className="template-name">{t.name}</div>
              <div className="template-desc">{t.desc}</div>
              <div className="template-tags">
                {t.tags.map((tag, i) => (
                  <span key={i} className={`template-tag ${t.cls[i]}`}>{tag}</span>
                ))}
              </div>
              <div className="template-footer">
                <span className="template-last-run"><CalIcon /> Last run: {t.lastRun}</span>
                <div className="template-actions">
                  <button className="tpl-btn view"><EyeIcon /></button>
                  <button className="tpl-btn run"><PlayIcon /></button>
                  <button className="tpl-btn download"><DownloadIcon /></button>
                  <button className="tpl-btn delete"><TrashIcon /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Start Templates */}
      <div className="quick-start-card">
        <h3 className="chart-title">Quick Start Templates</h3>
        <p className="chart-sub" style={{ marginTop: 4 }}>Pre-configured report templates to get started quickly</p>
        <div className="quick-start-grid">
          {quickStart.map((q, i) => (
            <div key={i} className="qs-card" onClick={() => setShowBuilder(true)}>
              <div className="qs-icon">{q.icon}</div>
              <div className="qs-name">{q.name}</div>
              <div className="qs-desc">{q.desc}</div>
              <div className="qs-footer">
                <span className="qs-metrics">{q.metrics}</span>
                <span className="qs-link">Use Template →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Icons ── */
function CalIcon()      { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function EyeIcon()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function PlayIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> }
function DownloadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function TrashIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> }
