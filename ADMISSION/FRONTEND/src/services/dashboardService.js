// Dashboard API integration for fetching stats and funnel data
import axios from 'axios';
import { getAuthHeader } from '../utils/authToken';

/**
 * Fetch dashboard stats (inquiries, conversion, leads, etc.)
 * GET /api/dashboard
 */
export async function getDashboardStats(signal) {
  const { data } = await axios.get('/api/dashboard', {
    signal,
    headers: getAuthHeader() || undefined,
  });
  return data;
}

/**
 * Fetch funnel data (inquiry, contacted, interested, etc.)
 * GET /api/dashboard/funnel
 */
export async function getFunnelData(signal) {
  const { data } = await axios.get('/api/dashboard/funnel', {
    signal,
    headers: getAuthHeader() || undefined,
  });
  return data;
}

/**
 * Fetch monthly trend for inquiries and enrollments
 * GET /api/dashboard/monthly-trend
 */
export async function getMonthlyTrend(signal) {
  const { data } = await axios.get('/api/dashboard/monthly-trend', {
    signal,
    headers: getAuthHeader() || undefined,
  });
  return data;
}

export async function getGradeDistribution(signal) {
  const { data } = await axios.get('/api/dashboard/grade-distribution', {
    signal,
    headers: getAuthHeader() || undefined,
  });
  return data;
}

export async function getCounselorPerformance(signal) {
  const { data } = await axios.get('/api/dashboard/counselor-performance', {
    signal,
    headers: getAuthHeader() || undefined,
  });
  return data;
}

/**
 * Check backend health status
 * GET /api/health
 */
export async function checkBackendHealth(signal) {
  const { data } = await axios.get('/api/health', { signal });
  return data;
}
