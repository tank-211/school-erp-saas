import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  UserCheck,
  CheckCircle,
} from "lucide-react";
import { getToken } from "../utils/authToken.js";
import "../style.css";

const API_URL = import.meta.env.VITE_API_URL;

const processSteps = [
  { label: "Application Approved", done: true },
  { label: "Payment Confirmed", done: true },
  { label: "Student ID Generated", done: true },
  { label: "Class Assigned", done: true },
  { label: "Parent Portal Activated", done: false },
];

export function Enrollment() {
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [enrollmentStats, setEnrollmentStats] = useState({
    totalEnrolled: 0,
    thisMonth: 0,
    processing: 0,
  });

  useEffect(() => {
    fetchEnrollments();
    fetchEnrollmentStats();
  }, []);

  // =========================================================
  // FETCH ENROLLMENTS
  // =========================================================

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

        student:
          admission.student_name || "N/A",

        grade:
          admission.grade || "N/A",

        section:
          admission.section || "N/A",

        studentId:
          admission.student_id || "Pending",

        status:
          admission.status === "active"
            ? "Enrolled"
            : "Processing",
      }));

      setEnrollments(records);
    } catch (err) {
      console.error("FETCH ENROLLMENTS ERROR:", err);
      setError(
        err.message || "Failed to load enrollments"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // FETCH ENROLLMENT STATISTICS
  // =========================================================

  const fetchEnrollmentStats = async () => {
    try {
      const token = getToken();

      const res = await fetch(
        `${API_URL}/api/admissions/enrollment-stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Failed to load enrollment statistics"
        );
      }

      console.log("ENROLLMENT STATS:", data);

      setEnrollmentStats(
        data.data || {
          totalEnrolled: 0,
          thisMonth: 0,
          processing: 0,
        }
      );
    } catch (err) {
      console.error(
        "FETCH ENROLLMENT STATS ERROR:",
        err
      );
    }
  };

  // =========================================================
  // PROCESS / VIEW ENROLLMENT
  // =========================================================

  const handleProcess = (enrollment) => {
    if (!enrollment.admissionId) {
      alert("Admission ID is missing.");
      return;
    }

    sessionStorage.setItem(
      "activeAdmissionId",
      String(enrollment.admissionId)
    );

    navigate(
      `/admission/resume/${enrollment.admissionId}`
    );
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="page">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="page-header">
        <div>
          <h1 className="page-title">
            Enrollment Management
          </h1>

          <p className="page-sub">
            Convert approved applications to enrolled students
          </p>
        </div>
      </div>

      {/* =====================================================
          ENROLLMENT STATISTICS
      ===================================================== */}

      <div className="grid-3 mb-5">
        {[
          {
            label: "Total Enrolled",
            value: enrollmentStats.totalEnrolled,
            icon: GraduationCap,
            color: "var(--green-bg)",
            ic: "var(--green)",
          },
          {
            label: "This Month",
            value: enrollmentStats.thisMonth,
            icon: UserCheck,
            color: "var(--blue-bg)",
            ic: "var(--blue)",
          },
          {
            label: "Processing",
            value: enrollmentStats.processing,
            icon: CheckCircle,
            color: "var(--purple-bg)",
            ic: "var(--purple)",
          },
        ].map((s, i) => {
          const Icon = s.icon;

          return (
            <div
              className="stat-card"
              key={i}
            >
              <div className="stat-wide">

                <div
                  className="stat-icon"
                  style={{
                    background: s.color,
                  }}
                >
                  <Icon
                    size={20}
                    style={{
                      color: s.ic,
                    }}
                  />
                </div>

                <div>
                  <div className="stat-label">
                    {s.label}
                  </div>

                  <div className="stat-value">
                    {s.value}
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* =====================================================
          RECENT ENROLLMENTS
      ===================================================== */}

      <div className="card mb-5">

        <div className="card-header">
          <div className="card-title">
            Recent Enrollments
          </div>
        </div>

        <div className="table-wrap">

          <table className="table">

            <thead>
              <tr>
                <th>Student Name</th>
                <th>Grade</th>
                <th>Section</th>
                <th>Student ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {/* LOADING */}

              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign: "center",
                      padding: "24px",
                    }}
                  >
                    Loading enrollments...
                  </td>
                </tr>

              ) : error ? (

                /* ERROR */

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

                /* EMPTY */

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

                /* DATA */

                enrollments.map((e) => (
                  <tr key={e.id}>

                    <td className="td-bold">
                      {e.student}
                    </td>

                    <td>
                      {e.grade}
                    </td>

                    <td>
                      {e.section}
                    </td>

                    <td className="td-mono">
                      {e.studentId}
                    </td>

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
                        onClick={() =>
                          handleProcess(e)
                        }
                      >
                        {e.status === "Enrolled"
                          ? "View"
                          : "Process"}
                      </button>
                    </td>

                  </tr>
                ))

              )}

            </tbody>

          </table>

        </div>
      </div>

      {/* =====================================================
          PROCESS + PARENT PORTAL
      ===================================================== */}

      <div className="grid-2">

        {/* ENROLLMENT PROCESS */}

        <div className="card">

          <div className="card-header">
            <div className="card-title">
              Enrollment Process
            </div>
          </div>

          <div className="card-body">

            {processSteps.map((s, i) => (
              <div
                className="enroll-step"
                key={i}
              >

                <div
                  className={`enroll-step-icon ${
                    s.done
                      ? "done"
                      : "todo"
                  }`}
                >
                  {s.done ? (
                    <CheckCircle size={16} />
                  ) : (
                    i + 1
                  )}
                </div>

                <span className="enroll-step-label">
                  {s.label}
                </span>

              </div>
            ))}

          </div>

        </div>

        {/* PARENT PORTAL */}

        <div className="card">

          <div className="card-header">
            <div className="card-title">
              Parent Portal Access
            </div>
          </div>

          <div className="card-body">

            <div className="info-box info-box-blue mb-4">

              <div>

                <div className="info-box-text">
                  Parent portal access is available
                  for enrolled students.
                </div>

                <div className="info-box-text mt-1">
                  Portal activation status will appear
                  here once portal integration is enabled.
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}