import dashboardService from '../services/dashboardService.js';

export async function getDashboardStats(req, res) {
  try {
    const start = Date.now();
    let schoolId = req.user?.school_id || req.query.schoolId || req.body.schoolId;
    if (!schoolId) {
      schoolId = 1;
    }
    console.log(`🚀 [Dashboard] Starting stats fetch for schoolId: ${schoolId}...`);

    const results = await Promise.all([
      dashboardService.getTotalInquiries(schoolId),
      dashboardService.getConversionRate(schoolId),
      dashboardService.getActiveLeads(schoolId),
      dashboardService.getEnrolledStudents(schoolId),
      dashboardService.getPendingApplications(schoolId),
      dashboardService.getOffersSent(schoolId),
      dashboardService.getFeesCollected(schoolId)
    ]);

    const [
      totalInquiries,
      conversionRate,
      activeLeads,
      enrolledStudents,
      pendingApplications,
      offersSent,
      feesCollected
    ] = results;

    const duration = Date.now() - start;
    console.log(`✅ [Dashboard] Stats fetched successfully in ${duration}ms`);

    const response = {
      totalInquiries,
      conversionRate,
      activeLeads,
      enrolledStudents,
      pendingApplications,
      offersSent,
      feesCollected
    };
    console.log('📤 [Dashboard] Sending response to frontend:', response);
    res.json(response);
  } catch (err) {
    console.error('❌ [Dashboard] stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats', detail: err.message });
  }
}

export async function getMonthlyTrend(req, res) {
  try {
    const start = Date.now();
    let schoolId = req.user?.school_id || req.query.schoolId || req.body.schoolId;
    if (!schoolId) {
      schoolId = 1;
    }
    console.log(`🚀 [Dashboard] Fetching monthly trend for schoolId: ${schoolId}...`);

    const data = await dashboardService.getMonthlyTrend(schoolId);

    const duration = Date.now() - start;
    console.log(`✅ [Dashboard] Monthly trend fetched successfully in ${duration}ms`);

    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('❌ [Dashboard] monthly trend error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch monthly trend', detail: err.message });
  }
}

export async function getGradeDistribution(req, res) {
  try {
    let schoolId = req.user?.school_id || req.query.schoolId || req.body.schoolId;
    if (!schoolId) {
      schoolId = 1;
    }

    const data = await dashboardService.getGradeDistribution(schoolId);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('❌ [Dashboard] grade distribution error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch grade distribution', detail: err.message });
  }
}

export async function getCounselorPerformance(req, res) {
  try {
    let schoolId = req.user?.school_id || req.query.schoolId || req.body.schoolId;
    if (!schoolId) {
      schoolId = 1;
    }

    const data = await dashboardService.getCounselorPerformance(schoolId);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('❌ [Dashboard] counselor performance error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch counselor performance', detail: err.message });
  }
}
