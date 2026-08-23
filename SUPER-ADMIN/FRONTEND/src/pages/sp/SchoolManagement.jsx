import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { superAdminService } from "../../services/superAdminService";

const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) {
    return "unknown";
  }

  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const warningThreshold = new Date(today);
  warningThreshold.setDate(warningThreshold.getDate() + 30);

  if (expiry < today) {
    return "expired";
  }

  if (expiry <= warningThreshold) {
    return "warning";
  }

  return "healthy";
};

function SchoolManagement() {
  const [schools, setSchools] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    principal_name: "",
    expiry_date: "",
    admin_name: "",
    admin_email: "",
    admin_password: "",
  });

  useEffect(() => {
    let cancelled = false;

    const loadSchools = async () => {
      try {
        const data = await superAdminService.getSchools();
        if (!cancelled) {
          setSchools(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    };

    loadSchools();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSchool = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await superAdminService.createSchool({
        ...form,
        status: "active",
        plan_type: "trial",
        expiry_date: form.expiry_date || null,
      });

      setForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        principal_name: "",
        expiry_date: "",
        admin_name: "",
        admin_email: "",
        admin_password: "",
      });
      setShowAddForm(false);

      const data = await superAdminService.getSchools();
      setSchools(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredSchools = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return schools;
    }

    return schools.filter((school) => {
      const name = school.name?.toLowerCase() || "";
      const email = school.email?.toLowerCase() || "";
      const plan = school.plan_type?.toLowerCase() || "";
      return (
        name.includes(query) || email.includes(query) || plan.includes(query)
      );
    });
  }, [schools, search]);

  const updateSchool = async (id, payload) => {
    setError("");
    try {
      await superAdminService.updateSchool(id, payload);
      const data = await superAdminService.getSchools();
      setSchools(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditPlan = async (school) => {
    const nextPlan = window.prompt(
      "Enter new plan type (trial/basic/pro/ultimate):",
      school.plan_type || "trial",
    );
    if (!nextPlan) {
      return;
    }
    await updateSchool(school.id, { plan_type: nextPlan });
  };

  return (
    <section>
      <h1 className="sp-title">School Management</h1>
      <p className="sp-subtitle">
        Search, review, and control school accounts from one panel.
      </p>

      {error && (
        <div className="sp-error" style={{ marginTop: "12px" }}>
          {error}
        </div>
      )}

      <div className="sp-toolbar" style={{ marginTop: "16px" }}>
        <input
          className="sp-input"
          type="search"
          placeholder="Search by name, email, or plan"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          className="sp-btn sp-btn-primary"
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
        >
          {showAddForm ? "Close" : "Add School"}
        </button>
      </div>

      {showAddForm && (
        <div className="sp-card" style={{ marginBottom: "14px" }}>
          <h2 style={{ marginTop: 0 }}>Register New School</h2>
          <form className="sp-form" onSubmit={handleAddSchool}>
            <label className="sp-label" htmlFor="name">
              School Name
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
              />
            </label>

            <label className="sp-label" htmlFor="phone">
              Phone
              <input
                id="phone"
                className="sp-input"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
            </label>

            <label className="sp-label" htmlFor="address">
              Address
              <input
                id="address"
                className="sp-input"
                name="address"
                value={form.address}
                onChange={handleChange}
              />
            </label>

            <label className="sp-label" htmlFor="city">
              City
              <input
                id="city"
                className="sp-input"
                name="city"
                value={form.city}
                onChange={handleChange}
              />
            </label>

            <label className="sp-label" htmlFor="principal_name">
              Principal Name
              <input
                id="principal_name"
                className="sp-input"
                name="principal_name"
                value={form.principal_name}
                onChange={handleChange}
              />
            </label>

            <label className="sp-label" htmlFor="expiry_date">
              Expiry Date
              <input
                id="expiry_date"
                className="sp-input"
                type="date"
                name="expiry_date"
                value={form.expiry_date}
                onChange={handleChange}
              />
            </label>

            <div
              className="sp-card"
              style={{
                padding: "12px",
                background: "rgba(15, 23, 42, 0.35)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "10px" }}>
                First Admin User (required)
              </h3>
              <div className="sp-form" style={{ marginTop: 0 }}>
                <label className="sp-label" htmlFor="admin_name">
                  Admin Name
                  <input
                    id="admin_name"
                    className="sp-input"
                    name="admin_name"
                    value={form.admin_name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="sp-label" htmlFor="admin_email">
                  Admin Email
                  <input
                    id="admin_email"
                    className="sp-input"
                    type="email"
                    name="admin_email"
                    value={form.admin_email}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="sp-label" htmlFor="admin_password">
                  Admin Password
                  <input
                    id="admin_password"
                    className="sp-input"
                    type="password"
                    name="admin_password"
                    value={form.admin_password}
                    onChange={handleChange}
                    required
                  />
                </label>
              </div>
            </div>

            <button
              className="sp-btn sp-btn-primary"
              type="submit"
              disabled={saving}
            >
              {saving ? "Creating..." : "Create School"}
            </button>
          </form>
        </div>
      )}

      <div className="sp-card sp-table-wrap">
        <table className="sp-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Active</th>
              <th>Expiry Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchools.map((school) => {
              const expiryStatus = getExpiryStatus(school.expiry_date);

              return (
                <tr
                  key={school.id}
                  className={
                    expiryStatus === "expired"
                      ? "sp-row-expired"
                      : expiryStatus === "warning"
                        ? "sp-row-warning"
                        : ""
                  }
                >
                  <td>{school.name}</td>
                  <td>{school.email || "-"}</td>
                  <td>
                    <span className="sp-pill">
                      {school.plan_type || "trial"}
                    </span>
                  </td>
                  <td>{school.status || "-"}</td>
                  <td>{school.is_active ? "Yes" : "No"}</td>
                  <td>
                    <span
                      className={
                        expiryStatus === "expired"
                          ? "sp-pill sp-pill-danger"
                          : expiryStatus === "warning"
                            ? "sp-pill sp-pill-warning"
                            : "sp-pill"
                      }
                    >
                      {school.expiry_date
                        ? new Date(school.expiry_date).toLocaleDateString()
                        : "-"}
                    </span>
                  </td>
                  <td>
                    <div className="sp-row-actions">
                      {school.is_active ? (
                        <button
                          className="sp-btn sp-btn-danger"
                          type="button"
                          onClick={() =>
                            updateSchool(school.id, {
                              is_active: false,
                              status: "suspended",
                            })
                          }
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          className="sp-btn sp-btn-success"
                          type="button"
                          onClick={() =>
                            updateSchool(school.id, {
                              is_active: true,
                              status: "active",
                            })
                          }
                        >
                          Activate
                        </button>
                      )}
                      <button
                        className="sp-btn sp-btn-ghost"
                        type="button"
                        onClick={() => handleEditPlan(school)}
                      >
                        Edit Plan
                      </button>
                      <Link
                        className="sp-btn sp-btn-primary"
                        to={`/sp-control-portal/schools/${school.id}/renewals`}
                      >
                        Renew
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!filteredSchools.length && (
          <p className="sp-empty">No schools match your search.</p>
        )}
      </div>
    </section>
  );
}

export default SchoolManagement;
