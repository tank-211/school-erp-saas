import { useEffect, useMemo, useState } from "react";
import { superAdminService } from "../../services/superAdminService";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "counselor", label: "Counselor" },
  { value: "accountant", label: "Accountant" },
];

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    school_id: "",
    name: "",
    email: "",
    password: "",
    role: "counselor",
    status: "active",
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [schoolsData, usersData] = await Promise.all([
          superAdminService.getSchools(),
          superAdminService.getUsers(),
        ]);

        if (!cancelled) {
          setSchools(schoolsData);
          setUsers(usersData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const schoolById = useMemo(() => {
    const map = new Map();
    schools.forEach((school) => map.set(String(school.id), school));
    return map;
  }, [schools]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const name = user.name?.toLowerCase() || "";
      const email = user.email?.toLowerCase() || "";
      const role = user.role?.toLowerCase() || "";
      const status = user.status?.toLowerCase() || "";
      const schoolName =
        schoolById.get(String(user.school_id))?.name?.toLowerCase() || "";

      return (
        name.includes(query) ||
        email.includes(query) ||
        role.includes(query) ||
        status.includes(query) ||
        schoolName.includes(query)
      );
    });
  }, [users, search, schoolById]);

  const refreshUsers = async () => {
    const data = await superAdminService.getUsers();
    setUsers(data);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await superAdminService.createUser({
        school_id: Number(form.school_id),
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        status: form.status,
      });

      setForm({
        school_id: "",
        name: "",
        email: "",
        password: "",
        role: "counselor",
        status: "active",
      });

      await refreshUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === "active" ? "inactive" : "active";
    setError("");
    try {
      await superAdminService.updateUser(user.id, { status: nextStatus });
      await refreshUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRoleChange = async (user, nextRole) => {
    setError("");
    try {
      await superAdminService.updateUser(user.id, { role: nextRole });
      await refreshUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (user) => {
    const nextPassword = window.prompt(
      `Enter a new password for ${user.email}:`,
      "",
    );
    if (!nextPassword) {
      return;
    }

    setError("");
    try {
      await superAdminService.resetUserPassword(user.id, { password: nextPassword });
      await refreshUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (user) => {
    const ok = window.confirm(`Delete user ${user.email}? This cannot be undone.`);
    if (!ok) {
      return;
    }

    setError("");
    try {
      await superAdminService.deleteUser(user.id);
      await refreshUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section>
      <h1 className="sp-title">User Management</h1>
      <p className="sp-subtitle">
        Create, manage, and deactivate school-scoped users.
      </p>

      {error && (
        <div className="sp-error" style={{ marginTop: "12px" }}>
          {error}
        </div>
      )}

      <div className="sp-grid" style={{ marginTop: "16px" }}>
        <article className="sp-card">
          <h2 style={{ marginTop: 0 }}>Create User</h2>
          <form className="sp-form" onSubmit={handleSubmit}>
            <label className="sp-label" htmlFor="school_id">
              School
              <select
                id="school_id"
                className="sp-select"
                name="school_id"
                value={form.school_id}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Select a school
                </option>
                {schools.map((school) => (
                  <option key={school.id} value={String(school.id)}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="sp-label" htmlFor="name">
              Name
              <input
                id="name"
                className="sp-input"
                name="name"
                value={form.name}
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

            <label className="sp-label" htmlFor="role">
              Role
              <select
                id="role"
                className="sp-select"
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="sp-label" htmlFor="status">
              Status
              <select
                id="status"
                className="sp-select"
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <button className="sp-btn sp-btn-primary" type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create User"}
            </button>
          </form>
        </article>

        <article className="sp-card sp-table-wrap">
          <div className="sp-toolbar" style={{ marginTop: 0 }}>
            <input
              className="sp-input"
              type="search"
              placeholder="Search by name, email, role, status, or school"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <table className="sp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>School</th>
                <th>Role</th>
                <th>Status</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isActive = user.status === "active";
                const schoolName =
                  schoolById.get(String(user.school_id))?.name || `#${user.school_id}`;

                return (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{schoolName}</td>
                    <td>
                      <select
                        className="sp-select"
                        value={user.role || "counselor"}
                        onChange={(event) => handleRoleChange(user, event.target.value)}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{user.status || "-"}</td>
                    <td>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => handleToggleStatus(user)}
                        />
                        <span className={isActive ? "status-active" : "status-inactive"}>
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </label>
                    </td>
                    <td>
                      <div className="sp-row-actions">
                        <button
                          className="sp-btn sp-btn-ghost"
                          type="button"
                          onClick={() => handleResetPassword(user)}
                        >
                          Reset Password
                        </button>
                        <button
                          className="sp-btn sp-btn-danger"
                          type="button"
                          onClick={() => handleDelete(user)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!filteredUsers.length && (
            <p className="sp-empty">No users match your search.</p>
          )}
        </article>
      </div>
    </section>
  );
}

export default UserManagement;

