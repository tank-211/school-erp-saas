import { useState } from "react";
import { Star, User, Clock, MoreVertical, Phone, Mail, Calendar, Settings, AlertCircle, X } from "lucide-react";
import "../style.css";

const initCols = [
  { id:"new",                title:"New Inquiry",        color:"#f0f4f8", leads:[
    { id:"1", name:"Aarav Sharma",  grade:"Grade 5", score:85, last:"2 hours ago", counselor:"Priya Sharma",  tags:["Hot Lead"],      inactive:0 },
    { id:"2", name:"Diya Patel",    grade:"Grade 3", score:72, last:"1 day ago",   counselor:"Amit Patel",    tags:[],                inactive:1 },
  ]},
  { id:"contacted",          title:"Contacted",          color:"#eff6ff", leads:[
    { id:"3", name:"Arjun Kumar",   grade:"Grade 8", score:91, last:"3 hours ago", counselor:"Neha Kumar",    tags:["High Priority"], inactive:0 },
  ]},
  { id:"interested",         title:"Interested",         color:"#f0fdf4", leads:[
    { id:"4", name:"Ananya Singh",  grade:"Grade 1", score:58, last:"2 days ago",  counselor:"Rahul Singh",   tags:[],                inactive:2 },
  ]},
  { id:"campus_visit",       title:"Campus Visit",       color:"#faf5ff", leads:[] },
  { id:"application_started",title:"Application Started",color:"#fff7ed", leads:[
    { id:"5", name:"Vihaan Reddy",  grade:"Grade 6", score:78, last:"Yesterday",   counselor:"Priya Sharma",  tags:["In Progress"],   inactive:1 },
  ]},
  { id:"submitted",          title:"Submitted",          color:"#f0fdfa", leads:[] },
  { id:"approved",           title:"Approved",           color:"#f0fdf4", leads:[] },
  { id:"rejected",           title:"Rejected",           color:"#fff1f2", leads:[] },
];

export function Pipeline() {
  const [cols, setCols]   = useState(initCols);
  const [dragId, setDragId]     = useState(null);
  const [dragSrc, setDragSrc]   = useState(null);
  const [showConfig, setShowConfig] = useState(false);

  const scoreColor = s => s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";
  const totalLeads = cols.reduce((s,c) => s + c.leads.length, 0);

  const onDragStart = (leadId, colId) => { setDragId(leadId); setDragSrc(colId); };
  const onDrop = (targetColId) => {
    if (!dragId || dragSrc === targetColId) return;
    setCols(prev => {
      const next = prev.map(c => ({ ...c, leads: [...c.leads] }));
      const src = next.find(c => c.id === dragSrc);
      const tgt = next.find(c => c.id === targetColId);
      if (!src || !tgt) return prev;
      const idx = src.leads.findIndex(l => l.id === dragId);
      if (idx === -1) return prev;
      const [lead] = src.leads.splice(idx, 1);
      tgt.leads.push(lead);
      return next;
    });
    setDragId(null); setDragSrc(null);
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Admission Pipeline</h1>
          <p className="page-sub">Visual tracking of leads through the admission funnel</p>
        </div>
        <button className="btn btn-outline" onClick={() => setShowConfig(true)}><Settings size={15} /> Configure Stages</button>
      </div>

      {/* Stats */}
      <div className="grid-3 mb-5">
        <div className="stat-card"><div className="stat-label">Total Leads in Pipeline</div><div className="stat-value">{totalLeads}</div></div>
        <div className="stat-card"><div className="stat-label">Overall Conversion Rate</div><div className="stat-value" style={{color:"var(--green)"}}>0%</div></div>
        <div className="stat-card"><div className="stat-label">Avg. Days in Pipeline</div><div className="stat-value" style={{color:"var(--blue)"}}>14</div></div>
      </div>

      {/* Kanban */}
      <div className="card">
        <div className="card-body">
          <div className="kanban-wrap">
            <div className="kanban-board">
              {cols.map(col => (
                <div key={col.id} className="kanban-col" style={{ background: col.color }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => onDrop(col.id)}>
                  <div className="kanban-col-header">
                    <span className="kanban-col-title">{col.title}</span>
                    <span className="kanban-col-count">{col.leads.length}</span>
                  </div>
                  {col.leads.length > 0 && <div className="kanban-col-conv">Conversion: {Math.floor(Math.random()*20+20)}%</div>}
                  <div className="kanban-drop-area">
                    {col.leads.map(lead => (
                      <div key={lead.id} className="lead-card"
                        draggable
                        onDragStart={() => onDragStart(lead.id, col.id)}
                        style={{ opacity: dragId === lead.id ? .5 : 1 }}>
                        <div className="lead-card-top">
                          <div>
                            <div className="lead-card-name">{lead.name}</div>
                            <div className="lead-card-grade">{lead.grade}</div>
                          </div>
                          <button className="btn btn-ghost btn-icon"><MoreVertical size={14} /></button>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="lead-card-score" style={{ color: scoreColor(lead.score) }}>
                            <Star size={14} fill="currentColor" /> {lead.score}
                          </div>
                          {lead.inactive >= 3 && <span className="badge badge-red" style={{fontSize:11}}><AlertCircle size={11} /> Inactive</span>}
                        </div>
                        <div className="lead-card-meta"><User size={11} />{lead.counselor}</div>
                        <div className="lead-card-meta"><Clock size={11} />{lead.last}</div>
                        {lead.tags.length > 0 && (
                          <div className="lead-card-tags">
                            {lead.tags.map((t,i)=><span key={i} className="lead-tag">{t}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                    {col.leads.length === 0 && <div className="kanban-empty">Drop leads here</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Configure Modal */}
      {showConfig && (
        <div className="modal-backdrop" onClick={() => setShowConfig(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Configure Pipeline Stages</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowConfig(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize:14, color:"var(--gray-500)", marginBottom:16 }}>Customize your admission pipeline stages</p>
              <div className="form-group mb-4">
                <label className="form-label">Stage Name</label>
                <input className="form-input" placeholder="Enter stage name" />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Stage Color</label>
                <div className="flex gap-2">
                  {["#f0f4f8","#eff6ff","#f0fdf4","#faf5ff","#fff7ed"].map(c=>(
                    <div key={c} style={{ width:40, height:40, background:c, border:"2px solid var(--gray-300)", borderRadius:"var(--r)", cursor:"pointer" }} />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button className="btn btn-outline" onClick={() => setShowConfig(false)}>Cancel</button>
                <button className="btn btn-primary">Save Stage</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}