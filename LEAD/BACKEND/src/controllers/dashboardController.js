import {
  getStatsService,
  getEnrollmentTrendService,
  getStatusDistributionService,
  getTodayOverviewService,
  getGradeDistributionService,
  getRecentActivitiesService
} from "../services/dashboardService.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { serializeBigInt } from "../utils/bigintSerializer.js";

export const getStats = async (req, res) => {
  try {
    const stats = await getStatsService(BigInt(req.user.schoolId));
    res.json(successResponse(serializeBigInt(stats), "Stats retrieved"));
  } catch (error) {
    res.status(500).json(errorResponse(error.message));
  }
};

export const getMetrics = async (req, res) => {
  try {
    const metrics = await getStatsService(BigInt(req.user.schoolId));
    res.json(successResponse(serializeBigInt(metrics), "Metrics retrieved"));
  } catch (error) {
    res.status(500).json(errorResponse(error.message));
  }
};

export const getEnrollmentTrend = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const trend = await getEnrollmentTrendService(BigInt(req.user.schoolId), days);
    res.json(successResponse(trend, "Enrollment trend retrieved"));
  } catch (error) {
    res.status(500).json(errorResponse(error.message));
  }
};

export const getStatusDistribution = async (req, res) => {
  try {
    const distribution = await getStatusDistributionService(BigInt(req.user.schoolId));
    res.json(successResponse(distribution, "Status distribution retrieved"));
  } catch (error) {
    res.status(500).json(errorResponse(error.message));
  }
};

export const getTodayOverview = async (req, res) => {
  try {
    const overview = await getTodayOverviewService(BigInt(req.user.schoolId));
    res.json(successResponse(overview, "Today overview retrieved"));
  } catch (error) {
    res.status(500).json(errorResponse(error.message));
  }
};

export const getGradeDistribution = async (req, res) => {
  try {
    const data = await getGradeDistributionService(BigInt(req.user.schoolId));
    
    res.json({
      success: true,
      data,
      message: "Grade distribution fetched",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};



export const getDashboard = async (req, res) => {
  try {
    const [
      stats,
      enrollmentTrend,
      statusDistribution,
      gradeDistribution,
      todayOverview,
      recentActivities
    ] = await Promise.all([
      getStatsService(BigInt(req.user.schoolId)),
      getEnrollmentTrendService(BigInt(req.user.schoolId)),
      getStatusDistributionService(BigInt(req.user.schoolId)),
      getGradeDistributionService(BigInt(req.user.schoolId)),
      getTodayOverviewService(BigInt(req.user.schoolId)),
      getRecentActivitiesService(BigInt(req.user.schoolId))
    ]);

    return res.json(
      serializeBigInt({
        success: true,
        data: {
          stats,
          enrollmentTrend,
          statusDistribution,
          gradeDistribution,
          todayOverview,
          recentActivities
        },
        message: "Dashboard data retrieved"
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};