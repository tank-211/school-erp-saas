import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getToken } from "../utils/authToken.js";

const API_URL = import.meta.env.VITE_API_URL;


export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLead();
  }, [id]);

  const fetchLead = async () => {
    try {
      const token = getToken();

      // Fetch lead
      const leadRes = await fetch(
        `${API_URL}/api/leads/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const leadData = await leadRes.json();

      console.log("LEAD DETAILS:", leadData);

      if (!leadRes.ok) {
        throw new Error(
          leadData.message || "Failed to load lead"
        );
      }

      setLead(leadData.data);

      // Fetch application linked to this lead
      const applicationRes = await fetch(
        `${API_URL}/api/applications/by-lead/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const applicationData = await applicationRes.json();

      console.log(
        "LEAD APPLICATION:",
        applicationData
      );

      if (!applicationRes.ok) {
        throw new Error(
          applicationData.message ||
            "Failed to load application"
        );
      }

      setApplication(applicationData.data);

      const statusLabels = {
        draft: "Created",
        in_progress: "Created",
        submitted: "Submitted",
        under_review: "Under Review",
        admission_completed: "Admission Completed",
      };

    } catch (error) {
      console.error(
        "LEAD DETAILS ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          Loading lead...
        </div>
      </div>
    );
  }

    if (!lead) {
      return (
        <div className="page">
          <div className="card">
            Lead not found.
          </div>
        </div>
      );
    }

    const statusLabels = {
      draft: "Created",
      in_progress: "Created",
      submitted: "Submitted",
      under_review: "Under Review",
      admission_completed: "Admission Completed",
    };

    return (
    <div className="page">

      <div className="page-header">
        <div>
          <h1 className="page-title">
            {lead.first_name} {lead.last_name}
          </h1>

          <p className="page-sub">
            Lead Details
          </p>
        </div>

        <span className="badge badge-gray">
          {lead.follow_up_status || "Pending"}
        </span>
      </div>

      <div className="grid-2">

        <div className="card">
          <div className="card-body">
            <h3>Student Information</h3>

            <div className="detail-row">
              <strong>Name</strong>
              <span>
                {lead.first_name} {lead.last_name}
              </span>
            </div>

            <div className="detail-row">
              <strong>Grade</strong>
              <span>{lead.desired_class || "N/A"}</span>
            </div>

            <div className="detail-row">
              <strong>Phone</strong>
              <span>{lead.phone || "N/A"}</span>
            </div>

            <div className="detail-row">
              <strong>Email</strong>
              <span>{lead.email || "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3>Lead Information</h3>

            <div className="detail-row">
              <strong>Source</strong>
              <span>{lead.source || "N/A"}</span>
            </div>

            <div className="detail-row">
              <strong>Status</strong>
              <span>{lead.follow_up_status || "N/A"}</span>
            </div>

            <div className="detail-row">
              <strong>Created</strong>
              <span>
                {lead.created_at
                  ? new Date(
                      lead.created_at
                    ).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

      </div>

            <div className="card">
        <div className="card-body">
          <h3>Notes</h3>

          <p>
            {lead.notes || "No notes available"}
          </p>
        </div>
      </div>

      {/* Application */}
      <div className="card">
        <div className="card-body">
          <h3>Application</h3>

          {!application ? (
            <>
              <p>No application created.</p>

              <button
                className="btn-primary"
                onClick={() =>
                  navigate(`/applications/create?leadId=${lead.id}`)
                }
              >
                Create Application
              </button>
            </>
          ) : (
            <>
              <div className="detail-row">
                <strong>Application Number</strong>
                <span>
                  {application.application_number}
                </span>
              </div>

              <div className="detail-row">
                <strong>Status</strong>
                <span>
                   {statusLabels[application.status] || "Created"}
                </span>
              </div>

              <button
                className="btn-secondary"
                onClick={() =>
                  navigate(`/applications/${application.id}/details`)
                }
              >
                Open Application
              </button>
            </>
          )}
        </div>
      </div>

    </div>
  );
}