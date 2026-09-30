import React, { useEffect, useState } from 'react'
import './Reports.css'
import { reportsAPI } from '../../services/api'
import { downloadCsv } from './reportUtils'

const STATUSES = ['new', 'pending', 'contacted', 'interested', 'qualified', 'converted', 'admitted', 'inactive', 'lost']
const EMPTY = { desired_class: '', source: '', status: '', counselor: '', academic_year_id: '', from: '', to: '' }
const PREVIEW_ROWS = 100

const monthStart = () => {
  const ist = new Date(Date.now() + 5.5 * 3600000)
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-01`
}

// Ready-made filter sets; they only fill in the filters below
const QUICK_START = [
  { name: 'New leads this month', desc: 'Every lead created since the 1st', filters: () => ({ from: monthStart() }) },
  { name: 'Unassigned leads', desc: 'Leads no counselor owns yet', filters: () => ({ counselor: 'unassigned' }) },
  { name: 'Interested families', desc: 'Leads marked interested', filters: () => ({ status: 'interested' }) },
  { name: 'Walk-in leads', desc: 'Leads whose source is Walk-in', filters: () => ({ source: 'Walk-in' }) },
]

const COLUMNS = [
  { key: 'name', label: 'Student' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' },
  { key: 'desired_class', label: 'Class' }, { key: 'source', label: 'Source' }, { key: 'status', label: 'Status' },
  { key: 'counselor', label: 'Counselor' }, { key: 'application_status', label: 'Application' },
  { key: 'created', label: 'Created' }, { key: 'last_contacted', label: 'Last contacted' },
]
const day = (v) => (v ? new Date(v).toLocaleDateString('en-IN') : '')

// Build a lead list from filters, preview it, and download it as CSV.
export default function CustomReports() {
  const [lookups, setLookups] = useState(null)
  const [filters, setFilters] = useState(EMPTY)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    reportsAPI.lookups().then((res) => setLookups(res.data)).catch((err) => setError(err.message))
  }, [])

  const set = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }))

  const run = async (next = filters) => {
    setRunning(true)
    setError('')
    try {
      const res = await reportsAPI.leads(next)
      setResult({
        ...res.data,
        rows: res.data.rows.map((r) => ({ ...r, created: day(r.created_at), last_contacted: day(r.last_contacted_at) })),
      })
    } catch (err) {
      setError(err.message || 'Could not run the report')
    } finally {
      setRunning(false)
    }
  }

  const quickStart = (preset) => {
    const next = { ...EMPTY, ...preset.filters() }
    setFilters(next)
    run(next)
  }

  const download = () => downloadCsv(`lead-report-${new Date().toISOString().slice(0, 10)}.csv`, COLUMNS, result.rows)

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1 className="page-title">Custom Reports</h1>
          <p className="page-sub">Filter your leads and download the list</p>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Quick start</h3>
          <p className="chart-sub">Common lead lists, one click</p>
        </div>
        <div className="templates-grid">
          {QUICK_START.map((q) => (
            <button key={q.name} className="template-card" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => quickStart(q)}>
              <div className="template-name">{q.name}</div>
              <div className="template-desc">{q.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Filters</h3>
          <p className="chart-sub">Leave a filter empty to include everything</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          <Select label="Class" value={filters.desired_class} onChange={(v) => set('desired_class', v)} options={(lookups?.classes || []).map((c) => [c, c])} />
          <Select label="Source" value={filters.source} onChange={(v) => set('source', v)} options={(lookups?.sources || []).map((c) => [c, c])} />
          <Select label="Status" value={filters.status} onChange={(v) => set('status', v)} options={STATUSES.map((c) => [c, c[0].toUpperCase() + c.slice(1)])} />
          <Select label="Counselor" value={filters.counselor} onChange={(v) => set('counselor', v)} options={[['unassigned', 'Unassigned'], ...(lookups?.counselors || []).map((c) => [c.id, c.name])]} />
          <Select label="Academic year" value={filters.academic_year_id} onChange={(v) => set('academic_year_id', v)} options={(lookups?.academic_years || []).map((y) => [y.id, y.name])} />
          <label className="cr-field" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#64748b' }}>
            Created from
            <input type="date" className="report-period-select" value={filters.from} onChange={(e) => set('from', e.target.value)} />
          </label>
          <label className="cr-field" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#64748b' }}>
            Created to
            <input type="date" className="report-period-select" value={filters.to} onChange={(e) => set('to', e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className="btn-primary" onClick={() => run()} disabled={running}><PlayIcon /> {running ? 'Running...' : 'Run Report'}</button>
          <button className="btn-cancel" onClick={() => { setFilters(EMPTY); setResult(null) }} disabled={running}>Clear</button>
        </div>
        {error && <div style={{ color: '#b91c1c', marginTop: 12, fontSize: 13 }}>{error}</div>}
      </div>

      {result && (
        <div className="chart-card">
          <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="chart-title">{result.total} lead{result.total === 1 ? '' : 's'} found</h3>
              <p className="chart-sub">
                {result.rows.length > PREVIEW_ROWS ? `Showing the first ${PREVIEW_ROWS}; the download has all ${result.rows.length}.` : 'Newest first.'}
                {result.truncated ? ' The download is limited to 5,000 rows; narrow the filters for the rest.' : ''}
              </p>
            </div>
            <button className="btn-primary" onClick={download} disabled={!result.rows.length}><DownloadIcon /> Download CSV</button>
          </div>
          {result.rows.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="staff-table">
                <thead><tr>{COLUMNS.map((c) => <th key={c.key}>{c.label.toUpperCase()}</th>)}</tr></thead>
                <tbody>
                  {result.rows.slice(0, PREVIEW_ROWS).map((r) => (
                    <tr key={r.id}>{COLUMNS.map((c) => <td key={c.key}>{r[c.key] || '—'}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div style={{ color: '#94a3b8', padding: 24, textAlign: 'center' }}>No leads match these filters.</div>}
        </div>
      )}
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#64748b' }}>
      {label}
      <select className="report-period-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </label>
  )
}

function CalIcon()      { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function EyeIcon()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function PlayIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> }
function DownloadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function TrashIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> }
