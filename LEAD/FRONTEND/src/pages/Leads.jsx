import React, { useState, useEffect } from 'react'
import { leadsAPI } from '../services/api' // adjust path if needed
import './Leads.css'
import { useSearchParams, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const API_URL = import.meta.env.VITE_API_URL;
const statusMapUIToBackend = {
  New: "new",
  Qualified: "qualified",
  Enrolled: "converted",
  Lost: "lost",
};

const calculateLeadScore = (lead) => {
  let score = 0;

  if (lead.fatherPhone) score += 20;
  if (lead.fatherEmail) score += 20;
  if (lead.grade) score += 20;
  if (lead.source) score += 20;
  if (lead.notes) score += 20;

  return score;
};

const mapLead = (lead) => ({
  id: lead.id,

  name: lead.name || "N/A",

  parent: lead.counselor || "N/A",

  phone: lead.phone || "N/A",

  email: lead.email || "N/A",

  grade: lead.grade || "N/A",

  source: lead.source || "Unknown",

  status: lead.status || "new",

  assignedTo: lead.counselor || "Unassigned",

  score: calculateLeadScore(lead),

  lastContact:
    lead.lastContact
      ? new Date(lead.lastContact).toLocaleDateString()
      : "N/A",
});

const mapStatus = (status) => {
  const map = {
    new: "New",
    qualified: "Qualified",
    converted: "Enrolled",
    lost: "Lost",
  };

  return map[status] || "New";
};

const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

const formatDate = (date) =>
  new Date(date).toLocaleDateString();

const statusMap = { New: 'badge-blue', Qualified: 'badge-green', Enrolled: 'badge-green', Lost: 'badge-red' }
const scoreColor = s => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444'

export default function Leads() {
  const [viewMode, setViewMode] = useState('grid')
  const [leadsData, setLeadsData] = useState([]);
  const [users, setUsers] = useState([]);
  const [communicationHistory, setCommunicationHistory] = useState({});
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ status: 'All Statuses', source: 'All Sources', tag: 'All Tags', counselor: 'All Counselors', date: 'All Time' })
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    qualified: 0,
    converted: 0,
  })
  const filtered = leadsData;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedLeadId = searchParams.get("leadId");
  console.log("SELECTED LEAD:", selectedLeadId);
    useEffect(() => {
    if (selectedLeadId) {
      setTimeout(() => {
        document
          .getElementById(`lead-${selectedLeadId}`)
          ?.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
      }, 500);
    }
  }, [selectedLeadId, leadsData]);
  const newLeads = leadsData.filter(l => l.status === "New").length;
  const qualifiedLeads = leadsData.filter(l => l.status === "Qualified").length;
  const enrolledLeads = leadsData.filter(l => l.status === "Enrolled").length;
  const statCards = [
    { label: 'Total Leads', value: stats?.total || 0, color: '#3b82f6', bg: '#eff6ff', Icon: UsersIcon },
    { label: 'New Leads', value: stats?.new || 0, color: '#10b981', bg: '#d1fae5', Icon: TrendIcon },
    { label: 'Qualified Leads', value: stats?.qualified || 0, color: '#f59e0b', bg: '#fef3c7', Icon: FireIcon },
    { label: 'Enrolled', value: stats?.converted || 0, color: '#8b5cf6', bg: '#f5f3ff', Icon: TargetIcon },
  ];
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const fetchHistory = async (leadId) => {
    try {
      const token = localStorage.getItem("authToken");

      const res = await fetch(
        `${API_URL}/communications/history/${leadId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      setCommunicationHistory((prev) => ({
        ...prev,
        [leadId]: data.data?.communications || [],
      }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchLeads = async () => {
      try {
      const apiFilters = {};
      if (search.trim()) {
        apiFilters.search = search;
      }

      if (filters.status !== "All Statuses") {
          apiFilters.status =
              statusMapUIToBackend[filters.status];
      }

      if (filters.source !== "All Sources") {
          apiFilters.source = filters.source;
      }

      if (filters.counselor !== "All Counselors") {

          const selectedUser = users.find(
              user => user.name === filters.counselor
          );

          if (selectedUser) {
              apiFilters.counselor = selectedUser.id;
          }
      }

      if (filters.date !== "All Time") {
          apiFilters.date = filters.date;
      }

        const res = await leadsAPI.getAll({
          ...apiFilters,
          page,
          limit: 6, // you can change later
        });
          console.log("API FULL RESPONSE:", res);
        const data = res.data || [];
        const pages = res.pagination?.totalPages || 1;
          console.log("API FULL RESPONSE:", res);

        setLeadsData(data.map(mapLead));
        console.log("RAW LEAD FROM API:", data[0]);
        setTotalPages(pages);

        data.forEach((lead) => {
          fetchHistory(lead.id);
        });

      } catch (err) {
        console.error("Error fetching leads:", err);
      }
    };
    

    fetchLeads();
  }, [filters, page, search]); // 🔥 THIS IS THE FIX


  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await leadsAPI.getStats();
        console.log("STATS RESPONSE:", res);

        setStats(res.data || {});
      } catch (err) {
        console.error("Stats error:", err);
      }
    };

    fetchStats();
  }, []);
    

useEffect(() => {
  const token = localStorage.getItem("authToken");

  fetch(`${API_URL}/users`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      setUsers(data.data || []);
    })
    .catch(console.error);
}, []);

const handleAssignLead = async (leadId, userId) => {
  try {
    const token = localStorage.getItem("authToken");

    await fetch(`${API_URL}/leads/${leadId}/assign`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        assignedTo: Number(userId)
      })
    });

    setLeadsData(prev =>
      prev.map(lead =>
        lead.id === leadId
          ? {
              ...lead,
              assignedTo: Number(userId),
              counselor:
                users.find(u => u.id === Number(userId))?.name ||
                lead.counselor
            }
          : lead
      )
    );
  } catch (err) {
    console.error(err);
  }
};

const exportToExcel = async () => {

    try {

        const res = await leadsAPI.getAll({
            limit: 100000
        });

        const data = res.data.map(lead => ({
            Name: lead.name,
            Phone: lead.phone,
            Email: lead.email,
            Grade: lead.grade,
            Source: lead.source,
            Status: lead.status,
            Counselor: lead.counselor
        }));

        const worksheet =
            XLSX.utils.json_to_sheet(data);

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Leads"
        );

        const excelBuffer =
            XLSX.write(workbook,{
                bookType:"xlsx",
                type:"array"
            });

        const blob =
            new Blob(
                [excelBuffer],
                {
                    type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                }
            );

        saveAs(blob,"Leads.xlsx");

    } catch(err){

        console.error(err);

    }

};

return (
    <div className="leads-page">
      <div className="leads-page-header">
        <div>
          <h1 className="page-title">Leads Management</h1>
          <p className="page-sub">Track and manage school admission inquiries</p>
        </div>
        <div className="view-toggle">
          <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}><GridIcon /></button>
          <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><ListIcon /></button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="leads-stats">
        {statCards.map((c, i) => (
          <div key={i} className="lead-stat-card">
            <div className="lsc-icon" style={{ background: c.bg, color: c.color }}><c.Icon /></div>
            <div className={`lsc-delta ${c.pos ? 'pos' : 'neg'}`}>{c.delta}</div>
            <div className="lsc-label">{c.label}</div>
            <div className="lsc-value" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="leads-filter-bar">
        <div className="filter-toprow">
          <span className="filter-heading"><FilterIcon /> Filters</span>
          <button className="export-btn" onClick={exportToExcel}><DownloadIcon /> Export</button>
        </div>
        <div className="filter-controls">
          {[
            { label: 'Status', key: 'status', opts: ['All Statuses', 'New', 'Qualified', 'Enrolled', 'Lost'] },            { label: 'Source', key: 'source', opts: ['All Sources', 'Website', 'Referral', 'Walk-in', 'Ads'] },
            { label: 'Tag', key: 'tag', opts: ['All Tags'] },
            { label: 'Counselor', key: 'counselor', opts: ['All Counselors', ...users.map(user => user.name)] },
            { label: 'Date Range', key: 'date', opts: ['All Time', 'This Week', 'This Month'] },
          ].map(f => (
            <div key={f.key} className="filt-group">
              <label className="filt-label">{f.label}</label>
              <select className="filt-select" value={filters[f.key]} onChange={e => {
                  setPage(1); // 🔥 reset page
                  setFilters({ ...filters, [f.key]: e.target.value });
                }}>
                {f.opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div className="filt-group">
            <label className="filt-label">Search</label>
            <input className="filt-search" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="leads-grid">
          {filtered.map(lead=> ( <div id={`lead-${lead.id}`} key={lead.id} className="lead-card-full" onClick={()=>navigate(`/leads/${lead.id}`)} style={{cursor:"pointer",border:lead.id===Number(selectedLeadId)?"3px solid #10b981":""}}>
              <div className="lcf-header">
                <span className="lcf-name">{lead.name}</span>
                <span className="lcf-score" style={{ color: scoreColor(lead.score) }}>{lead.score}</span>
                <button className="lcf-more">⋮</button>
              </div>
              <div className="lcf-grade"><GradeIcon /> {lead.grade}</div>
              <div className="lcf-parent-label">Parent: {lead.parent}</div>
              <div className="lcf-divider" />
              <div className="lcf-contact">
                <div className="lcf-row"><PhoneIconSm />{lead.phone}</div>
                <div className="lcf-row"><MailIconSm />{lead.email}</div>
                <div className="lcf-row"><span className="src-dot" style={{ background: lead.sourceColor }} />{lead.source}</div>
                <div className="lcf-row"><UserIconSm />{lead.counselor}</div>
              </div>
              <div
                style={{
                  marginTop: "10px",
                  borderTop: "1px solid #eee",
                  paddingTop: "10px",
                }}
              >
                <strong>Communication History</strong>

                {(communicationHistory[lead.id] || []).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      fontSize: "12px",
                      marginTop: "5px",
                    }}
                  >
                  <strong>{(item.channel || "Unknown").toUpperCase()}</strong>

                  <br />

                  <div>
                    <strong>{item.subject || item.channel}</strong>

                    <div>
                      {item.message?.slice(0, 50)}
                    </div>

                    <small>
                      {new Date(item.created_at).toLocaleDateString()}
                    </small>
                  </div>

                  <br />

                  <small>
                    {new Date(item.created_at).toLocaleString()}
                  </small>                  </div>
                ))}
              </div>
              <div className="lcf-footer">
                <span className="lcf-time"><ClockIconSm />Last: {lead.lastContact}</span>
                <span className={`badge ${statusMap[lead.status] || 'badge-gray'}`}>{lead.status}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="leads-table-wrap">
          <table className="leads-table">
            <thead><tr>
              <th>Student / Parent</th><th>Grade</th><th>Contact</th>
              <th>Source</th><th>Status</th><th>Counselor</th><th>Score</th><th>Last Contact</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.map(lead => (
                <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} style={{ cursor: "pointer" }}>
                  <td>
                    <div className="lead-name-cell">
                      <div className="lead-avatar">{(lead.name || "L")[0]}</div>
                      <div><div className="lead-table-name">{lead.name}</div><div className="lead-table-parent">{lead.parent}</div></div>
                    </div>
                  </td>
                  <td><span className="badge badge-gray">{lead.grade}</span></td>
                  <td><div style={{ fontSize: 12 }}>{lead.phone}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lead.email}</div></td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><span className="src-dot" style={{ background: lead.sourceColor }} />{lead.source}</div></td>
                  <td><span className={`badge ${statusMap[lead.status] || 'badge-gray'}`}>{lead.status}</span></td>
                  <td><select value={lead.assignedTo||""} onChange={e=>handleAssignLead(lead.id,e.target.value)} style={{padding:"4px 8px",border:"1px solid #ddd",borderRadius:"6px",fontSize:"12px"}}>{users.map(user=><option key={user.id} value={user.id}>{user.name}</option>)}</select></td>
                  <td><span style={{ fontWeight: 700, fontSize: 13, color: scoreColor(lead.score), fontFamily: 'var(--font-display)' }}>{lead.score}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lead.lastContact}</td>
                  <td><button className="lead-action-btn">⋮</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        {/* Pagination */}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 10 }}>
          <button
            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            disabled={page === 1}
          >
            Prev
          </button>

          <span>Page {page} of {totalPages}</span>

          <button
            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>

    </div>
  )
}

function UsersIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function TrendIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> }
function FireIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 6-8 8-8 14a8 8 0 0 0 16 0c0-6-8-8-8-14z"/></svg> }
function ClockIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function TargetIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> }
function TimerIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function FilterIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> }
function DownloadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function GridIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> }
function ListIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> }
function GradeIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> }
function PhoneIconSm() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.48 2 2 0 0 1 3.61 1.3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.94a16 16 0 0 0 6.06 6.06l.94-1.02a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/></svg> }
function MailIconSm() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
function UserIconSm() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function ClockIconSm() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
