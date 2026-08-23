import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import "./ApplicationDetails.css";

const API_URL = import.meta.env.VITE_API_URL;

const statusConfig = {
  draft: {
    label: "Created",
    className: "status-created",
  },

  in_progress: {
    label: "Created",
    className: "status-created",
  },

  documents_pending: {
    label: "Created",
    className: "status-created",
  },

  submitted: {
    label: "Submitted",
    className: "status-submitted",
  },

  under_review: {
    label: "Under Review",
    className: "status-review",
  },

  admission_completed: {
    label: "Admission Completed",
    className: "status-completed",
  },
};

export default function ApplicationDetails() {
  const { id } = useParams();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const res = await fetch(`${API_URL}/applications/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load application");
      }

      console.log("APPLICATION DETAILS:", data);

      setApplication({
        ...data.data.application,
        student_info: data.data.student_info,
        parent_info: data.data.parent_info,
        academic_info: data.data.academic_info,
      });
    } catch (err) {
      console.error("APPLICATION DETAILS ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="application-details-page">
        <div className="application-card">
          Loading application...
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="application-details-page">
        <div className="application-card">
          Application not found.
        </div>
      </div>
    );
  }

  const status =
    statusConfig[application.status] || {
      label: application.status || "Created",
      className: "status-created",
    };

  const lead = application.lead || {};
  const student = application.student_info || {};
  const parent = application.parent_info || {};

  return (
    <div className="application-details-page">

      {/* Header */}
      <div className="application-header">
        <div>
          <h1>{application.application_number}</h1>

          <p className="application-subtitle">
            Application Details
          </p>
        </div>

        <div className={`application-status ${status.className}`}>
          {status.label}
        </div>
      </div>

{/* Status */}
<div className="application-card">
  <h2>Application Status</h2>

  <div className="status-timeline">

    {/* Created */}
    <div
      className={`status-step ${
        [
          "draft",
          "in_progress",
          "documents_pending",
          "submitted",
          "under_review",
          "admission_completed",
        ].includes(application.status)
          ? "active"
          : ""
      }`}
    >
      <span>1</span>

      <div>
        <strong>Created</strong>
        <small>Application created</small>
      </div>
    </div>

    <div className="status-line" />

      {/* Submitted */}
      <div
        className={`status-step ${
          [
            "submitted",
            "under_review",
            "admission_completed",
          ].includes(application.status)
            ? "active"
            : ""
        }`}
      >
        <span>2</span>

        <div>
          <strong>Submitted</strong>
          <small>Application submitted</small>
        </div>
      </div>

      <div className="status-line" />

      {/* Under Review */}
      <div
        className={`status-step ${
          [
            "under_review",
            "admission_completed",
          ].includes(application.status)
            ? "active"
            : ""
        }`}
      >
        <span>3</span>

        <div>
          <strong>Under Review</strong>
          <small>Application under review</small>
        </div>
      </div>

      <div className="status-line" />

      {/* Admission Completed */}
      <div
        className={`status-step ${
          application.status === "admission_completed"
            ? "active"
            : ""
        }`}
      >
        <span>4</span>

        <div>
          <strong>Admission Completed</strong>
          <small>Admission process completed</small>
        </div>
      </div>

    </div>
  </div>
      {/* Student Information */}
      <div className="application-card">
        <h2>Student Information</h2>

        <div className="details-grid">

          <div className="detail-item">
            <span>Name</span>
            <strong>
              {student.first_name ||
                lead.first_name ||
                ""}{" "}
              {student.last_name ||
                lead.last_name ||
                ""}
            </strong>
          </div>

          <div className="detail-item">
            <span>Grade</span>
            <strong>
              {application.academic_info?.desired_class || lead.desired_class || "N/A"}
            </strong>
          </div>

          <div className="detail-item">
            <span>Phone</span>
            <strong>
              {student.phone || lead.phone || "N/A"}
            </strong>
          </div>

          <div className="detail-item">
            <span>Email</span>
            <strong>
              {student.email || lead.email || "N/A"}
            </strong>
          </div>

          <div className="detail-item">
            <span>Date of Birth</span>
            <strong>
              {student.date_of_birth
                ? new Date(
                    student.date_of_birth
                  ).toLocaleDateString()
                : "N/A"}
            </strong>
          </div>

          <div className="detail-item">
            <span>Gender</span>
            <strong>
              {student.gender || "N/A"}
            </strong>
          </div>

        </div>
      </div>

      {/* Parent / Guardian */}
      <div className="application-card">
        <h2>Parent / Guardian Information</h2>

        <div className="details-grid">

          <div className="detail-item">
            <span>Guardian Name</span>
            <strong>
              {parent.guardian_name || "N/A"}
            </strong>
          </div>

          <div className="detail-item">
            <span>Relationship</span>
            <strong>
              {parent.guardian_relation || "N/A"}
            </strong>
          </div>

          <div className="detail-item">
            <span>Phone</span>
            <strong>
              {parent.guardian_phone || "N/A"}
            </strong>
          </div>

          <div className="detail-item">
            <span>Email</span>
            <strong>
              {parent.guardian_email || "N/A"}
            </strong>
          </div>

          <div className="detail-item">
            <span>City</span>
            <strong>
              {parent.city || "N/A"}
            </strong>
          </div>

          <div className="detail-item">
            <span>State</span>
            <strong>
              {parent.state || "N/A"}
            </strong>
          </div>

        </div>
      </div>

      {/* Application Information */}
      <div className="application-card">
        <h2>Application Information</h2>

        <div className="detail-row">
          <strong>Application Number</strong>
          <span>{application.application_number}</span>
        </div>

        <div className="detail-row">
          <strong>Status</strong>
          <span className={`status-text ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="detail-row">
          <strong>Assigned Counselor</strong>
          <span>
            {application.app_user?.name || "Unassigned"}
          </span>
        </div>

        <div className="detail-row">
          <strong>Created</strong>
          <span>
            {application.created_at
              ? new Date(
                  application.created_at
                ).toLocaleDateString()
              : "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
}