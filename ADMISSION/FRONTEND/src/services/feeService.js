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
    console.error('Error generating invoice:', error);
    throw error;
  }
}