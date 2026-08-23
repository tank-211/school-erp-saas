import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import './Tasks.css'
import { taskAPI, leadAPI, userAPI } from '../services/api'

const priorityClass = { High: 'badge-red', Medium: 'badge-orange', Low: 'badge-blue' }
const typeColor = { Email: '#3b82f6', Call: '#2c5648', Tour: '#8b5cf6', Task: '#f59e0b' }
const statusBorderColor = { completed: '#10b981', overdue: '#ef4444', pending: '#e2e8f0' }

function groupByDate(tasks) {
  const groups = {}
  tasks.forEach(t => {
    if (!groups[t.dueDate]) groups[t.dueDate] = []
    groups[t.dueDate].push(t)
  })
  return Object.entries(groups).sort(([a], [b]) => new Date(a) - new Date(b))
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState("All");
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    followUpDate:" ",
    leadId: "",
    assignedTo: "",
    priority: "Medium",
    status: "pending"
  });
  
    useEffect(() => {
      const fetchData = async () => {
        try {
          // Tasks
        const taskRes = await taskAPI.getTasks();
        console.log("TASKS:", taskRes);

        const formattedTasks = (taskRes.data || []).map(task => ({
          ...task,
          dueDate: task.due_date,
          description: task.task_description,
          leadId: task.lead_id,
          assignedTo: task.assigned_to,
          status: task.is_done ? "completed" : "pending"
        }));

        setTasks(formattedTasks);

          // Leads
          const leadRes = await leadAPI.getLeads();

          console.log("LEADS RESPONSE:", leadRes);
          console.log("FIRST LEAD:", leadRes.data[0]);

          setLeads(leadRes.data || []);

          // Users
          const userRes = await userAPI.getUsers();
          console.log("USERS:", userRes);
          setUsers(userRes.data || []);

        } catch (err) {
          console.error(err);
        }
      };

      fetchData();
    }, []);

  const today = new Date();

  const tasksWithStatus = tasks.map(task => {
    const dueDate = new Date(task.due_date || task.dueDate);

    if (task.is_done) {
      return {
        ...task,
        status: "completed"
      };
    }

    if (dueDate < today) {
      return {
        ...task,
        status: "overdue"
      };
    }

    return {
      ...task,
      status: "pending"
    };
  });

  const filtered =
    filter === "All"
      ? tasksWithStatus
      : filter === "Pending"
      ? tasksWithStatus.filter(t => t.status === "pending")
      : filter === "Overdue"
      ? tasksWithStatus.filter(t => t.status === "overdue")
      : tasksWithStatus.filter(t => t.status === "completed");

  const grouped = groupByDate(filtered)

  const overdueTasks = tasks.filter(
    task =>
      task.status !== "completed" &&
      new Date(task.dueDate) < new Date()
  );
  const todayFollowUps = tasks.filter(task => {
    if (!task.followUpDate) return false;

    return (
      new Date(task.followUpDate).toDateString() ===
      new Date().toDateString()
    );
  });

  const counts = {
    total: tasks.length,
    pending: tasksWithStatus.filter(t => t.status === "pending").length,
    overdue: tasksWithStatus.filter(t => t.status === "overdue").length,
    completed: tasksWithStatus.filter(t => t.status === "completed").length,
  };

  const createTask = async () => {
    try {
      const payload = {
        ...formData,
      };

      await taskAPI.createTask(payload);

      const refreshed = await taskAPI.getTasks();

      const formattedTasks = (refreshed.data || []).map(task => ({
        ...task,
        dueDate: task.due_date,
        description: task.task_description,
        leadId: task.lead_id,
        assignedTo: task.assigned_to,
        status: task.is_done ? "completed" : "pending"
      }));

      setTasks(formattedTasks);

      setShowModal(false);

      setFormData({
        title: "",
        description: "",
        dueDate: "",
        followUpDate: "",
        leadId: "",
        assignedTo: "",
        priority: "Medium",
        status: "pending"
      });

    } catch (err) {
      console.error(err);
      alert("Failed to create task");
    }
  };

  const toggleComplete = (id) => {
    
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t))
  }

  const statCards = [
    { label: 'Total Tasks', value: counts.total, color: '#3b82f6', bg: '#eff6ff', Icon: TaskIcon },
    { label: 'Pending', value: counts.pending, color: '#f59e0b', bg: '#fef3c7', Icon: PendingIcon },
    { label: 'Overdue', value: counts.overdue, color: '#ef4444', bg: '#fee2e2', Icon: OverdueIcon },
    { label: 'Completed', value: counts.completed, color: '#10b981', bg: '#d1fae5', Icon: DoneIcon },
    {label:'Due Today',value:tasks.filter(task=>{const today=new Date().toDateString();return task.dueDate&&new Date(task.dueDate).toDateString()===today&&task.status!=="completed"}).length,color:'#8b5cf6',bg:'#f3e8ff',Icon:ClockSmIcon},
    {label:'Follow Ups',value:tasks.filter(t=>t.followUpDate).length,color:'#06b6d4',bg:'#ecfeff',Icon:ClockSmIcon},
    {label:'Today Follow Ups',value:todayFollowUps.length,color:'#ec4899',bg:'#fdf2f8',Icon:ClockSmIcon}
  ]

  const deleteTask = async (id) => {
    try {
      await taskAPI.deleteTask(id);

      setTasks(tasks.filter(task => task.id !== id));

      alert("Task deleted");
    } catch (err) {
      console.error(err);
    }
  };

  const completeTask = async (task) => {
      console.log("✅ BUTTON CLICKED");
      console.log("Task:", task);
    try {
      const newStatus =
        task.is_done
          ? "pending"
          : "completed";

      await taskAPI.updateStatus(task.id, newStatus);

    const refreshed = await taskAPI.getTasks();

    const formattedTasks = (refreshed.data || []).map(task => ({
      ...task,
      dueDate: task.due_date,
      description: task.task_description,
      leadId: task.lead_id,
      assignedTo: task.assigned_to,
      status: task.is_done ? "completed" : "pending"
    }));

    setTasks(formattedTasks);

    } catch (err) {
      console.error(err);
    }
  };

  const updateTask = async () => {
    try {
      await taskAPI.updateTask(
        editingTask.id,
        formData
      );

    const refreshed = await taskAPI.getTasks();

      setTasks(refreshed.data);

      setShowModal(false);
      setEditingTask(null);

      alert("Task updated");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="tasks-page">
      {/* Header */}
      <div className="tasks-header">
        <div>
          <h1 className="page-title">Tasks &amp; Follow-ups</h1>
          <p className="page-sub">Manage your lead activities and reminders</p>
        </div>
        <button className="btn-primary" onClick={() => {setEditingTask(null);setFormData({title:"",description:"",dueDate:"",leadId:"",assignedTo:"",priority:"Medium",status:"pending"});setShowModal(true);}}>+ Add Task</button>
            {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              width: "600px",
              maxWidth: "90%"
            }}
          >
          <h3>{editingTask ? "Edit Task" : "Create Task"}</h3>
          
          <input
            type="text"
            placeholder="Task Title"
            value={formData.title}
            onChange={(e) =>
              setFormData({
                ...formData,
                title: e.target.value
              })
            }
            className="task-input"
          />

          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({
                ...formData,
                description: e.target.value
              })
            }
            className="task-input"
            rows="3"
          />

          <input
            type="datetime-local"
            value={formData.dueDate}
            onChange={(e) =>
              setFormData({
                ...formData,
                dueDate: e.target.value
              })
            }
            className="task-input"
          />

          <input
            type="date"
            value={formData.followUpDate || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                followUpDate: e.target.value
              })
            }
            className="task-input"
          />

          <select
            value={formData.priority}
            onChange={(e) =>
              setFormData({
                ...formData,
                priority: e.target.value
              })
            }
            className="task-input"
          >
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority</option>
          </select>

          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({
                ...formData,
                status: e.target.value
              })
            }
            className="task-input"
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>

          <select
            className="task-input"
            value={formData.leadId}
            style={{ color: "black", background: "white" }}
            onChange={(e) =>
              setFormData({
                ...formData,
                leadId: e.target.value
              })
            }
          >
            <option value="">Select Lead</option>

            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.studentFirstName} {lead.studentLastName}
              </option>
            ))}
          </select>

          <select
            className="task-input"
            value={formData.assignedTo}
            onChange={(e) =>
              setFormData({
                ...formData,
                assignedTo: e.target.value
              })
            }
          >
            <option value="">Assign User</option>

            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
            <button onClick={editingTask ? updateTask : createTask} style={{background:"#10b981",color:"white",border:"none",padding:"12px 20px",borderRadius:"10px",fontWeight:"600",cursor:"pointer",marginTop:"15px",marginRight:"10px"}}>{editingTask ? "✅ Update Task" : "➕ Create Task"}</button>
            <button onClick={() => setShowModal(false)} style={{background:"#6b7280",color:"white",border:"none",padding:"12px 20px",borderRadius:"10px",fontWeight:"600",cursor:"pointer",marginTop:"15px"}}>Close</button>
          </div>
        </div>
      )} 
      </div>

      {/* Stat Cards */}
      <div className="tasks-stats">
        {statCards.map((c, i) => (
          <div key={i} className="task-stat-card">
            <div className="tsc-icon" style={{ background: c.bg, color: c.color }}><c.Icon /></div>
            <div className="tsc-label">{c.label}</div>
            <div className="tsc-value">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="tasks-filter-row">
        <FilterIcon />
        {['All', 'Pending', 'Overdue', 'Completed'].map(f => (
          <button key={f} className={`task-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {/* Grouped Task List */}
      <div className="task-groups">
        {grouped.map(([date, dayTasks]) => (
          <div key={date} className="task-group">
            <div className="task-group-header">
              <CalendarIcon />
              <span className="task-group-date">{formatDate(date)}</span>
              <span className="task-group-count">({dayTasks.length} task{dayTasks.length > 1 ? 's' : ''})</span>
            </div>
            {dayTasks.map(task => (
              <div key={task.id} className="task-row" style={{ borderLeftColor: task.status !== "completed" && new Date(task.dueDate) < new Date() ? "#ef4444" : statusBorderColor[task.status] }}>
                <button className={`task-check ${task.status === 'completed' ? 'done' : ''}`} onClick={() => completeTask(task)}>
                  {task.status === 'completed' && <CheckIcon />}
                </button>
                <div className="task-body">
                  <div className={`task-title ${task.status === 'completed' ? 'struck' : ''}`}>{task.title}</div>
                 <div className="task-desc">
                    {task.task_description}
                  </div>

                  <span className="task-meta-item">
                    <UserSmIcon />
                    {task.assignedUser?.name}
                  </span>
                  <div className="task-meta-row">
                    <span className="task-type-badge" style={{ background: typeColor[task.type] + '20', color: typeColor[task.type] }}>{task.type}</span>
                    <span className="task-meta-item"><UserSmIcon />{task.assignedUser?.name}</span>
                    <span className="task-meta-item"><ClockSmIcon/>Due:{new Date(task.dueDate).toLocaleDateString()}</span>{task.followUpDate&&<span className="task-meta-item">📞 Follow-up:{new Date(task.followUpDate).toLocaleDateString()}</span>}
                    <span className={`badge ${priorityClass[task.priority]}`}>{task.priority} Priority</span>
                    <span className={`priority-badge ${task.priority?.toLowerCase()}`}>{task.priority}</span>
                    <span className={`task-status ${task.status}`}>{task.status}</span>
                    <button className="followup-btn" onClick={() => navigate(`/tasks/new?leadId=${task.leadId}`)}>+ Add Follow Up</button>
                  </div>
                </div>
                <div className="task-right">
                  <button className="task-flag-btn" style={{ color: task.status === 'overdue' ? '#ef4444' : '#94a3b8' }}><FlagIcon /></button>
                  <button className="task-lead-link" onClick={() => navigate(`/leads?leadId=${task.leadId}`)} style={{background:"none",border:"none",color:"#10b981",cursor:"pointer"}}>View Lead: {task.lead?.studentFirstName}{" "}{task.lead?.studentLastName} →</button>
                  <button onClick={() => deleteTask(task.id)} style={{background:"#ef4444",color:"white",border:"none",padding:"8px 12px",borderRadius:"6px",cursor:"pointer"}}>Delete</button>
                  <button onClick={() => {setEditingTask(task);setFormData({title:task.title,description:task.task_description||"",dueDate:task.dueDate?.split("T")[0],priority:task.priority,status:task.status,leadId:task.leadId,assignedTo:task.assignedTo});setShowModal(true);}} style={{background:"#3b82f6",color:"white",border:"none",padding:"8px 14px",borderRadius:"8px",cursor:"pointer",fontWeight:"600",marginRight:"8px"}}>✏ Edit</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function TaskIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 11 12 14 22 4"/></svg> }
function PendingIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function OverdueIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> }
function DoneIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> }
function FilterIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> }
function CalendarIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function CheckIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> }
function UserSmIcon() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function ClockSmIcon() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function FlagIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> }
