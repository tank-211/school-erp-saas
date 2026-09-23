import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  UserCheck,
  CheckCircle,
  Key,
} from "lucide-react";
import { getToken } from "../utils/authToken.js";
import "../style.css";

const API_URL = import.meta.env.VITE_API_URL;

const processSteps = [
  { label:"Application Approved",   done:true  },
  { label:"Payment Confirmed",      done:true  },
  { label:"Student ID Generated",   done:true  },
  { label:"Class Assigned",         done:true  },
  { label:"Parent Portal Activated",done:false },
];

export function Enrollment() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      const res = await fetch(
        `${API_URL}/api/admissions?limit=100&offset=0`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      console.log("ENROLLMENTS RESPONSE:", data);

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to load enrollments"
        );
      }

      const records = (data.data || []).map((admission) => ({
        id: admission.admission_id,
        admissionId: admission.admission_id,
        applicationId: admission.application_id,
        student: admission.student_name || "N/A",
        grade: admission.grade || "N/A",
        section: admission.section || "N/A",
        studentId: admission.student_id || "Pending",
        status:
          admission.status === "active"
            ? "Enrolled"
            : "Processing",
      }));

      setEnrollments(records);
    } catch (err) {
      console.error("FETCH ENROLLMENTS ERROR:", err);
      setError(err.message || "Failed to load enrollments");
    } finally {
      setLoading(false);
    }
  };
    const totalEnrolled = enrollments.filter(
      (e) => e.status === "Enrolled"
    ).length;

    const processingCount = enrollments.filter(
      (e) => e.status === "Processing"
    ).length;

    const handleProcess = (enrollment) => {
      if (!enrollment.admissionId) {
        alert("Admission ID is missing.");
        return;
      }

      sessionStorage.setItem(
        "activeAdmissionId",
        String(enrollment.admissionId)
      );

      navigate(`/admission/resume/${enrollment.admissionId}`);
    };

    return (


    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Enrollment Management</h1><p className="page-sub">Convert approved applications to enrolled students</p></div>
      </div>

      <div className="grid-4 mb-5">
        {[
          { label:"Total Enrolled",   value:totalEnrolled, icon:GraduationCap, color:"var(--green-bg)",  ic:"var(--green)"  },
          { label:"This Month",       value:"45",  icon:UserCheck,     color:"var(--blue-bg)",   ic:"var(--blue)"   },
          { label:"Processing",       value:processingCount,  icon:CheckCircle,   color:"var(--purple-bg)", ic:"var(--purple)" },
          { label:"Portal Activated", value:"220", icon:Key,           color:"var(--orange-bg)", ic:"var(--orange)" },
        ].map((s,i)=>{const Icon=s.icon;return(
          <div className="stat-card" key={i}>
            <div className="stat-wide">
              <div className="stat-icon" style={{background:s.color}}><Icon size={20} style={{color:s.ic}}/></div>
              <div><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div></div>
            </div>
          </div>
        );})}
      </div>

      <div className="card mb-5">
        <div className="card-header">
          <div className="card-title">Recent Enrollments</div>
          <button className="btn btn-primary btn-sm">Convert to Student</button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Student Name</th><th>Grade</th><th>Section</th><th>Student ID</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "24px" }}>
                  Loading enrollments...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan="6"
                  style={{
                    textAlign: "center",
                    padding: "24px",
                    color: "red",
                  }}
                >
                  {error}
                </td>
              </tr>
            ) : enrollments.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  style={{
                    textAlign: "center",
                    padding: "24px",
                  }}
                >
                  No enrollments found.
                </td>
              </tr>
            ) : (
              enrollments.map((e) => {
                return (
                  <tr key={e.id}>
                    <td className="td-bold">{e.student}</td>
                    <td>{e.grade}</td>
                    <td>{e.section}</td>
                    <td className="td-mono">{e.studentId}</td>
                    <td>
                      <span
                        className={`badge ${
                          e.status === "Enrolled"
                            ? "badge-green"
                            : "badge-blue"
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleProcess(e)}
                      >
                        {e.status === "Enrolled" ? "View" : "Process"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">Enrollment Process</div></div>
          <div className="card-body">
            {processSteps.map((s,i)=>(
              <div className="enroll-step" key={i}>
                <div className={`enroll-step-icon ${s.done?"done":"todo"}`}>
                  {s.done ? <CheckCircle size={16}/> : i+1}
                </div>
                <span className="enroll-step-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Parent Portal Access</div></div>
          <div className="card-body">
            <div className="info-box info-box-blue mb-4">
              <div>
                <div className="info-box-text"><strong>220 parents</strong> have been granted portal access</div>
                <div className="info-box-text mt-1">Parents can now view student information, fees, and attendance</div>
              </div>
            </div>
            <button className="btn btn-outline w-full"><Key size={14}/> Send Portal Credentials</button>
          </div>
        </div>
      </div>
    </div>
  );
}