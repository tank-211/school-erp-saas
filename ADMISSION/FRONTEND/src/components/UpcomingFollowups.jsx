import React from "react";
import {
  Clock,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { useUpcomingFollowups } from "../hooks/useUpcomingFollowups";
import "../style.css";

/**
 * UpcomingFollowups Component
 * Dashboard widget showing upcoming follow-ups with leads
 *
 * Features:
 * - Fetches data from /api/leads/followups/upcoming
 * - Displays priority indicators (overdue, today, upcoming)
 * - Shows contact info (name, phone, class/grade)
 * - Action buttons (Call, Email, Visit)
 * - Error and empty state handling
 *
 * @param {number} interval - Days interval for follow-up calculation (default: 2)
 * @param {number} limit - Maximum records to display (default: 10)
 * @param {Function} onViewAll - Callback when "View All" is clicked
 */
export const UpcomingFollowups = ({ interval = 2, limit = 10, onViewAll }) => {
  const { followups, loading, error, refetch } = useUpcomingFollowups(
    interval,
    limit,
    true,
  );

  // Get badge styling based on priority
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "overdue":
        return {
          bg: "#fee2e2",
          color: "#dc2626",
          text: "Overdue",
          label: "action-tag action-overdue",
        };
      case "today":
        return {
          bg: "#fef3c7",
          color: "#d97706",
          text: "Today",
          label: "action-tag action-today",
        };
      case "upcoming":
        return {
          bg: "#d1fae5",
          color: "#059669",
          text: "Upcoming",
          label: "action-tag action-upcoming",
        };
      default:
        return {
          bg: "#f3f4f6",
          color: "#6b7280",
          text: "Scheduled",
          label: "action-tag",
        };
    }
  };

  // Generate initials for avatar
  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return `${first}${last}`.toUpperCase() || "?";
  };

  // Get avatar background color based on priority
  const getAvatarColor = (priority) => {
    switch (priority) {
      case "overdue":
        return { bg: "#fee2e2", color: "#dc2626" };
      case "today":
        return { bg: "#fef3c7", color: "#d97706" };
      case "upcoming":
        return { bg: "#d1fae5", color: "#059669" };
      default:
        return { bg: "#e0e7ff", color: "#4f46e5" };
    }
  };

  // Format date and time for display
  const formatFollowupDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check if it's today
      if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // Check if it's tomorrow
      if (date.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
      }

      // Otherwise, show date and time
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "N/A";
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Upcoming Follow-ups</div>
            <div className="card-sub">Today's scheduled activities</div>
          </div>
        </div>
        <div className="card-body">
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "var(--gray-500)",
            }}
          >
            Loading follow-ups...
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Upcoming Follow-ups</div>
            <div className="card-sub">Today's scheduled activities</div>
          </div>
        </div>
        <div className="card-body">
          <div
            style={{
              padding: "12px",
              background: "#fee2e2",
              border: "1px solid #fecaca",
              borderRadius: 6,
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              color: "#991b1b",
              fontSize: 13,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600 }}>Error loading follow-ups</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{error}</div>
              <button
                onClick={refetch}
                style={{
                  marginTop: 8,
                  padding: "4px 8px",
                  fontSize: 12,
                  border: "1px solid #991b1b",
                  borderRadius: 4,
                  background: "#fff",
                  color: "#991b1b",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!followups || followups.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Upcoming Follow-ups</div>
            <div className="card-sub">Today's scheduled activities</div>
          </div>
        </div>
        <div className="card-body">
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "var(--gray-500)",
            }}
          >
            <div style={{ fontSize: 13 }}>✓ No follow-ups scheduled</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              All caught up for now!
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render follow-ups list
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Upcoming Follow-ups</div>
          <div className="card-sub">
            {followups.length} scheduled{" "}
            {followups.length === 1 ? "activity" : "activities"}
          </div>
        </div>
      </div>
      <div className="card-body">
        {followups.map((followup, index) => {
          const initials = getInitials(followup.first_name, followup.last_name);
          const avatarColor = getAvatarColor(followup.priority);
          const priorityBadge = getPriorityBadge(followup.priority);

          return (
            <div
              key={followup.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                borderBottom:
                  index < followups.length - 1
                    ? "1px solid var(--gray-100)"
                    : "none",
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: avatarColor.bg,
                  color: avatarColor.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                  border: `2px solid ${avatarColor.color}`,
                }}
              >
                {initials}
              </div>

              {/* Lead Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 2,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--gray-900)",
                    }}
                  >
                    {followup.first_name} {followup.last_name}
                  </div>
                  <span className={priorityBadge.label}>
                    {priorityBadge.text}
                  </span>
                </div>

                {/* Lead Details */}
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    fontSize: 11,
                    color: "var(--gray-500)",
                  }}
                >
                  {followup.phone && (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 3 }}
                    >
                      <Phone size={11} />
                      {followup.phone}
                    </div>
                  )}
                  {followup.desired_class && (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 3 }}
                    >
                      <span>📚</span>
                      {followup.desired_class}
                    </div>
                  )}
                </div>
              </div>

              {/* Time & Status */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "var(--gray-600)",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={12} />
                  {formatFollowupDate(followup.next_follow_up_date)}
                </div>
              </div>
            </div>
          );
        })}

        {/* View All Button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--primary)",
            marginTop: 12,
            cursor: "pointer",
          }}
          onClick={onViewAll}
          role="button"
          tabIndex="0"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onViewAll?.();
            }
          }}
        >
          View All <ArrowRight size={14} />
        </div>
      </div>
    </div>
  );
};

export default UpcomingFollowups;
