// Dashboard API integration for fetching stats and funnel data
import axios from 'axios';
import { getAuthHeader } from '../utils/authToken';

/**
 * Fetch dashboard stats (inquiries, conversion, leads, etc.)
 * GET /api/dashboard
 */
export async function getDashboardStats(signal, period) {
  const { data } = await axios.get('/api/dashboard', {
    signal,
    params: period ? { period } : undefined,
    headers: getAuthHeader() || undefined,
  });
  return data;
}

/**
 * Fetch funnel data (inquiry, contacted, interested, etc.)
 * GET /api/dashboard/funnel
 */
export async function getFunnelData(signal, period) {
  const { data } = await axios.get('/api/dashboard/funnel', {
    signal,
    params: period ? { period } : undefined,
    headers: getAuthHeader() || undefined,
  });
  return data;
}

/**
 * Fetch monthly trend for inquiries and enrollments
 * GET /api/dashboard/monthly-trend
 */
export async function getMonthlyTrend(signal, period) {
  const { data } = await axios.get('/api/dashboard/monthly-trend', {
    signal,
    params: period ? { period } : undefined,
    headers: getAuthHeader() || undefined,
  });
  return data;
}

export async function getGradeDistribution(signal, period) {
  const { data } = await axios.get('/api/dashboard/grade-distribution', {
    signal,
    params: period ? { period } : undefined,
    headers: getAuthHeader() || undefined,
  });
  return data;
}

export async function getCounselorPerformance(signal, period) {
  const { data } = await axios.get('/api/dashboard/counselor-performance', {
    signal,
    params: period ? { period } : undefined,
    headers: getAuthHeader() || undefined,
  });
  return data;
}

/**
 * Open leads with no contact for 7+ days
 * GET /api/dashboard/inactivity-alerts
 */
export async function getInactivityAlerts(signal) {
  const { data } = await axios.get('/api/dashboard/inactivity-alerts', {
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
