// Fee API integration for invoice management
import axios from 'axios';
import { getAuthHeader } from '../utils/authToken';

/**
 * Fetch dashboard statistics for fees
 * GET /api/fees/dashboard-stats
 */
export async function getFeeDashboardStats() {
  try {
    const response = await axios.get('/api/fees/dashboard-stats', {
      headers: getAuthHeader(),
    });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to fetch fee dashboard stats');
  } catch (error) {
    console.error('Error fetching fee dashboard stats:', error);
    throw error;
  }
}

/**
 * Fetch transaction list
 * GET /api/fees/transactions
 */
export async function getFeeTransactions() {
  try {
    const response = await axios.get('/api/fees/transactions', {
      headers: getAuthHeader(),
    });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to fetch fee transactions');
  } catch (error) {
    console.error('Error fetching fee transactions:', error);
    throw error;
  }
}

/**
 * Fetch invoice details by ID
 * GET /api/fees/invoice/:id
 */
export async function getInvoiceDetails(invoiceId) {
  try {
    const response = await axios.get(`/api/fees/invoice/${invoiceId}`, {
      headers: getAuthHeader(),
    });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to fetch invoice details');
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    throw error;
  }
}

/**
 * Generate new invoice
 * POST /api/fees/generate-invoice
 */
export async function generateInvoice(invoiceData) {
  try {
    const response = await axios.post('/api/fees/generate-invoice', invoiceData, {
      headers: getAuthHeader(),
    });
    if (response.data && response.data.success) {
      return response.data;
    }
    throw new Error(response.data?.message || 'Failed to generate invoice');
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to generate invoice');
  }
}

/**
 * Students with fees assigned but not invoiced yet
 * GET /api/fees/uninvoiced
 */
export async function getUninvoicedFees() {
  try {
    const response = await axios.get('/api/fees/uninvoiced', { headers: getAuthHeader() });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to load fees');
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to load fees');
  }
}
/**
 * Completed admissions that have no fees assigned yet
 * GET /api/fees/admissions-without-fees
 */
export async function getAdmissionsWithoutFees() {
  try {
    const response = await axios.get('/api/fees/admissions-without-fees', {
      headers: getAuthHeader(),
    });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to load admissions without fees');
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to load admissions without fees');
  }
}

/**
 * Assign fees and create invoices (admin only)
 * POST /api/fees/assign-admission-fees  { admission_id } or { all: true }
 */
export async function assignAdmissionFees(body) {
  try {
    const response = await axios.post('/api/fees/assign-admission-fees', body, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to assign fees');
  }
}
