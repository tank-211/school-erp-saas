import { useEffect, useState } from 'react'
import { superAdminService } from '../../services/superAdminService'

function StaffManager() {
  const [staffList, setStaffList] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
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
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => (
                <tr key={staff.id}>
                  <td>{staff.full_name}</td>
                  <td>{staff.email}</td>
                  <td>{staff.internal_role}</td>
                  <td>{staff.is_active ? 'Yes' : 'No'}</td>
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
