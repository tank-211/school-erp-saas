import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./LeadDetails.css";

export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [application, setApplication] = useState([]);

  useEffect(() => {
    fetchLead();
  }, [id]);

  const fetchLead = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const res = await fetch(
        `http://localhost:5000/api/leads/${id}/details`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      console.log("RAW RESPONSE:", data);

      setLead(data.data);
      console.log(data.data);
      setTasks(data.data.tasks || []);
      setApplication(data.data.application || []);
    } catch (err) {
      console.error(err);
    }
  };

  const timeline = [
    ...(lead?.tasks || []).map(task => ({
      type: "task",
      title: task.title,
      date: task.createdAt,
    })),

    ...(lead?.lead_activity || []).map(activity => ({
      type: "activity",
      title: activity.activity_type,
      date: activity.created_at,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));



if (!lead) {
  return <div className="lead-details-container">Loading...</div>;
}

  const createApplication = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const res = await fetch(
        `http://localhost:5000/api/applications/from-lead/${lead.id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message);
        return;
      }

      fetchLead();
    } catch (err) {
      console.error(err);
    }
  };



 return (
  <div className="lead-details-page">

  <div className="lead-details-header">
    <div>
      <div className="lead-details-name">
        {lead.first_name} {lead.last_name}
      </div>

      <div className="lead-details-grade">
        Grade {lead.desired_class}
      </div>
    </div>

    <div className="lead-status">
      {lead.follow_up_status}
    </div>
  </div>

  <div className="lead-details-grid">

    <div className="lead-details-card">
          <h3>Parent Information</h3>

          <div className="detail-row">
            <span className="detail-label">Father Name</span>
            <span className="detail-value">N/A</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Phone</span>
            <span className="detail-value">{lead.phone}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Email</span>
            <span className="detail-value">{lead.email}</span>
          </div>
        </div>

        <div className="lead-details-card">
          <h3>Lead Information</h3>

          <div className="detail-row">
            <span className="detail-label">Source</span>
            <span className="detail-value">{lead.source || "N/A"}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Created</span>
            <span className="detail-value">
              {new Date(lead.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

      </div>

      <div className="lead-details-card">
      <h3>Application</h3>

      {application.length === 0 ? (
        <>
          <p>No application created.</p>

          <button
            className="btn-primary"
            onClick={createApplication}
          >
            Create Application
          </button>
        </>
      ) : (
        <>
          <div className="detail-row">
            <span className="detail-label">Application No</span>
            <span className="detail-value">
              {application[0].application_number}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="detail-value">
              {application[0].status}
            </span>
          </div>

          <button
            className="btn-secondary"
            onClick={() => navigate("/applications")}
            >
            Open Application
          </button>
        </>
      )}
    </div>

  <div className="notes-card">
    <h3>Notes</h3>
    <div className="notes-content">
      {lead.notes || "No notes available"}
    </div>
  </div>

  <div className="lead-details-card">
    <h3>Upcoming Follow Ups</h3>

    {tasks.length === 0 ? (
      <p>No follow ups found</p>
    ) : (
      tasks.map((task) => (
        <div
          key={task.id}
          className="detail-row"
        >
          <span className="detail-label">
            {task.title}
          </span>

          <span className="detail-value">
            {task.dueDate
              ? new Date(task.dueDate).toLocaleDateString()
              : "-"}
          </span>
        </div>
      ))
    )}
  </div>
<div className="lead-details-card">
  <h3>Timeline</h3>

  {timeline.length === 0 ? (
    <p>No activity found</p>
  ) : (
    timeline.map((item, index) => (
      <div
        key={index}
        className="detail-row"
      >
        <span className="detail-label">
          {item.type === "task" && "📌"}
          {item.type === "email" && "📧"}
          {item.type === "call" && "📞"}
          {item.type === "whatsapp" && "📱"}
          {item.type === "activity" && "🆕"}

          {" "}
          {item.title}
        </span>

        <span className="detail-value">
          {new Date(item.date).toLocaleDateString()}
        </span>
      </div>
    ))
  )}
</div>
</div>
);
}