/**
 * src/controllers/dashboardController.js
 * Dashboard and Reports endpoints. The school always comes from the token
 * (requireSchool -> req.schoolId); a school id in the query or body is ignored.
 * Optional ?period=week|month|quarter|year|all (default all).
 */
import dashboardService from '../services/dashboardService.js';

const PERIODS = new Set(['week', 'month', 'quarter', 'year', 'all']);
const readPeriod = (req) => (PERIODS.has(req.query.period) ? req.query.period : 'all');

const handle = (label, fn) => async (req, res) => {
  try {
    const data = await fn(req);
    res.json({ success: true, data });
  } catch (err) {
    console.error(`[Dashboard] ${label} error:`, err.message);
    res.status(500).json({ success: false, message: `Failed to load ${label}` });
  }
};

// Kept as a flat object (not wrapped in data) because the Dashboard page reads it directly
export async function getDashboardStats(req, res) {
  try {
    res.json(await dashboardService.getStats(req.schoolId, readPeriod(req)));
  } catch (err) {
    console.error('[Dashboard] stats error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load dashboard stats' });
  }
}

// Flat object too, for the same reason
export async function getFunnel(req, res) {
  try {
    res.json(await dashboardService.getFunnel(req.schoolId, readPeriod(req)));
  } catch (err) {
    console.error('[Dashboard] funnel error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load admission funnel' });
  }
}

export const getMonthlyTrend = handle('monthly trend', (req) =>
  dashboardService.getMonthlyTrend(req.schoolId, readPeriod(req))
);

export const getGradeDistribution = handle('grade distribution', (req) =>
  dashboardService.getGradeDistribution(req.schoolId, readPeriod(req))
);

export const getCounselorPerformance = handle('counselor performance', (req) =>
  dashboardService.getCounselorPerformance(req.schoolId, readPeriod(req))
);

export const getInactivityAlerts = handle('inactivity alerts', (req) => {
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 365);
  return dashboardService.getInactivityAlerts(req.schoolId, days);
});
