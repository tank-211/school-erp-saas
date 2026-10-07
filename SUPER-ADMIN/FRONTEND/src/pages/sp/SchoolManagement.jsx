import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { superAdminService } from "../../services/superAdminService";
import { isSuperAdmin, VIEW_ONLY_HINT } from "../../utils/role";

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

// access_state from the API: what the school apps actually allow today
const ACCESS_PILLS = {
  active: { label: "Active", className: "sp-pill" },
  expiring_soon: { label: "Expiring soon", className: "sp-pill sp-pill-warning" },
  expired: { label: "Expired", className: "sp-pill sp-pill-danger" },
  suspended: { label: "Suspended", className: "sp-pill sp-pill-danger" },
};

// Plan codes the backend accepts (superAdminSchoolController allowedPlanTypes)
const PLAN_OPTIONS = [
  { value: "trial", label: "Trial (1 month)" },
  { value: "basic", label: "Basic" },
  { value: "pro", label: "Pro" },
  { value: "ultimate", label: "Ultimate" },
];

const EMPTY_FORM = {
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    principal_name: "",
    plan_type: "trial",
    expiry_date: "",
    admin_name: "",
    admin_email: "",
    admin_password: "",
};

function SchoolManagement() {
  // Changes are for Super Admins only; other staff roles view
  const canEdit = isSuperAdmin();
  const [schools, setSchools] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  // Shown once after creating a school, so the credentials can be handed over
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const isTrial = form.plan_type === "trial";

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
          setLoadError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
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
    setNotice("");

    try {
      const result = await superAdminService.createSchool({
        ...form,
        // Trial end is set by the server (one month); paid plans send their date
        expiry_date: isTrial ? null : form.expiry_date,
      });

      setCreated({
        schoolId: result.school?.id,
        schoolName: result.school?.name,
        plan: result.school?.plan_type,
        expiry: result.school?.expiry_date,
        adminEmail: result.admin?.email,
        adminPassword: form.admin_password,
      });
      setCopied(false);
      setForm(EMPTY_FORM);
      setShowAddForm(false);

      const data = await superAdminService.getSchools();
      setSchools(data);
      setLoadError("");
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

  const updateSchool = async (id, payload, successNotice = "") => {
    setError("");
    setNotice("");
    try {
      await superAdminService.updateSchool(id, payload);
      setNotice(successNotice);
      const data = await superAdminService.getSchools();
      setSchools(data);
      setLoadError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSuspend = async (school) => {
    const ok = window.confirm(
      `Suspend ${school.name}? Its staff will not be able to log in to Admission, Lead or Fees until you activate it again.`,
    );
    if (!ok) {
      return;
    }
    await updateSchool(
      school.id,
      { is_active: false, status: "suspended" },
      `${school.name} is suspended. Its staff cannot log in until you activate it again.`,
    );
  };

  const handleActivate = async (school) => {
    await updateSchool(
      school.id,
      { is_active: true, status: "active" },
      `${school.name} is active again.`,
    );
  };

  const handleEditPlan = async (school) => {
    const nextPlan = window.prompt(
      "Enter new plan type (trial/basic/pro/ultimate):",
      school.plan_type || "trial",
    );
    if (!nextPlan) {
      return;
    }
    await updateSchool(
      school.id,
      { plan_type: nextPlan },
      `${school.name}: plan changed to ${nextPlan.trim().toLowerCase()}.`,
    );
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

      {notice && (
        <div className="sp-success" style={{ marginTop: "12px" }}>
          {notice}
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
          disabled={!canEdit}
          title={canEdit ? undefined : VIEW_ONLY_HINT}
          onClick={() => setShowAddForm((prev) => !prev)}
        >
          {showAddForm ? "Close" : "Add School"}
        </button>
      </div>

      {created && (
        <div className="sp-card" style={{ marginBottom: "14px", borderColor: "#22c55e" }}>
          <h2 style={{ marginTop: 0 }}>School created: share these login details</h2>
          <p className="sp-subtitle" style={{ marginTop: 0 }}>
            The password is shown only now. Send it to the school admin privately and ask them
            to change it after their first login.
          </p>
          <table className="sp-table">
            <tbody>
              <tr><th>School</th><td>{created.schoolName}</td></tr>
              <tr><th>School ID</th><td>{created.schoolId}</td></tr>
              <tr><th>Plan</th><td>{created.plan}</td></tr>
              <tr>
                <th>Access until</th>
                <td>{created.expiry ? new Date(created.expiry).toLocaleDateString() : "-"}</td>
              </tr>
              <tr><th>Admin email</th><td>{created.adminEmail}</td></tr>
              <tr><th>Admin password</th><td><code>{created.adminPassword}</code></td></tr>
            </tbody>
          </table>
          <div className="sp-row-actions" style={{ marginTop: "12px" }}>
            <button
              className="sp-btn sp-btn-primary"
              type="button"
              onClick={async () => {
                const text = [
                  `School: ${created.schoolName}`,
                  `School ID: ${created.schoolId}`,
                  `Login email: ${created.adminEmail}`,
                  `Password: ${created.adminPassword}`,
                ].join("\n");
                try {
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                } catch {
                  setError("Could not copy automatically. Select the details and copy them by hand.");
                }
              }}
            >
              {copied ? "Copied" : "Copy details"}
            </button>
            <button className="sp-btn sp-btn-ghost" type="button" onClick={() => setCreated(null)}>
              Done
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="sp-card" style={{ marginBottom: "14px" }}>
          <h2 style={{ marginTop: 0 }}>Register New School</h2>
          <fieldset disabled={!canEdit} className="sp-fieldset" title={canEdit ? undefined : VIEW_ONLY_HINT}>
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

            <label className="sp-label" htmlFor="plan_type">
              Plan
              <select
                id="plan_type"
                className="sp-input"
                name="plan_type"
                value={form.plan_type}
                onChange={handleChange}
              >
                {PLAN_OPTIONS.map((plan) => (
                  <option key={plan.value} value={plan.value}>
                    {plan.label}
                  </option>
                ))}
              </select>
            </label>

            {isTrial ? (
              <p className="sp-subtitle" style={{ margin: 0 }}>
                Trial access runs for one month from today and then stops until you renew or
                change the plan.
              </p>
            ) : (
              <label className="sp-label" htmlFor="expiry_date">
                Access until
                <input
                  id="expiry_date"
                  className="sp-input"
                  type="date"
                  name="expiry_date"
                  value={form.expiry_date}
                  onChange={handleChange}
                  required
                />
              </label>
            )}

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
                    minLength={8}
                    autoComplete="new-password"
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
</fieldset>
        </div>
      )}

      <div className="sp-card sp-table-wrap">
        <table className="sp-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Expiry Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchools.map((school) => {
              const expiryStatus = getExpiryStatus(school.expiry_date);
              const access = ACCESS_PILLS[school.access_state];

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
                  <td>{school.id}</td>
                  <td>{school.name}</td>
                  <td>{school.email || "-"}</td>
                  <td>
                    <span className="sp-pill">
                      {school.plan_type || "trial"}
                    </span>
                  </td>
                  <td>
                    {access ? (
                      <span className={access.className}>{access.label}</span>
                    ) : (
                      school.status || "-"
                    )}
                  </td>
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
                          disabled={!canEdit}
                          title={canEdit ? undefined : VIEW_ONLY_HINT}
                          onClick={() => handleSuspend(school)}
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          className="sp-btn sp-btn-success"
                          type="button"
                          disabled={!canEdit}
                          title={canEdit ? undefined : VIEW_ONLY_HINT}
                          onClick={() => handleActivate(school)}
                        >
                          Activate
                        </button>
                      )}
                      <button
                        className="sp-btn sp-btn-ghost"
                        type="button"
                        disabled={!canEdit}
                        title={canEdit ? undefined : VIEW_ONLY_HINT}
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
                      {/* The school's own Razorpay account */}
                      <Link
                        className={`sp-btn ${school.payment_gateway_status === "connected" ? "sp-btn-ghost" : "sp-btn-secondary"}`}
                        to={`/sp-control-portal/schools/${school.id}/payments`}
                        title="The school's own Razorpay account"
                      >
                        {school.payment_gateway_status === "connected"
                          ? `Payments · ${school.payment_gateway_mode || "on"}`
                          : "Set up payments"}
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {loading ? (
          <p className="sp-empty">Loading schools...</p>
        ) : loadError ? (
          <div className="sp-error" style={{ marginTop: "12px" }}>
            Schools could not be loaded: {loadError}
          </div>
        ) : (
          !filteredSchools.length && (
            <p className="sp-empty">
              {schools.length ? "No schools match your search." : "No schools yet."}
            </p>
          )
        )}
      </div>
    </section>
  );
}

export default SchoolManagement;
