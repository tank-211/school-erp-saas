import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { superAdminService } from "../../services/superAdminService";

function RenewalManager() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [renewals, setRenewals] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    currency: "INR",
    period_months: 3,
    paid_on: new Date().toISOString().slice(0, 10),
    notes: "",
    reactivate_school: true,
  });

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const schools = await superAdminService.getSchools();
        if (cancelled) {
          return;
        }

        setSchool(
          schools.find((item) => String(item.id) === String(id)) || null,
        );
        const renewalHistory = await superAdminService.getSchoolRenewals(id);
        if (!cancelled) {
          setRenewals(renewalHistory);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const expiryState = useMemo(() => {
    if (!school?.expiry_date) {
      return "No expiry date";
    }

    const expiryDate = new Date(school.expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiryDate < today) {
      return "Expired";
    }

    return "Active";
  }, [school]);

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await superAdminService.renewSchoolSubscription(id, {
        ...form,
        period_months: Number(form.period_months),
        amount: form.amount === "" ? null : Number(form.amount),
      });
      const schools = await superAdminService.getSchools();
      setSchool(schools.find((item) => String(item.id) === String(id)) || null);
      const renewalHistory = await superAdminService.getSchoolRenewals(id);
      setRenewals(renewalHistory);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <div className="sp-toolbar" style={{ alignItems: "center" }}>
        <div>
          <h1 className="sp-title">Renewal Manager</h1>
          <p className="sp-subtitle">
            {school
              ? `${school.name} · ${expiryState}`
              : "Loading school details..."}
          </p>
        </div>
        <button
          className="sp-btn sp-btn-ghost"
          type="button"
          onClick={() => navigate("/sp-control-portal/schools")}
        >
          Back to Schools
        </button>
      </div>

      {error && (
        <div className="sp-error" style={{ marginBottom: "12px" }}>
          {error}
        </div>
      )}

      <div className="sp-grid" style={{ gap: "18px" }}>
        <article className="sp-card">
          <h2 style={{ marginTop: 0 }}>Manual Renewal</h2>
          <form className="sp-form" onSubmit={handleSubmit}>
            <label className="sp-label" htmlFor="amount">
              Amount
              <input
                id="amount"
                className="sp-input"
                type="number"
                min="0"
                step="0.01"
                name="amount"
                value={form.amount}
                onChange={handleChange}
              />
            </label>

            <label className="sp-label" htmlFor="currency">
              Currency
              <input
                id="currency"
                className="sp-input"
                name="currency"
                value={form.currency}
                onChange={handleChange}
              />
            </label>

            <label className="sp-label" htmlFor="period_months">
              Period (months)
              <input
                id="period_months"
                className="sp-input"
                type="number"
                min="1"
                name="period_months"
                value={form.period_months}
                onChange={handleChange}
                required
              />
            </label>

            <label className="sp-label" htmlFor="paid_on">
              Paid On
              <input
                id="paid_on"
                className="sp-input"
                type="date"
                name="paid_on"
                value={form.paid_on}
                onChange={handleChange}
                required
              />
            </label>

            <label className="sp-label" htmlFor="notes">
              Notes
              <textarea
                id="notes"
                className="sp-input"
                name="notes"
                rows="4"
                value={form.notes}
                onChange={handleChange}
              />
            </label>

            <label
              className="sp-label"
              style={{ gridTemplateColumns: "auto 1fr", alignItems: "center" }}
            >
              <input
                type="checkbox"
                name="reactivate_school"
                checked={form.reactivate_school}
                onChange={handleChange}
              />
              Reactivate school if needed
            </label>

            <button
              className="sp-btn sp-btn-primary"
              type="submit"
              disabled={saving}
            >
              {saving ? "Renewing..." : "Save Renewal"}
            </button>
          </form>
        </article>

        <article className="sp-card sp-table-wrap">
          <h2 style={{ marginTop: 0 }}>Renewal History</h2>
          <table className="sp-table">
            <thead>
              <tr>
                <th>Paid On</th>
                <th>Amount</th>
                <th>Period</th>
                <th>New Expiry</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {renewals.map((renewal) => (
                <tr key={renewal.id}>
                  <td>
                    {renewal.paid_on
                      ? new Date(renewal.paid_on).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>
                    {renewal.amount
                      ? `${renewal.currency || "INR"} ${renewal.amount}`
                      : "-"}
                  </td>
                  <td>{renewal.period_months} months</td>
                  <td>
                    {renewal.new_expiry_date
                      ? new Date(renewal.new_expiry_date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>{renewal.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!renewals.length && (
            <p className="sp-empty">No renewals recorded yet.</p>
          )}
        </article>
      </div>

      <div style={{ marginTop: "16px" }}>
        <Link className="sp-btn sp-btn-ghost" to="/sp-control-portal/schools">
          Return to School Management
        </Link>
      </div>
    </section>
  );
}

export default RenewalManager;
