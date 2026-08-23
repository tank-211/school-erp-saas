const fs = require('fs');

let content = fs.readFileSync('Frontend_AA/src/pages/Counseling.jsx', 'utf8');

const oldUseEffect = `  // ── Data Fetching (useEffect) ──────────────────────────────
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch stats and today's visits in parallel
        const [statsResponse, upcomingResponse, missedResponse, leadsResponse] = await Promise.all([
          CounselingService.getDashboardStats(),
          CounselingService.getFutureVisits(),
          CounselingService.getMissedVisits(),
          CounselingService.getAssignedLeads(),
        ]);

        // Handle stats response
        if (statsResponse.success) {
          setDashboardStats({
            assignedLeads: statsResponse.data.assignedLeads || 0,
            upcomingVisits: statsResponse.data.upcomingVisits || 0,
            pendingTasks: statsResponse.data.pendingTasks || 0,
          });
        } else {
          throw new Error(
            statsResponse.message || "Failed to fetch dashboard stats",
          );
        }

        // Handle upcoming visits response
        if (upcomingResponse.success) {
          const formattedVisits = (upcomingResponse.data || []).map((visit) => ({
            id: visit.id,
            student:
              visit.student_name ||
              visit.visitor_name ||
              \`\${visit.first_name || ""} \${visit.last_name || ""}\`.trim(),
            visitor: visit.visitor_name || "Unknown",
            grade: visit.grade || "N/A",
            date: formatDate(visit.visit_date),
            time: formatTime(visit.start_time || visit.visit_time || ""),
            leadId: visit.lead_id,
            status: visit.status,
          }));
          setUpcomingVisits(formattedVisits);
        } else {
          throw new Error(upcomingResponse.message || "Failed to fetch upcoming visits");
        }

        // Handle missed visits response
        if (missedResponse.success) {
          const formattedVisits = (missedResponse.data || []).map((visit) => ({
            id: visit.id,
            student:
              visit.student_name ||
              visit.visitor_name ||
              \`\${visit.first_name || ""} \${visit.last_name || ""}\`.trim(),
            visitor: visit.visitor_name || "Unknown",
            grade: visit.grade || "N/A",
            date: formatDate(visit.visit_date),
            time: formatTime(visit.start_time || visit.visit_time || ""),
            leadId: visit.lead_id,
            status: visit.status,
          }));
          setMissedVisits(formattedVisits);
        } else {
          throw new Error(missedResponse.message || "Failed to fetch missed visits");
        }

        if (leadsResponse.success) {
          const formattedLeads = (leadsResponse.data || []).map((lead) => ({
            id: lead.lead_id,
            name: lead.student_name || "Unknown",
            grade: lead.desired_class || "N/A",
            priority: lead.follow_up_status === "hot" ? "high" : "medium",
            nextAction: "Follow-up",
            dueDate: lead.created_at
              ? new Date(lead.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "Today",
            phone: lead.phone,
            email: lead.email,
            parentName: lead.parent_name,
            parentPhone: lead.parent_phone,
          }));
          setAssignedLeads(formattedLeads);
        } else {
          throw new Error(
            leadsResponse.message || "Failed to fetch assigned leads",
          );
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);

        // Handle 401 Unauthorized - redirect to login
        if (err.code === "UNAUTHORIZED" || err.status === 401) {
          console.error("🔐 Authentication failed - redirecting to login");
          localStorage.removeItem("token");
          localStorage.removeItem("user_data");
          navigate("/login", { replace: true, state: { from: "/counseling" } });
          return;
        }

        // Handle no token error
        if (err.code === "NO_TOKEN") {
          console.error("🔐 No token found - redirecting to login");
          navigate("/login", { replace: true, state: { from: "/counseling" } });
          return;
        }

        // Handle network error
        if (err.code === "NETWORK_ERROR") {
          setError(
            "Cannot reach the server. Please check your connection and try again.",
          );
          setLoading(false);
          return;
        }

        // Generic error message
        setError(
          err.message || "Failed to load dashboard data. Please try again.",
        );
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);`;


const newUseEffect = `  // ── Data Fetching ──────────────────────────────────────────
  const refreshVisits = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      // Fetch stats and visits in parallel using updated fetch aliases
      const [statsResponse, upcomingResponse, missedResponse, leadsResponse] = await Promise.all([
        CounselingService.getDashboardStats(),
        CounselingService.fetchFutureVisits(),
        CounselingService.fetchMissedVisits(),
        CounselingService.getAssignedLeads(),
      ]);

      if (statsResponse.success) {
        setDashboardStats({
          assignedLeads: statsResponse.data.assignedLeads || 0,
          upcomingVisits: statsResponse.data.upcomingVisits || 0,
          pendingTasks: statsResponse.data.pendingTasks || 0,
        });
      } else {
        throw new Error(statsResponse.message || "Failed to fetch dashboard stats");
      }

      if (upcomingResponse.success) {
        const formattedVisits = (upcomingResponse.data || []).map((visit) => ({
          id: visit.id,
          student:
            visit.student_name ||
            visit.visitor_name ||
            \`\${visit.first_name || ""} \${visit.last_name || ""}\`.trim(),
          visitor: visit.visitor_name || "Unknown",
          grade: visit.grade || "N/A",
          date: formatDate(visit.visit_date),
          rawDate: visit.visit_date,
          time: formatTime(visit.start_time || visit.visit_time || ""),
          leadId: visit.lead_id,
          status: visit.status,
        }));
        
        // Sorting: Ensure 'Future Visits' are sorted by date
        formattedVisits.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
        
        setUpcomingVisits(formattedVisits);
      } else {
        throw new Error(upcomingResponse.message || "Failed to fetch upcoming visits");
      }

      if (missedResponse.success) {
        const formattedVisits = (missedResponse.data || []).map((visit) => ({
          id: visit.id,
          student:
            visit.student_name ||
            visit.visitor_name ||
            \`\${visit.first_name || ""} \${visit.last_name || ""}\`.trim(),
          visitor: visit.visitor_name || "Unknown",
          grade: visit.grade || "N/A",
          date: formatDate(visit.visit_date),
          rawDate: visit.visit_date,
          time: formatTime(visit.start_time || visit.visit_time || ""),
          leadId: visit.lead_id,
          status: visit.status,
        }));
        
        // Sorting for missed visits as well
        formattedVisits.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
        
        setMissedVisits(formattedVisits);
      } else {
        throw new Error(missedResponse.message || "Failed to fetch missed visits");
      }

      if (leadsResponse.success) {
        const formattedLeads = (leadsResponse.data || []).map((lead) => ({
          id: lead.lead_id,
          name: lead.student_name || "Unknown",
          grade: lead.desired_class || "N/A",
          priority: lead.follow_up_status === "hot" ? "high" : "medium",
          nextAction: "Follow-up",
          dueDate: lead.created_at
            ? new Date(lead.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "Today",
          phone: lead.phone,
          email: lead.email,
          parentName: lead.parent_name,
          parentPhone: lead.parent_phone,
        }));
        setAssignedLeads(formattedLeads);
      } else {
        throw new Error(leadsResponse.message || "Failed to fetch assigned leads");
      }

      if (showLoading) setLoading(false);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);

      if (err.code === "UNAUTHORIZED" || err.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user_data");
        navigate("/login", { replace: true, state: { from: "/counseling" } });
        return;
      }

      if (err.code === "NO_TOKEN") {
        navigate("/login", { replace: true, state: { from: "/counseling" } });
        return;
      }

      if (err.code === "NETWORK_ERROR") {
        setError("Cannot reach the server. Please check your connection and try again.");
        if (showLoading) setLoading(false);
        return;
      }

      setError(err.message || "Failed to load dashboard data. Please try again.");
      if (showLoading) setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    refreshVisits(true);
  }, [refreshVisits]);`;

content = content.replace(oldUseEffect, newUseEffect);

const oldHandlers = `  // ── Action Handlers ────────────────────────────────────────
  const handleMarkVisited = async (visitId) => {
    try {
      await CounselingService.updateVisitStatus(visitId, "visited");
      setUpcomingVisits((prev) => prev.filter((v) => v.id !== visitId));
      setMissedVisits((prev) => prev.filter((v) => v.id !== visitId));
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleDeleteVisit = async (visitId) => {
    if (window.confirm("Are you sure you want to delete this visit?")) {
      try {
        await CounselingService.deleteCampusVisit(visitId);
        setUpcomingVisits((prev) => prev.filter((v) => v.id !== visitId));
        setMissedVisits((prev) => prev.filter((v) => v.id !== visitId));
      } catch (err) {
        alert("Failed to delete visit");
      }
    }
  };`;

const newHandlers = `  // ── Action Handlers ────────────────────────────────────────
  const handleMarkVisited = async (visitId) => {
    try {
      await CounselingService.updateVisitStatus(visitId, "visited");
      // Re-fetch data to reflect changes instantly on the UI
      refreshVisits(false);
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleDeleteVisit = async (visitId) => {
    if (window.confirm("Are you sure you want to delete this visit?")) {
      try {
        await CounselingService.deleteCampusVisit(visitId);
        // Re-fetch data to reflect changes instantly on the UI
        refreshVisits(false);
      } catch (err) {
        alert("Failed to delete visit");
      }
    }
  };`;

content = content.replace(oldHandlers, newHandlers);

fs.writeFileSync('Frontend_AA/src/pages/Counseling.jsx', content, 'utf8');
console.log("Patched 2 successfully");
