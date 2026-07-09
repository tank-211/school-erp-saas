import React, { useState, useEffect } from 'react';
import './Pipeline.css';
const API_URL = import.meta.env.VITE_API_URL;
const initialColumns = [
  {
    id: 'new_inquiry',
    label: 'New Inquiry',
    color: '#3b82f6',
    conversion: 100,
    leads: [
      { id: 1, name: 'Arjun Kumar', grade: 'Grade 1', score: 45, phone: '+91 98765 43212', email: 'amit.kumar@email.com', counselor: 'Mrs. Priya', time: '1 day ago', value: '₹25K' },
    ],
  },
  {
    id: 'contacted',
    label: 'Contacted',
    color: '#8b5cf6',
    conversion: 67,
    leads: [
      { id: 2, name: 'Diya Patel', grade: 'Grade 3', score: 72, phone: '+91 98765 43211', email: 'priya.patel@email.com', counselor: 'Mr. Amit', time: '5 hours ago', value: '₹28K' },
      { id: 3, name: 'Vihaan Gupta', grade: 'Grade 4', score: 55, phone: '+91 98765 43214', email: 'vihaan.gupta@email.com', counselor: 'Mrs. Sunita', time: '8 hours ago', value: '₹29K' },
    ],
  },
  {
    id: 'qualified',
    label: 'Qualified',
    color: '#3b82f6',
    conversion: 50,
    leads: [
      { id: 4, name: 'Aarav Sharma', grade: 'Grade 5', score: 85, phone: '+91 98765 43210', email: 'rajesh.sharma@email.com', counselor: 'Mrs. Priya', time: '2 hours ago', value: '₹30K' },
      { id: 5, name: 'Ishaan Verma', grade: 'Grade 6', score: 68, phone: '+91 98765 43215', email: 'ishaan.verma@email.com', counselor: 'Mr. Amit', time: '12 hours ago', value: '₹30K' },
    ],
  },
  {
    id: 'application',
    label: 'Application Submitted',
    color: '#f59e0b',
    conversion: 33,
    leads: [
      { id: 6, name: 'Ananya Singh', grade: 'Grade 8', score: 90, phone: '+91 98765 43213', email: 'deepak.singh@email.com', counselor: 'Mrs. Sunita', time: '3 hours ago', value: '₹35K' },
    ],
  },
  {
    id: 'fee_paid',
    label: 'Fee Paid',
    color: '#10b981',
    conversion: 80,
    leads: [
      { id: 7, name: 'Riya Mehta', grade: 'Grade 2', score: 95, phone: '+91 98765 43216', email: 'riya.mehta@email.com', counselor: 'Mrs. Priya', time: '2 days ago', value: '₹27K' },
    ],
  },
];

const scoreColor = (s) => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';

export default function Pipeline() {
  const [columns, setColumns] = useState([]);
  const fetchPipeline = async () => {
    try {

      const token =
        localStorage.getItem("authToken");

      const response = await fetch(
        `${API_URL}/pipeline`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      console.log(
        "PIPELINE RESPONSE:",
        result
      );

      setColumns(
        result.columns || []
      );

    } catch (error) {

      console.error(
        "Pipeline Error:",
        error
      );

    }
  };
  useEffect(() => {
    fetchPipeline();
  }, []);
  
  const [filter, setFilter] = useState('All Counselors');

  const totalLeads = columns.reduce((s, c) => s + c.leads.length, 0);
  const totalValue = '₹2.0L';

  return (
    <div className="pipeline-page">
      {/* Page Header */}
      <div className="pipeline-header">
        <div>
          <h1 className="page-title">Pipeline</h1>
          <p className="page-sub">Track leads through admission stages</p>
        </div>
        <select className="counselor-filter" value={filter} onChange={e => setFilter(e.target.value)}>
          {['All Counselors', 'Mrs. Priya', 'Mr. Amit', 'Mrs. Sunita'].map(c => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="pipeline-summary">
        {[
          { label: 'Total Leads', value: totalLeads, sub: 'In pipeline' },
          { label: 'Pipeline Value', value: totalValue, sub: 'Total potential' },
          { label: 'Conversion Rate', value: '17%', sub: '+3% this month', positive: true },
          { label: 'Avg Deal Size', value: '₹30K', sub: 'Per enrollment' },
        ].map((s, i) => (
          <div key={i} className="pipeline-summary-card">
            <div className="ps-label">{s.label}</div>
            <div className="ps-value">{s.value}</div>
            <div className={`ps-sub ${s.positive ? 'positive' : ''}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {columns.map((col) => (
          <div key={col.id} className="kanban-column">
            {/* Column Header */}
            <div className="kanban-col-header">
              <div className="kanban-col-title">
                <span className="kanban-dot" style={{ background: col.color }} />
                <span>{col.label}</span>
                <button className="kanban-add-btn">+</button>
              </div>
              <div className="kanban-col-meta">
                <span>{col.leads.length} leads</span>
                <span className="dot-sep">·</span>
                <span>
                  {col.leads.reduce((s, l) => s + parseInt(l.value.replace(/[^0-9]/g, '') || 0), 0) / 1000 > 0
                    ? `₹${col.leads.reduce((s, l) => s + parseInt(l.value.replace(/[^0-9]/g, '')), 0) / 1000}K`
                    : '₹0'}
                </span>
              </div>
              <div className="kanban-conv-bar">
                <div className="kanban-conv-track">
                  <div className="kanban-conv-fill" style={{ width: `${col.conversion}%`, background: col.color }} />
                </div>
                <span className="kanban-conv-label">Conversion {col.conversion}%</span>
              </div>
            </div>

            {/* Lead Cards */}
            <div className="kanban-cards">
              {col.leads.map((lead) => (
                <div key={lead.id} className="lead-card">
                  <div className="lead-card-top">
                    <span className="lead-name">{lead.name}</span>
                    <span className="lead-score" style={{ color: scoreColor(lead.score) }}>{lead.score}</span>
                    <button className="lead-more">⋮</button>
                  </div>
                  <div className="lead-grade">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                    {lead.grade}
                  </div>
                  <div className="lead-contact">
                    <div className="lead-contact-row">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.48 2 2 0 0 1 3.61 1.3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.94a16 16 0 0 0 6.06 6.06l.94-1.02a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/></svg>
                      {lead.phone}
                    </div>
                    <div className="lead-contact-row">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      {lead.email}
                    </div>
                    <div className="lead-contact-row">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {lead.counselor}
                    </div>
                  </div>
                  <div className="lead-card-footer">
                    <span className="lead-time">{lead.time}</span>
                    <span className="lead-value">{lead.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
