import React, { useState, useEffect } from 'react'
import './Settings.css'
import { useSettings } from "../context/SettingsContext"

      const authFetch = (url, options = {}) => {
      const token = localStorage.getItem('authToken')
          if (!token) {
          throw new Error("No token found. User not authenticated.")
        }
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers || {})
        }
      })
    }

const tabs = [
  { key: 'profile', label: 'Profile', Icon: UserIcon },
  { key: 'notifications', label: 'Notifications', Icon: BellIcon },
  { key: 'security', label: 'Security', Icon: LockIcon },
  { key: 'system', label: 'System', Icon: SystemIcon },
  { key: 'users', label: 'User Management', Icon: UsersIcon },
  { key: 'history', label: 'Settings History', Icon: ClockIcon }
]

const userRole = localStorage.getItem("role")

const notifications = [
  { key: 'new_lead', label: 'New Lead Assignments', desc: 'Get notified when a new lead is assigned to you', enabled: true },
  { key: 'task', label: 'Task Reminders', desc: 'Receive reminders for upcoming tasks and follow-ups', enabled: true },
  { key: 'app', label: 'Application Updates', desc: 'Alerts for application status changes', enabled: true },
  { key: 'email', label: 'Email Notifications', desc: 'Receive email notifications for important events', enabled: true },
  { key: 'sms', label: 'SMS Notifications', desc: 'Get SMS alerts for urgent matters', enabled: false },
  { key: 'whatsapp', label: 'WhatsApp Notifications', desc: 'Receive updates via WhatsApp', enabled: false },
  { key: 'weekly', label: 'Weekly Summary Report', desc: 'Get a weekly summary of your performance and activities', enabled: true },
]

function Toggle({ enabled, onToggle }) {
  return (
    <button className={`toggle ${enabled ? 'on' : ''}`} onClick={onToggle}>
      <span className="toggle-thumb" />
    </button>
  )
}

function ProfileTab() {
  const [form, setForm] = useState({
    schoolName: '',
    email: '',
    phone: ''
  })

  // Load user data
    useEffect(() => {

            authFetch('/api/settings')
              .then(async res => {
                    const data = await res.json()

                    if (!res.ok) {
                      throw new Error(data.message || "Failed")
                    }

                    console.log("✅ PARSED DATA:", data)

                    return data
              })
              .then(data => {
                console.log("✅ PARSED DATA:", data)

                const settings = data.data

                setForm({
                  schoolName: settings.schoolName || "",
                  email: settings.email || "",
                  phone: settings.phone ?? ""
                })
              })
              .catch(err => console.error("❌ FINAL ERROR:", err))
    }, [])

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
  await authFetch('/api/settings/profile', {
    method: 'PUT',
    body: JSON.stringify({
      schoolName: form.schoolName,
      email: form.email,
      phone: form.phone
    })
  })

    // 🔥 refresh settings
    const res = await authFetch('/api/settings')
    const data = await res.json()

    console.log("Updated settings:", data.data)

    alert('System settings saved')
  }
  
  return(
    <div className="settings-panel">
      <h3 className="panel-title">Profile Settings</h3>
      <div className="profile-photo-row">
        <div className="profile-avatar">{form.schoolName ? form.schoolName.charAt(0).toUpperCase():"S"}</div>
        <button className="btn-primary-sm">Upload Logo</button>
      </div>
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label">School Name</label>
          <input className="form-input" value={form.schoolName} onChange={(e) => handleChange('schoolName', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input className="form-input" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Phone</label>
        <input className="form-input" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} />
      </div>
      <button className="btn-save" onClick={handleSave}>Update School Information</button>
    </div>
  )
}


function NotificationsTab() {
  const [notifs, setNotifs] = useState([])

  // Load from backend
  useEffect(() => {
    authFetch('/api/settings')
      .then(async res => {
  if (!res.ok) {
    const text = await res.text()
    console.log("RAW RESPONSE:", text)
    const data = JSON.parse(text)
    throw new Error(text)
  }
  return res.json()
})
.then(data => {
              const backend = data.data

              const keyMap = {
                email: 'emailNotifications',
                sms: 'smsNotifications',
                new_lead: 'newLead',
                task: 'task',
                app: 'app',
                whatsapp: 'whatsapp',
                weekly: 'weekly'
              }

              const mapped = notifications.map(n => ({
                ...n,
                enabled: backend[keyMap[n.key]]
              }))
          setNotifs(mapped)
        })
  }, [])

  const toggle = async (key) => {
    const updated = notifs.map(item =>
      item.key === key ? { ...item, enabled: !item.enabled } : item
    )

    setNotifs(updated)

    const payload = updated.reduce((acc, item) => {
      acc[item.key] = item.enabled
      return acc
    }, {})

    await authFetch('/api/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify({
      emailNotifications: payload.email,
      smsNotifications: payload.sms,
      newLead: payload.new_lead,
      task: payload.task,
      app: payload.app,
      whatsapp: payload.whatsapp,
      weekly: payload.weekly
      })
    })
  }
  return (
    <div className="settings-panel">
      <h3 className="panel-title">Notification Preferences</h3>
      <div className="notif-list">
        {notifs.map(n => (
          <div key={n.key} className="notif-row">
            <div>
              <div className="notif-title">{n.label}</div>
              <div className="notif-desc">{n.desc}</div>
            </div>
            <Toggle enabled={n.enabled} onToggle={() => toggle(n.key)} />
          </div>
        ))}
      </div>
    </div>
  )
}

function SecurityTab() {

  const [twoFA, setTwoFA] = useState(false)

  
  useEffect(() => {
    authFetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setTwoFA(data.data.twoFactorEnabled || false)
      })
      .catch(console.error)
  }, [])

  return (
    <div className="settings-panel">
      <h3 className="panel-title">Security Settings</h3>
      <div className="form-group">
        <label className="form-label">Current Password</label>
        <input className="form-input" type="password" placeholder="Enter current password" />
      </div>
      <div className="form-group">
        <label className="form-label">New Password</label>
        <input className="form-input" type="password" placeholder="Enter new password" />
      </div>
      <div className="form-group">
        <label className="form-label">Confirm New Password</label>
        <input className="form-input" type="password" placeholder="Confirm new password" />
      </div>
      <button
        className="btn-save"
        style={{ marginTop: 8 }}
        onClick={async () => {

        const inputs = document.querySelectorAll('.settings-panel .form-input')

        const currentPassword = inputs[0].value
        const newPassword = inputs[1].value
        const confirmPassword = inputs[2].value

        if (newPassword !== confirmPassword) {
          alert('Passwords do not match')
          return
        }

        if (newPassword.length < 8) {
          alert('Password must be at least 8 characters')
          return
        }

        try {
          await authFetch('/api/settings/password', {
            method: 'PUT',
            body: JSON.stringify({
              currentPassword,
              newPassword
            })
          })

          alert('Password updated')
        } catch (err) {
          console.error(err)
          alert('Failed to update password')
        }
      }}
      >
        Update Password
      </button>
      <div className="security-divider" />
      <h4 className="panel-subtitle">Two-Factor Authentication</h4>
      <div className="notif-row">
        <div>
          <div className="notif-title">Enable 2FA</div>
          <div className="notif-desc">Add an extra layer of security to your account</div>
        </div>
        <Toggle
                enabled={twoFA}
                onToggle={async () => {
                  const newValue = !twoFA

                  setTwoFA(newValue)

                  try {
                    await authFetch('/api/settings/2fa', {
                      method: 'PUT',
                      body: JSON.stringify({
                        enabled: newValue
                      })
                    })
                  } catch (err) {
                    console.error(err)

                    // rollback if save fails
                    setTwoFA(!newValue)
                  }
                }}
              />
      </div>
    </div>
  )
}

function SystemTab() {
    const [settings, setSettings] = useState(null)
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
      if (loaded) return   // ✅ prevents repeat

      authFetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          console.log("✅ SYSTEM LOADED:", data.data)
          setSettings(data.data)
          setLoaded(true)   // ✅ mark as done
        })
        .catch(err => console.error(err))
    }, [loaded])

  if (!settings) return <p>Loading...</p>

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    console.log("📤 SENDING:", settings)

    const res = await authFetch('/api/settings/system', {
      method: 'PUT',
      body: JSON.stringify({
        timezone: settings.timezone,
        language: settings.language,
        campus: settings.campus,
        dateFormat: settings.dateFormat
      })
    })

    const data = await res.json()
    console.log("✅ RESPONSE:", data.data)

    // 🔥 THIS LINE FIXES YOUR WHOLE ISSUE
    setSettings(data.data)

    alert('System settings saved')
  }

  return (
    <div className="settings-panel">
      <h3 className="panel-title">System Settings</h3>
      <div className="form-group">
        <label className="form-label">Campus</label>
        <select className="form-input form-select" value={settings.campus || ""} onChange={(e) => handleChange('campus', e.target.value)}>
          <option>Main Campus</option>
          <option>Secondary Campus</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Language</label>
        <select className="form-input form-select" value={settings.language} onChange={(e) => handleChange('language', e.target.value)}>
          <option value="English">English</option>
          <option value="Hindi">Hindi</option>
          <option value="Kannada">Kannada</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Timezone</label>
        <select className="form-input form-select" value={settings.timezone} onChange={(e) => handleChange('timezone', e.target.value)}>
          <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
          <option value="UTC">UTC</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Date Format</label>
        <select className="form-input form-select" value={settings.dateFormat} onChange={(e) => handleChange('dateFormat', e.target.value)}>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </select>
      </div>
      <button className="btn-save" onClick={handleSave}>
        Save Settings
      </button>
    </div>
  )
}


function UsersTab() {
const [loading, setLoading] = useState(false)
const [users, setUsers] = useState([])

const loadUsers = () => {
  setLoading(true)

  authFetch('/api/users')
    .then(async res => {
      if (!res.ok) {
        const text = await res.text()
        console.log("🔥 RAW RESPONSE:", text)

        throw new Error(text)
      }
      return res.json()
    })
    .then(data => setUsers(data.data))
    .catch(err => console.error(err))
    .finally(() => setLoading(false))
}

useEffect(() => {
  loadUsers()
}, [])

  return (
    <div className="settings-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 className="panel-title" style={{ margin: 0 }}>User Management</h3>
        <button
  className="btn-primary"
  onClick={async () => {
    const email = prompt('Enter user email')
    if (!email) return

    try {
      const res = await authFetch('/api/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email })
      })

      if (!res.ok) throw new Error('Invite failed')

      alert('User invited')

      loadUsers()
    } catch (err) {
      console.error(err)
      alert('Something went wrong')
    }
  }}
>
  + Invite User
</button>
</div>

      <table className="users-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Change Role</th><th>Action</th></tr></thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: 20 }}>
                No users found
              </td>
            </tr>
          ) : (
            users.map((u, i) => (
              <tr key={i}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="user-av">{(u.name || 'U')[0]}</div>
                    <span className="user-nm">{u.name}</span>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email}</td>
                <td><span className="badge badge-blue">{u.role}</span></td>
                <td><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                <td><select value={u.role} className="form-input" onChange={async e => {const role=e.target.value;try{await authFetch(`/api/users/${u.id}/role`,{method:'PUT',body:JSON.stringify({role})});loadUsers()}catch(err){console.error(err);alert('Failed to update role')}}}><option value="user">User</option><option value="counselor">Counselor</option><option value="manager">Manager</option><option value="admin">Admin</option></select></td>
                <td>
                  <button
                    className="btn-primary-sm"
                    onClick={async () => {
                      try {
                        await authFetch(`/api/users/${u.id}/status`, {
                          method: 'PUT'
                        })

                        loadUsers()
                      } catch (err) {
                        console.error(err)
                      }
                    }}
                  >
                    {u.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const panelMap = { profile: ProfileTab, notifications: NotificationsTab, security: SecurityTab, system: SystemTab, users: UsersTab, history: HistoryTab }
  const ActivePanel = panelMap[activeTab]

  return (
    <div className="settings-page">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Manage your CRM configuration and preferences</p>
      </div>
      <div className="settings-layout">
        <div className="settings-sidebar">
          {tabs
            .filter(t => {
              if (t.key === "users" && userRole !== "admin") return false
              return true
            })
            .map(t => (
            <button key={t.key} className={`settings-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              <t.Icon />{t.label}
            </button>
          ))}
        </div>
        <div className="settings-content">
          <ActivePanel />
        </div>
      </div>
    </div>
  )
}

function UserIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function BellIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> }
function LockIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> }
function SystemIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> }
function UsersIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function HistoryTab() {
  const [settings, setSettings] = useState({})
  const [logs, setLogs] = useState([])

  useEffect(() => {
    authFetch('/api/settings/logs')
      .then(res => res.json())
      .then(data => setLogs(data.data || []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    authFetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data.data || {}))
      .catch(console.error)
  }, [])

  console.log("🌍 SETTINGS:", settings)


  const labelMap = {
    emailNotifications: "Email Notifications",
    smsNotifications: "SMS Notifications",
    newLead: "New Lead Alerts",
    task: "Task Reminders",
    app: "App Updates",
    whatsapp: "WhatsApp Alerts",
    weekly: "Weekly Report"
  }

  return (
    <div className="settings-panel">
      <h3 className="panel-title">Settings History</h3>

      {!logs || logs.length === 0 ? (
        <p>No changes recorded</p>
      ) : (
        logs.map(log => (
          <div key={log.id} className="notif-row">
            <div>
              <div className="notif-title">{log.action.replaceAll('_', ' ')}</div>
              <div className="notif-desc">
                  {new Date(log.createdAt).toLocaleString()}
              </div>
              <pre style={{ fontSize: 11 }}>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {Object.entries(log.changes).map(([key, value]) => (
                    <div key={key}>
                      {labelMap[key] || key} → <b>{typeof value === "boolean" ? (value ? "Enabled" : "Disabled") : String(value)}</b>
                    </div>
                  ))}
                </div>
              </pre>
            </div>
          </div>
        ))
      )}
    </div>
  )
}