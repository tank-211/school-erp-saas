import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Plus, RefreshCw } from 'lucide-react';
import { getToken } from '../utils/authToken.js';
import '../style.css';

const API = '/api/admission-tasks';
const emptyForm = { title: '', task_description: '', priority: 'medium', due_date: '', related_entity_type: '', related_entity_id: '' };

export function AdmissionTasks() {
  const [params] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, related_entity_type: params.get('entityType') || '', related_entity_id: params.get('entityId') || '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(API, { headers: { Authorization: `Bearer ${getToken()}` } });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.message || 'Unable to load tasks.');
      setTasks(body.data || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.related_entity_type || !payload.related_entity_id) { delete payload.related_entity_type; delete payload.related_entity_id; }
      const response = await fetch(API, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.message || 'Unable to create task.');
      setForm(emptyForm); await load();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const updateStatus = async (task, status) => {
    try {
      const response = await fetch(`${API}/${task.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.message || 'Unable to update task.');
      await load();
    } catch (e) { setError(e.message); }
  };

  return <div className="page">
    <div className="page-header"><div><h1 className="page-title">Admission Tasks</h1><p className="page-sub">Manage counseling, application, document and enrollment work for your school.</p></div><button className="btn-secondary" onClick={load}><RefreshCw size={16}/> Refresh</button></div>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <form className="card" onSubmit={create}><div className="card-body" style={{ display: 'grid', gap: 12 }}>
        <h3><Plus size={18}/> Create admission task</h3>
        <label className="form-group">Title<input className="form-input" required maxLength={255} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
        <label className="form-group">Description<textarea className="form-input" rows="3" value={form.task_description} onChange={e=>setForm({...form,task_description:e.target.value})}/></label>
        <div className="grid-2"><label className="form-group">Priority<select className="form-select" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><label className="form-group">Due date<input className="form-input" type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></label></div>
        {form.related_entity_type && form.related_entity_id && <p className="page-sub">Linked to {form.related_entity_type} #{form.related_entity_id}</p>}
        <button className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Task'}</button>
      </div></form>
      <section className="card"><div className="card-body"><h3>Task list</h3>{loading ? <p>Loading tasks…</p> : tasks.length === 0 ? <p>No admission tasks yet.</p> : <div style={{ display:'grid', gap:12 }}>{tasks.map(task=><article key={task.id} style={{ border:'1px solid var(--gray-200)', borderRadius:10, padding:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}><strong>{task.title}</strong><span className="badge badge-gray">{task.priority}</span></div>
        {task.task_description && <p>{task.task_description}</p>}
        <small>{task.due_date ? `Due ${new Date(task.due_date).toLocaleDateString()}` : 'No due date'} · {task.related_entity_type ? ` ${task.related_entity_type} #${task.related_entity_id}` : 'General task'}</small>
        <div style={{ display:'flex', gap:8, marginTop:10, alignItems:'center' }}><span className="badge badge-gray">{task.status || (task.is_done ? 'completed' : 'pending')}</span>{task.status !== 'completed' && <button className="btn-secondary" onClick={()=>updateStatus(task,'completed')}><CheckCircle2 size={15}/> Mark complete</button>}</div>
      </article>)}</div>}</div></section>
    </div>
  </div>;
}
