import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { getAuthHeader } from "../utils/authToken";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchSetupOverview } from "../services/setupService";
import "../style.css";

const FIELDS = [
  ["email", "Contact Email", "email"],
  ["phone", "Contact Phone", "tel"],
  ["principal_name", "Principal", "text"],
  ["address", "Address", "text"],
  ["city", "City", "text"],
  ["state", "State", "text"],
  ["postal_code", "Postal Code", "text"],
  ["country", "Country", "text"],
];

const Message = ({ ok, text }) =>
  text ? (
    <div
      style={{
        marginBottom: 12,
        padding: 10,
        borderRadius: 6,
        fontSize: 13,
        background: ok ? "#dcfce7" : "#fee2e2",
        color: ok ? "#166534" : "#991b1b",
      }}
    >
      {text}
    </div>
  ) : null;

export function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState("general");
  const [school, setSchool] = useState(null);
  const [form, setForm] = useState({});
  const [activeYear, setActiveYear] = useState(null);
  const [schoolMsg, setSchoolMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    axios
      .get("/api/schools/me", { headers: getAuthHeader() })
      .then((res) => {
        const data = res.data?.data || {};
        setSchool(data);
        setForm(Object.fromEntries(FIELDS.map(([k]) => [k, data[k] || ""])));
      })
      .catch((err) => setSchoolMsg({ ok: false, text: err.response?.data?.message || err.message }));
    fetchSetupOverview()
      .then((o) => setActiveYear(o?.checklist?.active_year || null))
      .catch(() => setActiveYear(null));
  }, []);

  const saveSchool = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSchoolMsg(null);
      const res = await axios.put("/api/schools/me", form, { headers: getAuthHeader() });
      setSchool(res.data?.data || school);
      setSchoolMsg({ ok: true, text: res.data?.message || "Saved" });
    } catch (err) {
      setSchoolMsg({ ok: false, text: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    const formEl = e.target;
    const current = formEl.oldPass.value;
    const next = formEl.newPass.value;
    if (next !== formEl.confirmPass.value) {
      setPwMsg({ ok: false, text: "The new passwords do not match" });
      return;
    }
    try {
      setPwSaving(true);
      setPwMsg(null);
      const res = await axios.post(
        "/api/auth/change-password",
        { current_password: current, new_password: next },
        { headers: getAuthHeader() },
      );
      setPwMsg({ ok: true, text: res.data?.message || "Password changed" });
      formEl.reset();
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.message || err.message });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Settings</h1><p className="page-sub">School details and your account</p></div>
      </div>

      <div className="tabs">
        {[["general", "School"], ["security", "My Password"]].map(([t, label]) => (
          <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">School Information</div>
              <div className="card-sub">
                {isAdmin ? "Contact details can be edited by school admins." : "Only a school admin can change these."}
              </div>
            </div>
          </div>
          <div className="card-body">
            <Message {...(schoolMsg || {})} />
            <form onSubmit={saveSchool}>
              <div className="grid-2 gap-3 mb-3">
                <div className="form-group">
                  <label className="form-label">School Name</label>
                  <input className="form-input" value={school?.name || ""} readOnly disabled />
                  <div className="form-hint">Set by the platform when the school was created.</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Active Academic Year</label>
                  <input className="form-input" value={activeYear?.year_name || "None set"} readOnly disabled />
                  {isAdmin && <div className="form-hint"><Link to="/admin/setup">Change in School Setup</Link></div>}
                </div>
                {FIELDS.map(([key, label, type]) => (
                  <div className="form-group" key={key}>
                    <label className="form-label">{label}</label>
                    <input
                      className="form-input"
                      type={type}
                      value={form[key] || ""}
                      disabled={!isAdmin}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              {isAdmin && (
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !school}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {tab === "security" && (
        <div className="card">
          <div className="card-header"><div className="card-title">Change Password</div></div>
          <div className="card-body">
            <Message {...(pwMsg || {})} />
            <form onSubmit={changePassword} style={{ maxWidth: 420 }}>
              <div className="form-group mb-3">
                <label className="form-label">Current Password</label>
                <input type="password" name="oldPass" className="form-input" autoComplete="current-password" required />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">New Password</label>
                <input type="password" name="newPass" className="form-input" autoComplete="new-password" required minLength={8} />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Confirm New Password</label>
                <input type="password" name="confirmPass" className="form-input" autoComplete="new-password" required minLength={8} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                {pwSaving ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
