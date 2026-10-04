import { useEffect, useState } from 'react'
import { superAdminService } from '../../services/superAdminService'

const STAFF_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'support', label: 'Support' },
  { value: 'billing', label: 'Billing' },
]

function StaffManager() {
  const [staffList, setStaffList] = useState([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    internal_role: 'support',
  })

  useEffect(() => {
    let cancelled = false

    const loadStaff = async () => {
      try {
        const data = await superAdminService.getStaff()
        if (!cancelled) {
          setStaffList(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
        }
      }
    }

    loadStaff()

    return () => {
      cancelled = true
    }
  }, [])

  // Role and active state; the server refuses changes that would lock out the
  // last super admin or your own account, and only super admins may change them
  const updateStaff = async (staff, changes, label) => {
    setBusyId(staff.id)
    setError('')
    setNotice('')
    try {
      const result = await superAdminService.updateStaff(staff.id, changes)
      setStaffList((prev) => prev.map((s) => (s.id === staff.id ? { ...s, ...result.staff } : s)))
      setNotice(`${staff.full_name}: ${label}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await superAdminService.createStaff(form)
      setNotice(`${form.full_name} can now sign in with the password you set.`)
      setForm({ full_name: '', email: '', password: '', internal_role: 'support' })
      const data = await superAdminService.getStaff()
      setStaffList(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h1 className="sp-title">Staff Manager</h1>
      <p className="sp-subtitle">Create and monitor service provider staff accounts.</p>

      {error && <div className="sp-error" style={{ marginTop: '12px' }}>{error}</div>}
      {notice && <div className="sp-success" style={{ marginTop: '12px' }}>{notice}</div>}

      <div className="sp-grid" style={{ marginTop: '16px' }}>
        <article className="sp-card">
          <h2 style={{ marginTop: 0 }}>Add Staff Member</h2>
          <form className="sp-form" onSubmit={handleSubmit}>
            <label className="sp-label" htmlFor="full_name">
              Name
              <input
                id="full_name"
                className="sp-input"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
              />
            </label>

            <label className="sp-label" htmlFor="email">
              Email
              <input
                id="email"
                className="sp-input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>

            <label className="sp-label" htmlFor="password">
              Password
              <input
                id="password"
                className="sp-input"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                minLength={8}
                required
              />
            </label>

            <label className="sp-label" htmlFor="internal_role">
              Role
              <select
                id="internal_role"
                className="sp-select"
                name="internal_role"
                value={form.internal_role}
                onChange={handleChange}
              >
                <option value="super_admin">Super Admin</option>
                <option value="support">Support</option>
                <option value="billing">Billing</option>
              </select>
            </label>

            <button className="sp-btn sp-btn-primary" type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Add Staff'}
            </button>
          </form>
        </article>

        <article className="sp-card sp-table-wrap">
          <h2 style={{ marginTop: 0 }}>Current Staff</h2>
          <table className="sp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last sign-in</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => (
                <tr key={staff.id}>
                  <td>{staff.full_name}</td>
                  <td>{staff.email}</td>
                  <td>
                    <select
                      className="sp-select"
                      value={staff.internal_role || ''}
                      disabled={busyId === staff.id}
                      onChange={(e) => updateStaff(staff, { internal_role: e.target.value }, `role changed to ${e.target.value.replace('_', ' ')}`)}
                    >
                      {/* A stored role outside the list is shown as it is,
                          not as the first option */}
                      {!STAFF_ROLES.some((role) => role.value === staff.internal_role) && (
                        <option value={staff.internal_role || ''}>
                          {staff.internal_role || 'No role'}
                        </option>
                      )}
                      {STAFF_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{staff.is_active ? 'Active' : 'Deactivated'}</td>
                  <td>{staff.last_login ? new Date(staff.last_login).toLocaleString() : 'Never'}</td>
                  <td>
                    <button
                      className={`sp-btn ${staff.is_active ? 'sp-btn-ghost' : 'sp-btn-primary'}`}
                      disabled={busyId === staff.id}
                      onClick={() => {
                        if (staff.is_active && !window.confirm(`Deactivate ${staff.full_name}? They will be signed out and cannot sign in.`)) return
                        updateStaff(staff, { is_active: !staff.is_active }, staff.is_active ? 'deactivated' : 'reactivated')
                      }}
                    >
                      {staff.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!staffList.length && <p className="sp-empty">No staff accounts found.</p>}
        </article>
      </div>
    </section>
  )
}

export default StaffManager
