import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  X,
  Search,
  Loader,
} from "lucide-react";
import counselingService from "../services/counselingService";
import "../style.css";

const areas = [
  "Classrooms",
  "Science Labs",
  "Computer Labs",
  "Library",
  "Sports Facilities",
  "Arts & Music Room",
  "Cafeteria",
  "Playgrounds",
  "Auditorium",
];

const guides = [
  "Priya Sharma",
  "Amit Patel",
  "Neha Kumar",
  "Rahul Singh",
  "Anjali Gupta",
];

// Helper: Convert "10:00 AM" to "10:00"
const convertTo24Hour = (timeStr) => {
  if (!timeStr) return "";
  const [time, period] = timeStr.split(" ");
  let [hours, minutes] = time.split(":");
  hours = parseInt(hours);
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
};

// Helper: Calculate end time (1 hour after start)
const calculateEndTime = (startTime) => {
  if (!startTime) return "";
  const [hours, minutes] = startTime.split(":").map(Number);
  const endHours = (hours + 1) % 24;
  return `${String(endHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export function ScheduleVisit() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    parentName: "",
    studentName: "",
    email: "",
    phone: "",
    grade: "",
    visitors: "1",
    date: "",
    time: "",
    visitType: "",
    guide: "",
    interests: [],
    requirements: "",
    notes: "",
  });

  const [leadId, setLeadId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const toggleArea = (a) =>
    setForm((p) => ({
      ...p,
      interests: p.interests.includes(a)
        ? p.interests.filter((x) => x !== a)
        : [...p.interests, a],
    }));

  // Search leads
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      const trimmedQuery = searchQuery.trim();
      const isNumericSearch = /^\d+$/.test(trimmedQuery);

      if (!trimmedQuery || (!isNumericSearch && trimmedQuery.length < 2)) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      try {
        setLoading(true);
        const response = await counselingService.searchLeads(trimmedQuery);
        setSearchResults(response.data || []);
        setShowResults(true);
      } catch (err) {
        console.error("Search error:", err);
        setError(err.message);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchQuery]);

  // Fetch available slots when date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!form.date) {
        setSlots([]);
        return;
      }

      try {
        const response = await counselingService.getAvailableSlots(form.date);
        setSlots(response.data || []);
      } catch (err) {
        console.error("Slots error:", err);
        setSlots([]);
      }
    };

    fetchSlots();
  }, [form.date]);

  // Select lead and autofill
  const handleSelectLead = (lead) => {
    setLeadId(lead.lead_id);
    setForm((p) => ({
      ...p,
      parentName: lead.parent_name || lead.student_name || "",
      studentName: lead.student_name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      grade: lead.desired_class || p.grade,
    }));
    setSearchQuery("");
    setShowResults(false);
    setSearchResults([]);
  };

  // Get slot info for time slot
  const getSlotInfo = (timeStr) => {
    const time24 = convertTo24Hour(timeStr);
    const slot = slots.find((s) => s.start_time === time24);
    return slot ? `${timeStr} (${slot.total_visits} bookings)` : timeStr;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate
    if (!form.parentName || !form.phone || !form.date || !form.time) {
      setError("Please fill in all required fields");
      return;
    }

    if (parseInt(form.visitors) < 1) {
      setError("Number of visitors must be at least 1");
      return;
    }

    try {
      setSubmitting(true);

      const startTime = convertTo24Hour(form.time);
      const endTime = calculateEndTime(startTime);

      const payload = {
        lead_id: leadId,
        visitor_name: form.parentName,
        visitor_phone: form.phone,
        student_name: form.studentName,
        email: form.email,
        grade: form.grade,
        number_of_visitors: parseInt(form.visitors),
        visit_date: form.date,
        start_time: startTime,
        end_time: endTime,
        visit_type: form.visitType,
        assigned_to: form.guide || null,
        areas_of_interest: form.interests,
        special_requirements: form.requirements,
        internal_notes: form.notes,
      };

      await counselingService.createCampusVisit(payload);

      // Show success and navigate
      alert("Campus visit scheduled successfully!");
      navigate("/counseling");
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to schedule visit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-sm" style={{ maxWidth: 860 }}>
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="page-title mb-1">Schedule Campus Visit</h1>
      <p className="page-sub mb-5">
        Arrange a personalized tour of Sacred Tree International School
      </p>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1.25rem" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lead Search */}
        <div className="card">
          <div className="card-body">
            <div className="form-section-title flex items-center gap-2">
              <Search size={16} style={{ color: "var(--primary)" }} />
              Quick Search
            </div>
            <div className="form-group mb-3" style={{ position: "relative" }}>
              <label className="form-label">Search Lead by Name or ID</label>
              <input
                className="form-input"
                placeholder="Type name or lead ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {loading && (
                <Loader
                  size={16}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "40px",
                    animation: "spin 1s linear infinite",
                  }}
                />
              )}

              {showResults && searchResults.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "white",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    maxHeight: "300px",
                    overflowY: "auto",
                    zIndex: 100,
                    marginTop: "-8px",
                    paddingTop: "8px",
                  }}
                >
                  {searchResults.map((lead) => (
                    <div
                      key={lead.lead_id}
                      onClick={() => handleSelectLead(lead)}
                      style={{
                        padding: "0.75rem 1rem",
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.background = "var(--bg-light)")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.background = "white")
                      }
                    >
                      <div style={{ fontWeight: 500 }}>{lead.student_name}</div>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {lead.parent_name} • {lead.phone}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Visitor Info */}
        <div className="card">
          <div className="card-body">
            <div className="form-section-title flex items-center gap-2">
              <Users size={16} style={{ color: "var(--primary)" }} />
              Visitor Information
            </div>
            <div className="grid-2 gap-3 mb-3">
              <div className="form-group">
                <label className="form-label">
                  Parent/Guardian Name <span className="req">*</span>
                </label>
                <input
                  className="form-input"
                  placeholder="Enter full name"
                  value={form.parentName}
                  onChange={(e) => set("parentName", e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Student Name</label>
                <input
                  className="form-input"
                  placeholder="Enter student name"
                  value={form.studentName}
                  onChange={(e) => set("studentName", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="parent@email.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Phone <span className="req">*</span>
                </label>
                <input
                  className="form-input"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Grade of Interest</label>
                <select
                  className="form-select"
                  value={form.grade}
                  onChange={(e) => set("grade", e.target.value)}
                >
                  <option value="">Select grade</option>
                  {[
                    "Nursery",
                    "LKG",
                    "UKG",
                    "Grade 1",
                    "Grade 2",
                    "Grade 3",
                    "Grade 4",
                    "Grade 5",
                    "Grade 6",
                    "Grade 7",
                    "Grade 8",
                    "Grade 9",
                    "Grade 10",
                    "Grade 11",
                    "Grade 12",
                  ].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Number of Visitors</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  max="10"
                  value={form.visitors}
                  onChange={(e) => set("visitors", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Visit Schedule */}
        <div className="card">
          <div className="card-body">
            <div className="form-section-title flex items-center gap-2">
              <Calendar size={16} style={{ color: "var(--primary)" }} />
              Visit Schedule
            </div>
            <div className="grid-2 gap-3 mb-3">
              <div className="form-group">
                <label className="form-label">
                  Preferred Date <span className="req">*</span>
                </label>
                <input
                  className="form-input"
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Preferred Time <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.time}
                  onChange={(e) => set("time", e.target.value)}
                  required
                >
                  <option value="">Select time slot</option>
                  {[
                    "09:00 AM",
                    "10:00 AM",
                    "11:00 AM",
                    "12:00 PM",
                    "02:00 PM",
                    "03:00 PM",
                    "04:00 PM",
                  ].map((t) => (
                    <option key={t}>{getSlotInfo(t)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group mb-3">
              <label className="form-label">Visit Type</label>
              <select
                className="form-select"
                value={form.visitType}
                onChange={(e) => set("visitType", e.target.value)}
              >
                <option value="">Select visit type</option>
                <option>Guided Campus Tour</option>
                <option>Tour + Counselor Meeting</option>
                <option>Tour + Principal Meeting</option>
                <option>Classroom Observation</option>
                <option>Comprehensive Visit (All)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assign Tour Guide</label>
              <select
                className="form-select"
                value={form.guide}
                onChange={(e) => set("guide", e.target.value)}
              >
                <option value="">Select guide</option>
                {guides.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tour Preferences */}
        <div className="card">
          <div className="card-body">
            <div className="form-section-title flex items-center gap-2">
              <MapPin size={16} style={{ color: "var(--primary)" }} />
              Tour Preferences
            </div>
            <label className="form-label mb-2">
              Areas of Interest (Select all that apply)
            </label>
            <div className="grid-3 gap-2 mb-4">
              {areas.map((a) => (
                <label key={a} className="checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={form.interests.includes(a)}
                    onChange={() => toggleArea(a)}
                  />
                  {a}
                </label>
              ))}
            </div>
            <div className="form-group mb-3">
              <label className="form-label">
                Special Requirements or Questions
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Any accessibility needs, specific questions, or areas you'd like to focus on..."
                value={form.requirements}
                onChange={(e) => set("requirements", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Internal Notes (Not visible to visitor)
              </label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Any internal notes for the tour guide..."
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate(-1)}
          >
            <X size={15} /> Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            <Calendar size={15} />{" "}
            {submitting ? "Scheduling..." : "Schedule Visit"}
          </button>
        </div>
      </form>
    </div>
  );
}
