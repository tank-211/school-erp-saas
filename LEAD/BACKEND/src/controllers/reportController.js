import {
  getSalesReport,
  getPerformanceReport,
  getLeadReport,
  getLookups,
} from "../services/reportService.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { serializeBigInt } from "../utils/bigintSerializer.js";

// Every report is for the caller's school (from the verified token)
const run = (fn, label) => async (req, res) => {
  const schoolId = req.user?.schoolId;
  if (!/^\d+$/.test(String(schoolId ?? ""))) {
    return res.status(403).json(errorResponse("This report requires a school user account."));
  }
  try {
    const data = await fn(schoolId, req.query || {});
    res.json(successResponse(serializeBigInt(data), `${label} retrieved`));
  } catch (error) {
    res.status(error.statusCode || error.status || 500).json(errorResponse(error.message || `Failed to load ${label.toLowerCase()}`));
  }
};

export const salesReport = run((sid, q) => getSalesReport(sid, { academicYearId: q.academic_year_id }), "Sales report");
export const performanceReport = run((sid, q) => getPerformanceReport(sid, q), "Performance report");
export const leadReport = run((sid, q) => getLeadReport(sid, q), "Lead report");
export const lookups = run((sid) => getLookups(sid), "Lookups");
