import React, { useState, useEffect } from 'react'
import './Communication.css'
import { leadsAPI, communicationAPI } from "../services/api";

const typeColor = { email: '#3b82f6', whatsapp: '#10b981', sms: '#f59e0b', call: '#8b5cf6' }
const typeIcon  = {
  email:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  whatsapp: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  sms:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  call:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.48 2 2 0 0 1 3.61 1.3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.94a16 16 0 0 0 6.06 6.06l.94-1.02a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/></svg>,
}

function ComposePanel({ onClose, onSent }) {

  const [tab, setTab] = useState("Email");
  const [lead, setLead] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadOptions, setLeadOptions] = useState([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [duration, setDuration] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Search the school's leads by name or phone (the list is paginated)
  useEffect(() => {
    const t = setTimeout(() => {
      leadsAPI.getAll({ search: leadSearch, limit: 20 })
        .then((res) => setLeadOptions(res.data || []))
        .catch(() => setLeadOptions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [leadSearch]);

  const selected = leadOptions.find((l) => String(l.id) === String(lead));

  const submit = async () => {
    setError("");
    if (!lead) return setError("Please select a lead");
    if (tab === "Email" && !subject.trim()) return setError("Please enter a subject");
    if (tab !== "Call" && !message.trim()) return setError("Please enter a message");
    setBusy(true);
    try {
      if (tab === "Email") {
        // Sent to the lead's own email address on record
        await communicationAPI.sendEmail({ leadId: lead, subject, content: message });
      } else if (tab === "WhatsApp") {
        await communicationAPI.logWhatsApp({ leadId: Number(lead), message });
      } else if (tab === "SMS") {
        await communicationAPI.logSMS({ leadId: Number(lead), message });
      } else {
        await communicationAPI.logCall({ leadId: lead, duration: parseInt(duration || 0, 10), notes: message });
      }
      onSent(tab === "Email" ? "Email sent." : `${tab} logged.`);
    } catch (err) {
      setError(err.message || "Could not send");
      setBusy(false);
    }
  };

  return (
    <div className="compose-panel">
      <div className="compose-header">
        <span className="compose-title">New Message</span>
        <button className="compose-close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="compose-tabs">
        {['Email','SMS','WhatsApp','Call'].map(t => (
          <button key={t} className={`compose-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="compose-body">
        <div className="compose-field">
          <label className="compose-label">Lead</label>
          <input className="compose-input" placeholder="Search by name or phone" value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} />
          <select className="compose-select" style={{ marginTop: 6 }} value={lead} onChange={(e) => setLead(e.target.value)}>
            <option value="">Select lead</option>
            {leadOptions.map((l) => (
              <option key={l.id} value={l.id}>{l.name}{l.phone ? ` · ${l.phone}` : ''}</option>
            ))}
          </select>
          {selected && tab === 'Email' && !selected.email && (
            <div style={{ color: '#b45309', fontSize: 12, marginTop: 4 }}>This lead has no email address on record.</div>
          )}
          {selected && tab === 'Email' && selected.email && (
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>To: {selected.email}</div>
          )}
        </div>

        {(tab === 'SMS' || tab === 'WhatsApp') && (
          <div style={{ background: '#fffbeb', color: '#92400e', fontSize: 12, padding: '8px 10px', borderRadius: 8, marginBottom: 12 }}>
            No {tab} provider is connected yet, so this records the message you sent from your phone; nothing is sent from here.
          </div>
        )}

        {tab === 'Call' && (
          <div className="compose-field">
            <label className="compose-label">Duration (seconds)</label>
            <input className="compose-input" type="number" placeholder="120" value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
        )}

        {tab === 'Email' && (
          <div className="compose-field">
            <label className="compose-label">Subject</label>
            <input className="compose-input" placeholder="Enter subject" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
        )}

        <div className="compose-field">
          <label className="compose-label">{tab === "Call" ? "Call Notes" : "Message"}</label>
          <textarea className="compose-textarea" rows={5} placeholder="Type your message here..." value={message} onChange={e => setMessage(e.target.value)} />
        </div>
        {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}
      </div>

      <div className="compose-footer">
        <button className="compose-send-btn" disabled={busy} onClick={submit}>
          {busy ? 'Working...' : tab === 'Email' ? 'Send Email' : tab === 'Call' ? 'Log Call' : `Log ${tab}`}
        </button>
      </div>
    </div>
  )
}

/* ─── Main Page ─────────────────────────────────── */
const FILTERS = [['All', ''], ['Email', 'email'], ['SMS', 'sms'], ['WhatsApp', 'whatsapp'], ['Call', 'call']]

export default function Communication() {
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [data, setData] = useState({ items: [], counts: {}, pagination: { page: 1, totalPages: 1 } })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await communicationAPI.list({ channel: filter, search, page, limit: 50 })
      setData(res.data)
    } catch (err) {
      setError(err.message || 'Could not load messages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search, page])

  const counts = data.counts || {}
  const cards = [
    { label: 'Total Messages', value: counts.all, icon: '💬', border: '#e5e7eb' },
    { label: 'Emails', value: counts.email, icon: '📧', border: '#3b82f6' },
    { label: 'SMS', value: counts.sms, icon: '📱', border: '#f59e0b' },
    { label: 'WhatsApp', value: counts.whatsapp, icon: '🟢', border: '#10b981' },
    { label: 'Calls', value: counts.call, icon: '📞', border: '#8b5cf6' },
  ]

  return (
    <div className="comm-page">
      <div className="comm-header">
        <div>
          <h1 className="page-title">Communication</h1>
          <p className="page-sub">Every email, message and call with your leads</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCompose(v => !v)}>+ New Message</button>
      </div>

      <div className="comm-stats">
        {cards.map((c) => (
          <div key={c.label} className="comm-stat-card" style={{ borderColor: c.border }}>
            <div className="csc-icon">{c.icon}</div>
            <div className="csc-label">{c.label}</div>
            <div className="csc-value">{c.value ?? 0}</div>
          </div>
        ))}
      </div>

      {notice && (
        <div style={{ background: '#ecfdf5', color: '#065f46', padding: '10px 14px', borderRadius: 10, margin: '12px 0', display: 'flex', justifyContent: 'space-between' }}>
          <span>{notice}</span>
          <button style={{ background: 'none', border: 0, cursor: 'pointer', color: '#065f46' }} onClick={() => setNotice('')}>Dismiss</button>
        </div>
      )}

      {showCompose && (
        <ComposePanel
          onClose={() => setShowCompose(false)}
          onSent={(text) => { setShowCompose(false); setNotice(text); setPage(1); load() }}
        />
      )}

      <div className="comm-filter-bar">
        <div className="comm-filter-left">
          <FilterIcon />
          {FILTERS.map(([label, value]) => (
            <button key={label} className={`task-tab ${filter === value ? 'active' : ''}`} onClick={() => { setFilter(value); setPage(1) }}>{label}</button>
          ))}
        </div>
        <div className="comm-search-wrap">
          <SearchIcon />
          <input className="comm-search" placeholder="Search subject or message..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      {error && <div style={{ color: '#b91c1c', padding: 12 }}>{error}</div>}

      <div className="message-list">
        {!loading && !error && data.items.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No messages yet.</div>
        )}
        {data.items.map(msg => {
          const type = msg.channel || 'email'
          return (
            <div key={msg.id} className="message-row">
              <div className="msg-icon-wrap" style={{ background: (typeColor[type] || '#64748b') + '18', color: typeColor[type] }}>
                {typeIcon[type]}
              </div>
              <div className="msg-body">
                <div className="msg-top">
                  <span className="msg-name">{msg.lead_name || (msg.recipient_type === 'lead' ? `Lead #${msg.recipient_id}` : msg.recipient_type || 'Recipient')}</span>
                  <span className="msg-type-badge" style={{ background: (typeColor[type] || '#64748b') + '18', color: typeColor[type] }}>{type.toUpperCase()}</span>
                  <span className="msg-status-badge">{msg.status}</span>
                </div>
                {msg.subject && <div className="msg-subject">{msg.subject}</div>}
                <div className="msg-preview">{msg.message}</div>
                <div className="msg-meta">
                  <span><UserSmIcon /> {msg.created_by_name || 'Unknown user'}</span>
                  <span><ClockSmIcon />{msg.created_at ? new Date(msg.created_at).toLocaleString('en-IN') : ''}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {data.pagination?.totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: 16, alignItems: 'center' }}>
          <button className="task-tab" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span style={{ fontSize: 13, color: '#64748b' }}>Page {page} of {data.pagination.totalPages}</span>
          <button className="task-tab" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}

/* ─── Icons ─────────────────────────────────────── */
function AllMsgIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> }
function FilterIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> }
function SearchIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function UserSmIcon()  { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function ClockSmIcon() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function SendIcon()    { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> }
