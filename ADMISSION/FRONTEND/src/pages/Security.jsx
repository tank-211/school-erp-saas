import { useState } from "react";
import { Shield, Users, FileText, Lock, Key, AlertTriangle } from "lucide-react";
import "../style.css";

const roles = [
  { id:1, name:"Super Admin",       users:2, permissions:"Full Access"          },
  { id:2, name:"Admission Officer", users:5, permissions:"Manage Applications"  },
  { id:3, name:"Counselor",         users:8, permissions:"Manage Leads"         },
  { id:4, name:"Finance",           users:3, permissions:"View Payments"        },
];
const logs = [
  { id:1, user:"Admin",        action:"Application Approved",  time:"2 hours ago", ip:"192.168.1.1"  },
  { id:2, user:"Priya Sharma", action:"Lead Status Updated",   time:"5 hours ago", ip:"192.168.1.5"  },
  { id:3, user:"Finance Team", action:"Payment Recorded",      time:"1 day ago",   ip:"192.168.1.10" },
];

export function Security() {
  const [twoFA, setTwoFA]     = useState(true);
  const [session, setSession] = useState(true);

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Security & Compliance</h1><p className="page-sub">Manage roles, permissions, and audit logs</p></div>
      </div>

      <div className="grid-4 mb-5">
        {[
          { label:"Total Users",  value:"18",    icon:Users,    color:"var(--blue-bg)",   ic:"var(--blue)"   },
          { label:"Active Roles", value:"4",     icon:Shield,   color:"var(--green-bg)",  ic:"var(--green)"  },
          { label:"Audit Logs",   value:"1,234", icon:FileText, color:"var(--purple-bg)", ic:"var(--purple)" },
          { label:"2FA Enabled",  value:"15",    icon:Lock,     color:"var(--orange-bg)", ic:"var(--orange)" },
        ].map((s,i)=>{const Icon=s.icon;return(
          <div className="stat-card" key={i}>
            <div className="stat-wide">
              <div className="stat-icon" style={{background:s.color}}><Icon size={20} style={{color:s.ic}}/></div>
              <div><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div></div>
            </div>
          </div>
        );})}
      </div>

      <div className="grid-2 mb-5">
        {/* Role Management */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Role Management</div>
            <button className="btn btn-primary btn-sm">Add Role</button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Role Name</th><th>Users</th><th>Permissions</th><th>Actions</th></tr></thead>
              <tbody>
                {roles.map(r=>(
                  <tr key={r.id}>
                    <td className="td-bold">{r.name}</td>
                    <td><span className="badge badge-gray">{r.users}</span></td>
                    <td style={{fontSize:13,color:"var(--gray-500)"}}>{r.permissions}</td>
                    <td><button className="btn btn-ghost btn-sm">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Settings */}
        <div className="card">
          <div className="card-header"><div className="card-title">Security Settings</div></div>
          <div className="card-body">
            <div className="security-setting-row">
              <div className="security-setting-info">
                <Key size={18} className="security-setting-icon"/>
                <div>
                  <div className="security-setting-name">Two-Factor Authentication</div>
                  <div className="security-setting-desc">Require 2FA for all users</div>
                </div>
              </div>
              <label className="toggle"><input type="checkbox" checked={twoFA} onChange={e=>setTwoFA(e.target.checked)}/><span className="toggle-slider"/></label>
            </div>
            <div className="security-setting-row">
              <div className="security-setting-info">
                <Lock size={18} className="security-setting-icon"/>
                <div>
                  <div className="security-setting-name">Data Encryption</div>
                  <div className="security-setting-desc">Encrypt sensitive data at rest</div>
                </div>
              </div>
              <span className="badge badge-green">Active</span>
            </div>
            <div className="security-setting-row">
              <div className="security-setting-info">
                <AlertTriangle size={18} className="security-setting-icon"/>
                <div>
                  <div className="security-setting-name">Session Timeout</div>
                  <div className="security-setting-desc">Auto logout after 30 minutes</div>
                </div>
              </div>
              <label className="toggle"><input type="checkbox" checked={session} onChange={e=>setSession(e.target.checked)}/><span className="toggle-slider"/></label>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="card">
        <div className="card-header"><div className="card-title">Audit Logs</div></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>User</th><th>Action</th><th>Timestamp</th><th>IP Address</th></tr></thead>
            <tbody>
              {logs.map(l=>(
                <tr key={l.id}>
                  <td className="td-bold">{l.user}</td>
                  <td>{l.action}</td>
                  <td style={{fontSize:13,color:"var(--gray-500)"}}>{l.time}</td>
                  <td className="td-mono">{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}