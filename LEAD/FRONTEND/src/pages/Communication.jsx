import React, { useState, useEffect } from 'react'
import './Communication.css'
import { leadAPI, communicationAPI } from "../services/api";

const typeColor = { email: '#3b82f6', whatsapp: '#10b981', sms: '#f59e0b', call: '#8b5cf6' }
const typeIcon  = {
  email:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  whatsapp: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  sms:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  call:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.48 2 2 0 0 1 3.61 1.3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.94a16 16 0 0 0 6.06 6.06l.94-1.02a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/></svg>,
}

function ComposePanel({ onClose, leads }) {

  const [tab, setTab] = useState("Email");
  const [lead, setLead] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [duration, setDuration] = useState("");

const handleSend = async () => {
  try {
    if (!lead) {
      alert("Please select a lead");
      return;
    }

    if (!subject && tab === "Email") {
      alert("Please enter a subject");
      return;
    }

      if (!message) {
        alert("Please enter a message");
        return;
      }
      if (tab === "Email") {
        await communicationAPI.sendEmail({
          leadId: lead,
          subject,
          content: message,
          to: "test@example.com",
        });
      }

      if (tab === "WhatsApp") {
        await communicationAPI.logWhatsApp({
          leadId: Number(lead),
          message,
        });
      }

      if (tab === "SMS") {
        await communicationAPI.logSMS({
          leadId: Number(lead),
          message,
        });
      }

      alert("Communication logged successfully");

      setSubject("");
      setMessage("");
      setLead("");

      onClose();
    } catch (err) {
        console.error("SEND EMAIL ERROR:", err);

        if (err.response) {
          console.log("RESPONSE:", err.response);
        }

        alert("Failed to send email");
      }
  };

  const handleCallLog = async () => {
    try {
      if (!lead) {
        alert("Please select a lead");
        return;
      }

      await communicationAPI.logCall({
        leadId: lead,
        duration: parseInt(duration || 0),
        notes: message,
      });

      alert("Call logged successfully");

      setLead("");
      setDuration("");
      setMessage("");

      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to log call");
    }
  };

  const tabLabel = { Email: 'Send Email', SMS: 'Send SMS', WhatsApp: 'Send WhatsApp' }

  const handleSaveDraft = () => {
    alert("Draft feature coming soon");
  };

  return (
    <div className="compose-panel">
      {/* Panel header */}
      <div className="compose-header">
        <span className="compose-title">Compose Message</span>
        <button className="compose-close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      {/* Channel tabs */}
      <div className="compose-tabs">
        {['Email','SMS','WhatsApp','Call'].map(t => (
          <button
            key={t}
            className={`compose-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'Email'    && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
            {t === 'SMS'      && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
            {t === 'WhatsApp' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
            {t}
          </button>
        ))}
      </div>

      {/* Form body */}
      <div className="compose-body">
        {/* Select Lead */}
        <div className="compose-field">
          <label className="compose-label">Select Lead</label>
            <select
              className="compose-select"
              value={lead}
              onChange={(e) => setLead(e.target.value)}
            >
              <option value="">Select Lead</option>

              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name}
                </option>
              ))}
            </select>
        </div>

        {/* Phone — SMS / WhatsApp only */}
        {tab !== 'Email' && (
          <div className="compose-field">
            <label className="compose-label">Phone Number</label>
            <input className="compose-input" placeholder="+91 XXXXX XXXXX"
              value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        )}

        {tab==='Call'&&<div className="compose-field"><label className="compose-label">Duration (seconds)</label><input className="compose-input" type="number" placeholder="120" value={duration} onChange={e=>setDuration(e.target.value)} /></div>}

        {/* Subject — Email only */}
        {tab === 'Email' && (
          <div className="compose-field">
            <label className="compose-label">Subject</label>
            <input className="compose-input" placeholder="Enter subject"
              value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
        )}

        {/* Message */}
        <div className="compose-field">
          <label className="compose-label">
            {tab === "Call" ? "Call Notes" : "Message"}
          </label>
          <textarea className="compose-textarea" rows={5} placeholder="Type your message here..."
            value={message} onChange={e => setMessage(e.target.value)} />
        </div>
      </div>

      {/* Footer */}
      <div className="compose-footer">
        <button className="compose-send-btn" onClick={tab==="Call"?handleCallLog:handleSend}>
          {tab === 'Email'
            ? <>Send Email</>
            : tab === 'SMS'
            ? <>Send SMS</>
            : tab === 'WhatsApp'
            ? <>Send WhatsApp</>
            : <>Log Call</>
          }
        </button>
        <button className="compose-draft-btn" onClick={handleSaveDraft}>
          Save Draft
        </button>
      </div>
    </div>
  )
}

/* ─── Main Page ─────────────────────────────────── */
export default function Communication() {
  const [filter, setFilter]       = useState('All')
  const [search, setSearch]       = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [leads, setLeads] = useState([]);
  const [messages, setMessages] = useState([]);

  const fetchMessages = async (allLeads) => {
    try {
      const allMessages = [];

      for (const lead of allLeads) {
        const history =
          await communicationAPI.getHistory(lead.id);

        console.log("HISTORY:", history);
        console.log("COMMUNICATIONS:", history.data.communications);

        allMessages.push(
          ...(history.data?.communications || [])
        );
      }

      console.log("FINAL MESSAGES:", allMessages);

      setMessages(allMessages);

    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const leadsData = await leadAPI.getLeads();
        console.log("LEADS RESPONSE:", leadsData);
        console.log("LEADS DATA:", leadsData.data);
        console.log("FIRST LEAD:", leadsData.data[0]);
        setLeads(leadsData.data || []);

        await fetchMessages(leadsData.data || []);
      } catch (error) {
        console.error("Error fetching leads:", error);
      }
    };


    fetchLeads();
  }, []);

  const filtered = messages.filter(m => {
    const matchType   = filter === 'All' || m.type.toLowerCase() === filter.toLowerCase()
    const matchSearch = !search || m.content?.toLowerCase().includes(search.toLowerCase()) || m.type?.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })
  const totalMessages = messages.length;

  const emailCount = messages.filter(
    m => m.type === "email"
  ).length;

  const smsCount = messages.filter(
    m => m.type === "sms"
  ).length;

  const whatsappCount = messages.filter(
    m => m.type === "whatsapp"
  ).length;

  const callCount = messages.filter(
    m => m.type === "call"
  ).length;

  return (
    <div className="comm-page">
      {/* Header */}
      <div className="comm-header">
        <div>
          <h1 className="page-title">Communication</h1>
          <p className="page-sub">Manage all lead communications</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCompose(v => !v)}>
          + New Message
        </button>
      </div>

      {/* Stat Cards */}
    <div className="comm-stats">

      <div className="comm-stat-card" style={{borderColor:"#e5e7eb"}}>
        <div className="csc-icon">💬</div>
        <div className="csc-label">Total Messages</div>
        <div className="csc-value">{totalMessages}</div>
      </div>

      <div className="comm-stat-card" style={{borderColor:"#3b82f6"}}>
        <div className="csc-icon">📧</div>
        <div className="csc-label">Emails</div>
        <div className="csc-value">{emailCount}</div>
      </div>

      <div className="comm-stat-card" style={{borderColor:"#f59e0b"}}>
        <div className="csc-icon">📱</div>
        <div className="csc-label">SMS</div>
        <div className="csc-value">{smsCount}</div>
      </div>

      <div className="comm-stat-card" style={{borderColor:"#10b981"}}>
        <div className="csc-icon">🟢</div>
        <div className="csc-label">WhatsApp</div>
        <div className="csc-value">{whatsappCount}</div>
      </div>

      <div className="comm-stat-card" style={{borderColor:"#8b5cf6"}}>
        <div className="csc-icon">📞</div>
        <div className="csc-label">Calls</div>
        <div className="csc-value">{callCount}</div>
      </div>

    </div>
      {/* Compose Message Panel — shown inline after stat cards */}
      {showCompose && <ComposePanel onClose={() => setShowCompose(false)} leads={leads} />}

      {/* Filter bar */}
      <div className="comm-filter-bar">
        <div className="comm-filter-left">
          <FilterIcon />
          {['All','Email','Sms','Whatsapp','Call'].map(f => (
            <button key={f} className={`task-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        <div className="comm-search-wrap">
          <SearchIcon />
          <input className="comm-search" placeholder="Search messages..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Message list */}
      <div className="message-list">
        {filtered.map(msg => {console.log("ITEM:", msg); return (
          <div key={msg.id} className="message-row">
            <div className="msg-icon-wrap" style={{ background: typeColor[msg.type] + '18', color: typeColor[msg.type] }}>
              {typeIcon[msg.type]}
            </div>
            <div className="msg-body">
              <div className="msg-top">
                <span className="msg-name">Lead #{msg.recipient_id}</span>
                <span className="msg-type-badge" style={{ background: typeColor[msg.type] + '18', color: typeColor[msg.type] }}>{msg.channel?.toUpperCase() || "UNKNOWN"}</span>
                <span className="msg-status-badge">{msg.status}</span>
              </div>
              {msg.subject && <div className="msg-subject">{msg.subject}</div>}
              <div className="msg-preview">{msg.message}</div>
              <div className="msg-meta">
                <span><UserSmIcon /> User #{msg.created_by}</span>
                <span><ClockSmIcon />{new Date(msg.created_at).toLocaleString()}</span>
                <span><SendIcon /> {msg.status}</span>
              </div>
            </div>
          </div>
        );
        })}
      </div>
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
