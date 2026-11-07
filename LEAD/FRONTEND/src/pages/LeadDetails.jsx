import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./LeadDetails.css";
import { communicationAPI, leadsAPI } from "../services/api";
import { MessageSquare, CheckSquare } from "lucide-react";
const API_URL = import.meta.env.VITE_API_URL;

// Stages a lead can be moved to; the values are statuses PUT /leads/:id accepts
const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Admitted" },
  { value: "lost", label: "Lost" },
];
// Older status words for the same stage (STATUS_GROUPS in the backend leadService)
const STATUS_ALIAS = { pending: "new", interested: "qualified", admitted: "converted", inactive: "lost", "not-interested": "lost" };

// Backend message plus any field errors from its validator
const describeError = (data, fallback) => {
  const fields = Object.values(data?.errors || {});
  if (fields.length) return `${data.message || fallback}: ${fields.join("; ")}`;
  return data?.message || fallback;
};
export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [application, setApplication] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [note, setNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    setLead(null);
    setLoadError("");
    fetchLead();
    // Load the lead's communication history through the shared authenticated API client.
    let active = true;
    communicationAPI.getHistory(id, { limit: 100 })
      .then((res) => {
        if (active) setMessages(res.data?.communications || []);
      })
      .catch(() => {
        if (active) setMessages([]);
      });
    return () => { active = false; };
  }, [id]);

  const fetchLead = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const res = await fetch(
      `${API_URL}/leads/${id}/details`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.data) {
        setLead(null);
        setLoadError(res.ok || res.status === 404 ? "Lead not found" : data.message || "Could not load the lead");
        return;
      }

      setLoadError("");
      setLead(data.data);
      setTasks(data.data.tasks || []);
      setApplication(data.data.application || []);
    } catch (err) {
      console.error(err);
      setLoadError(err.message || "Could not load the lead");
    }
  };

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  });

  const changeStatus = async (status) => {
    setStatusError("");
    setStatusSaving(true);
    try {
      const res = await fetch(`${API_URL}/leads/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(describeError(data, "Could not update the status"));
      }
      // Reload so the status and the timeline show what was saved
      await fetchLead();
    } catch (err) {
      setStatusError(err.message || "Could not update the status");
    } finally {
      setStatusSaving(false);
    }
  };

  const addNote = async () => {
    const text = note.trim();
    if (!text) {
      setNoteError("Please type a note first");
      return;
    }
    setNoteError("");
    setNoteSaving(true);
    try {
      const res = await fetch(`${API_URL}/activities`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ leadId: id, type: "note", note: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(describeError(data, "Could not save the note"));
      }
      setNote("");
      await fetchLead();
    } catch (err) {
      setNoteError(err.message || "Could not save the note");
    } finally {
      setNoteSaving(false);
    }
  };

  const openEdit = () => {
    const details = Object.fromEntries(String(lead.notes || "").split(/\r?\n/).map((line) => {
      const index = line.indexOf(":");
      return index < 0 ? null : [line.slice(0,index).trim(),line.slice(index+1).trim()];
    }).filter(Boolean));
    const parent = (value) => { const p=String(value||"").split(",").map(x=>x.trim()); return {name:p[0]||"",occupation:p[1]||"",company:p.slice(2).join(", ")}; };
    const father=parent(details.Father), mother=parent(details.Mother);
    const keys=new Set(["Father","Mother","Mother phone","Mother email","Current school","Date of birth","Gender"]);
    setEditForm({studentFirstName:lead.first_name||"",studentLastName:lead.last_name||"",grade:lead.desired_class||"",dob:details["Date of birth"]||"",gender:details.Gender||"",currentSchool:details["Current school"]||"",fatherName:father.name,fatherOccupation:father.occupation,fatherCompany:father.company,fatherPhone:lead.phone||"",fatherEmail:lead.email||"",motherName:mother.name,motherOccupation:mother.occupation,motherCompany:mother.company,motherPhone:details["Mother phone"]||"",motherEmail:details["Mother email"]||"",source:lead.source||"",notes:String(lead.notes||"").split(/\r?\n/).filter(line=>!keys.has(line.includes(":")?line.slice(0,line.indexOf(":")).trim():"")).join("\n").trim()});
    setEditError(""); setEditOpen(true);
  };
  const saveEdit = async (event) => { event.preventDefault(); setEditSaving(true); setEditError(""); try { const result=await leadsAPI.update(id,editForm); if(result?.success===false) throw new Error(result.message||"Could not save lead"); await fetchLead(); setEditOpen(false); } catch(error) { setEditError(error.message||"Could not save lead"); } finally { setEditSaving(false); } };

  const ACTIVITY_LABEL = {
    LEAD_CREATED: "Lead created",
    LEAD_UPDATED: "Lead updated",
    LEAD_ASSIGNED: "Lead assigned",
    STAGE_CHANGED: "Stage changed",
    note: "Note",
  };
  // Messages already appear from the communication log; skip their duplicate activity rows
  const MESSAGE_TYPES = new Set(["email", "sms", "whatsapp", "call"]);

  const timeline = [
    ...(lead?.tasks || []).map(task => ({
      type: "task",
      title: `Task: ${task.title}`,
      date: task.created_at || task.createdAt,
    })),

    ...(lead?.lead_activity || [])
      .filter(activity => !MESSAGE_TYPES.has(String(activity.activity_type).toLowerCase()))
      .map(activity => ({
        type: "activity",
        title: [ACTIVITY_LABEL[activity.activity_type] || activity.activity_type, activity.notes].filter(Boolean).join(": "),
        date: activity.created_at,
      })),

    ...messages.map(m => ({
      type: m.channel,
      title: `${String(m.channel || "message").toUpperCase()}${m.subject ? `: ${m.subject}` : m.message ? `: ${m.message.slice(0, 60)}` : ""} (${m.status})`,
      date: m.created_at,
    })),
  ].filter(item => item.date).sort((a, b) => new Date(b.date) - new Date(a.date));



if (!lead) {
  return <div className="lead-details-container">{loadError || "Loading..."}</div>;
}

    const currentStatus = String(lead.follow_up_status || "").toLowerCase();
    const statusValue = STATUS_ALIAS[currentStatus] || currentStatus;
    // "5" -> "Grade 5"; "Grade 5" and "LKG" are shown as they are
    const gradeLabel = /^\d+$/.test(String(lead.desired_class || "").trim())
      ? `Grade ${lead.desired_class}`
      : lead.desired_class || "";

    const createApplication = async () => {
      try {
        const token = localStorage.getItem("authToken");

        const res = await fetch(
          `${API_URL}/applications/from-lead/${lead.id}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to create application");
        }

        console.log("APPLICATION CREATED:", data);

        // Refresh lead details so the new application appears
        await fetchLead();

      } catch (error) {
        console.error("CREATE APPLICATION ERROR:", error);
        alert(error.message);
      }
    };



 return (
  <div className="lead-details-page">
  {editOpen && <div className="lead-edit-overlay"><form className="lead-edit-modal" onSubmit={saveEdit}><div className="lead-edit-heading"><h2>Edit Lead</h2><button type="button" onClick={()=>setEditOpen(false)} aria-label="Close">×</button></div><div className="lead-edit-grid">{[["Student first name","studentFirstName"],["Student last name","studentLastName"],["Grade / Course","grade"],["Date of birth","dob","date"],["Current school","currentSchool"],["Gender","gender","gender"],["Father name","fatherName"],["Father occupation","fatherOccupation"],["Father company","fatherCompany"],["Father phone","fatherPhone"],["Father email","fatherEmail","email"],["Mother name","motherName"],["Mother occupation","motherOccupation"],["Mother company","motherCompany"],["Mother phone","motherPhone"],["Mother email","motherEmail","email"],["Lead source","source"]].map(([label,key,type])=><label className="lead-edit-field" key={key}>{label}{type==="gender"?<select value={editForm[key]||""} onChange={e=>setEditForm(v=>({...v,[key]:e.target.value}))}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select>:<input type={type||"text"} value={editForm[key]||""} onChange={e=>setEditForm(v=>({...v,[key]:e.target.value}))}/>}</label>)}</div><label className="lead-edit-field">Notes<textarea rows={4} value={editForm.notes||""} onChange={e=>setEditForm(v=>({...v,notes:e.target.value}))}/></label>{editError&&<p role="alert" className="lead-edit-error">{editError}</p>}<div className="lead-edit-actions"><button type="button" className="btn-secondary" disabled={editSaving} onClick={()=>setEditOpen(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={editSaving}>{editSaving?"Saving...":"Save changes"}</button></div></form></div>}

  <div className="lead-details-header">
    <div>
      <div className="lead-details-name">
        {lead.first_name} {lead.last_name}
      </div>

      <div className="lead-details-grade">
        {gradeLabel}
      </div>
    </div>

    <div className="lead-header-actions"><button type="button" className="btn-primary" onClick={openEdit}>Edit Lead</button><div style={{ textAlign: "right" }}>
      <select
        className="lead-status"
        aria-label="Lead status"
        style={{ border: "none", cursor: "pointer" }}
        value={statusValue}
        disabled={statusSaving}
        onChange={(e) => changeStatus(e.target.value)}
      >
        {!STATUS_OPTIONS.some((o) => o.value === statusValue) && (
          <option value={statusValue}>{lead.follow_up_status || "No status"}</option>
        )}
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {statusSaving && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Saving...</div>}
      {statusError && <div role="alert" style={{ fontSize: 12, color: "#b91c1c", marginTop: 4 }}>{statusError}</div>}
    </div></div>
  </div>

  <div className="lead-context-actions" aria-label="Lead actions">
    <button type="button" className="lead-context-btn" onClick={() => navigate(`/communication?leadId=${encodeURIComponent(id)}`)}><MessageSquare size={16} /> Communication</button>
    <button type="button" className="lead-context-btn" onClick={() => navigate(`/tasks?leadId=${encodeURIComponent(id)}`)}><CheckSquare size={16} /> Create Task</button>
  </div>

  <div className="lead-details-grid">

    <div className="lead-details-card">
          <h3>Parent Information</h3>

          <div className="detail-row">
            <span className="detail-label">Phone</span>
            <span className="detail-value">{lead.phone}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Email</span>
            <span className="detail-value">{lead.email}</span>
          </div>
        </div>

        <div className="lead-details-card">
          <h3>Notes &amp; Family Details</h3>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 14, color: "#334155" }}>
            {lead.notes || "No notes yet."}
          </div>
        </div>

        <div className="lead-details-card">
          <h3>Lead Information</h3>

          <div className="detail-row">
            <span className="detail-label">Source</span>
            <span className="detail-value">{lead.source || "N/A"}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Created</span>
            <span className="detail-value">
              {new Date(lead.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

      </div>

      <div className="lead-details-card">
      <h3>Application</h3>

      {application.length === 0 ? (
        <>
          <p>No application created.</p>

          <button
            className="btn-primary"
            onClick={createApplication}
          >
            Create Application
          </button>
        </>
      ) : (
        <>
          <div className="detail-row">
            <span className="detail-label">Application No</span>
            <span className="detail-value">
              {application[0].application_number}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="detail-value">
              {application[0].status}
            </span>
          </div>

          <button
            className="app-open-btn"
            onClick={() => navigate(`/applications/${application[0].id}`)}
            >
            Open Application
          </button>
        </>
      )}
    </div>

  <div className="notes-card">
    <h3>Notes</h3>
    <div className="notes-content">
      {lead.notes || "No notes available"}
    </div>
  </div>

  <div className="lead-details-card">
    <h3>Upcoming Follow Ups</h3>

    {tasks.length === 0 ? (
      <p>No follow ups found</p>
    ) : (
      tasks.map((task) => (
        <div
          key={task.id}
          className="detail-row"
        >
          <span className="detail-label">
            {task.title}
          </span>

          <span className="detail-value">
            {task.due_date
              ? new Date(task.due_date).toLocaleDateString()
              : "-"}
          </span>
        </div>
      ))
    )}
  </div>
<div className="lead-details-card">
  <h3>Add Note</h3>

  <textarea
    rows={3}
    placeholder="What happened with this lead?"
    value={note}
    onChange={(e) => setNote(e.target.value)}
    style={{ width: "100%", padding: 10, border: "1px solid #e2e8f0", borderRadius: 8, fontFamily: "inherit", fontSize: 14 }}
  />
  {noteError && <div role="alert" style={{ fontSize: 13, color: "#b91c1c", marginTop: 6 }}>{noteError}</div>}
  <button
    className="btn-primary"
    style={{ marginTop: 10 }}
    disabled={noteSaving}
    onClick={addNote}
  >
    {noteSaving ? "Saving..." : "Add note"}
  </button>
</div>
<div className="lead-details-card">
  <h3>Timeline</h3>

  {timeline.length === 0 ? (
    <p>No activity found</p>
  ) : (
    timeline.map((item, index) => (
      <div
        key={index}
        className="detail-row"
      >
        <span className="detail-label">
          {item.type === "task" && "📌"}
          {item.type === "email" && "📧"}
          {item.type === "call" && "📞"}
          {item.type === "whatsapp" && "📱"}
          {item.type === "sms" && "💬"}
          {item.type === "activity" && "🆕"}

          {" "}
          {item.title}
        </span>

        <span className="detail-value">
          {new Date(item.date).toLocaleString("en-IN")}
        </span>
      </div>
    ))
  )}
</div>
</div>
);
}