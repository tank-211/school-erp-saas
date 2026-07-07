import { useState } from "react";
import { Bell } from "lucide-react";
import "../style.css";

const themeColors = ["#14b8a6","#3b82f6","#8b5cf6","#ec4899","#f59e0b"];

export function Settings() {
  const [tab, setTab] = useState("general");
  const [autoLead, setAutoLead] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif]   = useState(false);
  const [newLead, setNewLead]     = useState(true);
  const [appSubmit, setAppSubmit] = useState(true);
  const [payRecv, setPayRecv]     = useState(true);
  const [darkMode, setDarkMode]   = useState(false);
  const [selColor, setSelColor]   = useState("#14b8a6");

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">System Settings</h1><p className="page-sub">Configure your admission system</p></div>
      </div>

      <div className="tabs">
        {["general","notifications","email","appearance", "security"].map(t=>(
          <button key={t} className={`tab-btn ${tab===t?"active":""}`} onClick={()=>setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab==="general" && (
        <div className="space-y-4">
          <div className="card">
            <div className="card-header"><div className="card-title">School Information</div></div>
            <div className="card-body">
              <div className="grid-2 gap-3 mb-3">
                <div className="form-group"><label className="form-label">School Name</label><input className="form-input" defaultValue="Sacred Tree International School"/></div>
                <div className="form-group"><label className="form-label">Academic Year</label><input className="form-input" defaultValue="2026-2027"/></div>
                <div className="form-group"><label className="form-label">Contact Email</label><input className="form-input" type="email" defaultValue="admissions@sacredtree.edu"/></div>
                <div className="form-group"><label className="form-label">Contact Phone</label><input className="form-input" defaultValue="+91 98765 43210"/></div>
              </div>
              <button className="btn btn-primary btn-sm">Save Changes</button>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Admission Settings</div></div>
            <div className="card-body">
              <div className="settings-toggle-row">
                <div><div className="settings-toggle-title">Auto Lead Assignment</div><div className="settings-toggle-sub">Automatically assign leads to counselors</div></div>
                <label className="toggle"><input type="checkbox" checked={autoLead} onChange={e=>setAutoLead(e.target.checked)}/><span className="toggle-slider"/></label>
              </div>
              <div className="settings-toggle-row">
                <div><div className="settings-toggle-title">Email Notifications</div><div className="settings-toggle-sub">Send email updates to parents</div></div>
                <label className="toggle"><input type="checkbox" checked={emailNotif} onChange={e=>setEmailNotif(e.target.checked)}/><span className="toggle-slider"/></label>
              </div>
              <div className="settings-toggle-row">
                <div><div className="settings-toggle-title">SMS Notifications</div><div className="settings-toggle-sub">Send SMS updates to parents</div></div>
                <label className="toggle"><input type="checkbox" checked={smsNotif} onChange={e=>setSmsNotif(e.target.checked)}/><span className="toggle-slider"/></label>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab==="notifications" && (
        <div className="card">
          <div className="card-header"><div className="card-title">Notification Preferences</div></div>
          <div className="card-body">
            {[
              { label:"New Lead Notifications",  sub:"Get notified when a new lead is created",      val:newLead,  set:setNewLead  },
              { label:"Application Submitted",   sub:"Notify when applications are submitted",       val:appSubmit,set:setAppSubmit },
              { label:"Payment Received",        sub:"Notify when payments are confirmed",           val:payRecv,  set:setPayRecv  },
            ].map((n,i)=>(
              <div className="settings-toggle-row" key={i}>
                <div className="flex items-center gap-3">
                  <Bell size={18} style={{color:"var(--gray-500)"}}/>
                  <div><div className="settings-toggle-title">{n.label}</div><div className="settings-toggle-sub">{n.sub}</div></div>
                </div>
                <label className="toggle"><input type="checkbox" checked={n.val} onChange={e=>n.set(e.target.checked)}/><span className="toggle-slider"/></label>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="email" && (
        <div className="card">
          <div className="card-header"><div className="card-title">Email Configuration</div></div>
          <div className="card-body space-y-4">
            <div className="form-group"><label className="form-label">SMTP Host</label><input className="form-input" placeholder="smtp.gmail.com"/></div>
            <div className="grid-2 gap-3">
              <div className="form-group"><label className="form-label">SMTP Port</label><input className="form-input" placeholder="587"/></div>
              <div className="form-group"><label className="form-label">Username</label><input className="form-input" placeholder="your-email@gmail.com"/></div>
            </div>
            <div className="form-group"><label className="form-label">From Email</label><input className="form-input" placeholder="admissions@sacredtree.edu"/></div>
            <button className="btn btn-primary btn-sm">Test Connection</button>
          </div>
        </div>
      )}

      {tab==="appearance" && (
        <div className="card">
          <div className="card-header"><div className="card-title">Appearance Settings</div></div>
          <div className="card-body">
            <div className="form-group mb-4">
              <label className="form-label mb-2">Theme Color</label>
              <div className="flex gap-3 mt-2">
                {themeColors.map(c=>(
                  <div key={c} className={`color-swatch ${selColor===c?"selected":""}`} style={{background:c}} onClick={()=>setSelColor(c)}/>
                ))}
              </div>
            </div>
            <div className="settings-toggle-row">
              <div><div className="settings-toggle-title">Dark Mode</div><div className="settings-toggle-sub">Switch to dark theme</div></div>
              <label className="toggle"><input type="checkbox" checked={darkMode} onChange={e=>setDarkMode(e.target.checked)}/><span className="toggle-slider"/></label>
            </div>
          </div>
        </div>
      )}

      {tab==="security" && (
        <div className="card">
          <div className="card-header"><div className="card-title">Security Settings</div></div>
          <div className="card-body">
            <h3 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "16px", color: "var(--gray-800)" }}>Change Password</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const oldPass = e.target.oldPass.value;
              const newPass = e.target.newPass.value;
              // Add real logic or API call here.
              // For demonstration:
              alert("Password changed successfully (Demo)");
              e.target.reset();
            }}>
              <div className="form-group mb-3">
                <label className="form-label">Current Password</label>
                <input type="password" name="oldPass" className="form-input" required />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">New Password</label>
                <input type="password" name="newPass" className="form-input" required minLength={6} />
              </div>
              <button type="submit" className="btn btn-primary">Update Password</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}