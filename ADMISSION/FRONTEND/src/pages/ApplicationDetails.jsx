 import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getToken } from "../utils/authToken.js";

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

  approved: {
    label: "Approved",
    className: "status-approved",
    },

  admission_started: {
    label: "Admission Started",
    className: "status-review",
    },

  admission_completed: {
    label: "Admission Completed",
    className: "status-completed",
  },
};

export default function ApplicationDetails() {
  const { id } = useParams();
const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    try {
      const token = getToken();

      const res = await fetch(
        `${API_URL}/api/applications/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      console.log("APPLICATION DETAILS:", data);

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to load application"
        );
      }

      setApplication({
        ...data.data.application,
        student_info: data.data.student_info,
        parent_info: data.data.parent_info,
        academic_info: data.data.academic_info,
        });
    } catch (error) {
      console.error(
        "APPLICATION DETAILS ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const completeAdmission = async () => {
    try {
        const token = localStorage.getItem("authToken");

        const res = await fetch(`${API_URL}/api/applications/complete`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            application_id: application.id,
        }),
        });

        const data = await res.json();

        console.log("COMPLETE ADMISSION RESPONSE:", data);

        if (!res.ok) {
        throw new Error(
            data.message || "Failed to complete admission"
        );
        }

        // Update UI immediately
        setApplication((prev) => ({
        ...prev,
        status: "admission_completed",
        }));

    } catch (error) {
        console.error("COMPLETE ADMISSION ERROR:", error);
        alert(error.message);
    }
    };

  const startAdmission = async () => {
    try {
      const token = getToken();

      const res = await fetch(
        `${API_URL}/api/applications/start-from-approved`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            application_id: application.id,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to start admission");
      }

      const admissionId = data.data?.admission_id;

      if (!admissionId) {
        throw new Error("Admission ID was not returned by the server");
      }

      sessionStorage.setItem(
        "activeAdmissionId",
        String(admissionId)
      );

      alert("Admission started successfully");

      navigate("/enrollment");
    } catch (error) {
      console.error("Start admission error:", error);
      alert(error.message || "Failed to start admission");
    }
  };

  const moveToReview = async () => {
    try {
      const token = getToken();

      const res = await fetch(
        `${API_URL}/api/applications/${id}/review`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Failed to move application to review"
        );
      }

      setApplication((prev) => ({
        ...prev,
        status: "under_review",
      }));
    } catch (error) {
      console.error(
        "MOVE APPLICATION TO REVIEW ERROR:",
        error
      );

      alert(error.message);
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

  const handleApprove = async () => {
    try {
        const token = getToken();

        const res = await fetch(
        `${API_URL}/api/applications/${id}/approve`,
        {
            method: "PATCH",
            headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            status: "approved",
            }),
        }
        );

        const data = await res.json();

        console.log("APPROVE APPLICATION:", data);

        if (!res.ok) {
        throw new Error(
            data.message || "Failed to approve application"
        );
        }

        setApplication((prev) => ({
        ...prev,
        status: "approved",
        }));

    } catch (error) {
        console.error("APPROVE APPLICATION ERROR:", error);
        alert(error.message);
    }
    };

  return (
    <div className="application-details-page">

      {/* Header */}
      <div className="application-header">

        <div>
          <h1>
            {application.application_number}
          </h1>

          <p className="application-subtitle">
            Application Details
          </p>
        </div>

        <div>
          <div
            className={`application-status ${status.className}`}
          >
            {status.label}
          </div>

          {application.status === "submitted" && (
            <button
              className="review-application-btn"
              onClick={moveToReview}
            >
              Move to Under Review
            </button>
          )}
          {application.status === "approved" && (
            <button
              className="btn-primary"
              onClick={startAdmission}
            >
              Start Admission
            </button>
          )}
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
                "approved",
                "admission_started",
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
                "approved",
                "admission_started",
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
                "approved",
                "admission_started",
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

          {/* Approved */}
          <div
            className={`status-step ${
              [
                "approved",
                "admission_started",
                "admission_completed",
              ].includes(application.status)
                ? "active"
                : ""
            }`}
          >
            <span>4</span>

            <div>
              <strong>Approved</strong>
              <small>Application approved</small>
            </div>
          </div>

          <div className="status-line" />

          {/* Admission Started */}
          <div
            className={`status-step ${
              [
                "admission_started",
                "admission_completed",
              ].includes(application.status)
                ? "active"
                : ""
            }`}
          >
            <span>5</span>

            <div>
              <strong>Admission Started</strong>
              <small>Student admission process started</small>
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
            <span>6</span>

            <div>
              <strong>Admission Completed</strong>
              <small>Admission process completed</small>
            </div>
          </div>

        </div>
      </div>


      {application.status === "under_review" && (
        <div className="application-card">
            <h2>Review Application</h2>

            <p>
            The application has been reviewed and is ready for approval.
            </p>

            <button
            className="btn-primary"
            onClick={handleApprove}
            >
            Approve Application
            </button>
        </div>
        )}

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
              {lead.desired_class || "N/A"}
            </strong>
          </div>

          <div className="detail-item">
            <span>Phone</span>

            <strong>
              {student.phone ||
                lead.phone ||
                "N/A"}
            </strong>
          </div>

          <div className="detail-item">
            <span>Email</span>

            <strong>
              {student.email ||
                lead.email ||
                "N/A"}
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
            <h2>
            Parent / Guardian Information
            </h2>

            <div className="details-grid">

    <div className="detail-item">
        <span>Father Name</span>
        <strong>
        {parent.father_name || "N/A"}
        </strong>
    </div>

    <div className="detail-item">
        <span>Father Occupation</span>
        <strong>
        {parent.father_occupation || "N/A"}
        </strong>
    </div>

    <div className="detail-item">
        <span>Father Phone</span>
        <strong>
        {parent.father_phone || "N/A"}
        </strong>
    </div>

    <div className="detail-item">
        <span>Father Email</span>
        <strong>
        {parent.father_email || "N/A"}
        </strong>
    </div>

    <div className="detail-item">
        <span>Mother Name</span>
        <strong>
        {parent.mother_name || "N/A"}
        </strong>
    </div>

    <div className="detail-item">
        <span>Primary Contact</span>
        <strong>
        {parent.primary_contact_person || "N/A"}
        </strong>
    </div>

    <div className="detail-item">
        <span>Primary Contact Relation</span>
        <strong>
        {parent.primary_contact_relation || "N/A"}
        </strong>
    </div>

    <div className="detail-item">
        <span>Primary Contact Phone</span>
        <strong>
        {parent.primary_contact_phone || "N/A"}
        </strong>
    </div>

    </div>
      </div>

      {/* Application Information */}
      <div className="application-card">
        <h2>Application Information</h2>

        <div className="detail-row">
          <strong>
            Application Number
          </strong>

          <span>
            {application.application_number}
          </span>
        </div>

        <div className="detail-row">
          <strong>Status</strong>

          <span
            className={`status-text ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <div className="detail-row">
          <strong>
            Assigned Counselor
          </strong>

          <span>
            {application.app_user?.name ||
              "Unassigned"}
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