// Shared client: sends the token and refreshes it on 401, like every other call
import apiClient from './apiService';

// Reports can take longer to build than the default API timeout
const DOWNLOAD_TIMEOUT = 60000;

// Export Report Service
export const reportService = {
  /**
   * Export comprehensive PDF report
   */
  async exportPDF() {
    try {
      console.log('📄 Starting PDF export...');
      const response = await apiClient.get('/reports/export', {
        responseType: 'blob',
        timeout: DOWNLOAD_TIMEOUT,
      });
      
      // Create blob link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Fee_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ PDF exported successfully');
      return { success: true, message: 'Report exported successfully' };
    } catch (error) {
      console.error('❌ Error exporting PDF:', error);
      const errorMessage = await this.getErrorMessage(error);
      return { 
        success: false, 
        message: errorMessage,
        details: error.response?.data
      };
    }
  },

  /**
   * Export dashboard statistics as JSON
   */
  async getDashboardStats() {
    try {
      console.log('📊 Fetching dashboard stats...');
      const response = await apiClient.get('/reports/dashboard-stats');
      console.log('✅ Dashboard stats fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      throw error;
    }
  },

  /**
   * Export transactions as CSV
   */
  async exportTransactionsCSV(limit = 50) {
    try {
      console.log('💳 Starting transactions CSV export...');
      const response = await apiClient.get('/reports/transactions/csv', {
        params: { limit },
        responseType: 'blob',
        timeout: DOWNLOAD_TIMEOUT,
      });
      
      // Create blob link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Transactions exported as CSV');
      return { success: true, message: 'Transactions exported successfully' };
    } catch (error) {
      console.error('❌ Error exporting transactions:', error);
      const errorMessage = await this.getErrorMessage(error);
      return { 
        success: false, 
        message: errorMessage,
        details: error.response?.data
      };
    }
  },

  /**
   * Export pending payments as CSV
   */
  async exportPendingPaymentsCSV(limit = 100) {
    try {
      console.log('⏳ Starting pending payments CSV export...');
      const response = await apiClient.get('/reports/pending-payments/csv', {
        params: { limit },
        responseType: 'blob',
        timeout: DOWNLOAD_TIMEOUT,
      });
      
      // Create blob link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Pending_Payments_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Pending payments exported as CSV');
      return { success: true, message: 'Pending payments exported successfully' };
    } catch (error) {
      console.error('❌ Error exporting pending payments:', error);
      const errorMessage = await this.getErrorMessage(error);
      return { 
        success: false, 
        message: errorMessage,
        details: error.response?.data
      };
    }
  },

  /**
   * Export refund requests as CSV
   */
  async exportRefundsCSV(limit = 50) {
    try {
      console.log('💰 Starting refunds CSV export...');
      const response = await apiClient.get('/reports/refunds/csv', {
        params: { limit },
        responseType: 'blob',
        timeout: DOWNLOAD_TIMEOUT,
      });
      
      // Create blob link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Refund_Requests_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Refund requests exported as CSV');
      return { success: true, message: 'Refund requests exported successfully' };
    } catch (error) {
      console.error('❌ Error exporting refunds:', error);
      const errorMessage = await this.getErrorMessage(error);
      return { 
        success: false, 
        message: errorMessage,
        details: error.response?.data
      };
    }
  },

  /**
   * Get available report formats
   */
  async getAvailableFormats() {
    try {
      console.log('📋 Fetching available report formats...');
      const response = await apiClient.get('/reports/formats');
      console.log('✅ Available formats:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching available formats:', error);
      throw error;
    }
  },

  /**
   * Helper method to extract error message
   */
  async getErrorMessage(error) {
    // Downloads use responseType 'blob', so an error body arrives as a Blob:
    // read it to show the server's own message
    let serverMessage = error.response?.data?.message
    const body = error.response?.data
    if (!serverMessage && body && typeof body.text === 'function') {
      try {
        serverMessage = JSON.parse(await body.text())?.message
      } catch {
        // not JSON
      }
    }
    if (serverMessage) return serverMessage
    if (error.response?.status === 401) {
      return 'Authentication failed. Please login again. (401 Unauthorized)';
    }
    if (error.response?.status === 403) {
      return 'You do not have permission to access this resource. (403 Forbidden)';
    }
    if (error.response?.status === 404) {
      return 'Report endpoint not found. (404 Not Found)';
    }
    if (error.response?.status === 500) {
      return `Server error: ${error.response?.data?.message || 'Internal Server Error'}`;
    }
    if (error.message === 'Network Error') {
      return 'Network error. Unable to reach the server. Is the backend running?';
    }
    return error.message || 'An error occurred while exporting the report';
  }
};


export default reportService;
