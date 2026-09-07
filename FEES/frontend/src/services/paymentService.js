/**
 * Payment Service - Frontend
 * Handles communication with backend payment APIs and Razorpay integration
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Create a payment order on the backend
 * @param {Object} orderData - { amount, studentName, studentId, invoiceId, totalAmount }
 * @returns {Promise<Object>} - { orderId, amount, currency, ... }
 */
export const createPaymentOrder = async (orderData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create payment order');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error creating payment order:', error);
    throw error;
  }
};

/**
 * Verify payment signature with backend
 * @param {Object} paymentData - { orderId, paymentId, signature, invoiceId, amount, studentId }
 * @returns {Promise<Object>} - Verified payment details
 */
export const verifyPaymentSignature = async (paymentData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Payment verification failed');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

/**
 * Get payment status from backend
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} - Payment details
 */
export const getPaymentStatus = async (paymentId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/status/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch payment status');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching payment status:', error);
    throw error;
  }
};

/**
 * Initialize Razorpay payment gateway
 * @param {Object} options - Razorpay configuration
 * @returns {Promise<Object>} - Razorpay payment result
 */
export const initializeRazorpayPayment = (options) => {
  return new Promise((resolve, reject) => {
    const razorpay = new window.Razorpay({
      ...options,
      handler: (response) => {
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          reject(new Error('Payment window was closed'));
        },
      },
    });

    razorpay.open();
  });
};

/**
 * Process UPI payment
 * @param {Object} paymentConfig - { orderId, amount, studentName, studentId, invoiceId, totalAmount }
 * @param {string} authToken - User's authentication token
 * @returns {Promise<Object>} - Payment result
 */
export const processUPIPayment = async (paymentConfig, authToken) => {
  try {
    const { orderId, amount, studentName, studentId, invoiceId, totalAmount } = paymentConfig;

    // Razorpay options for UPI payment
    const razorpayOptions = {
      key: import.meta.env.VITE_RAZORPAY_KEY, // From environment variables
      amount: Math.round(amount * 100), // Amount in paise
      currency: 'INR',
      order_id: orderId,
      name: 'School Fee Payment',
      description: `Fee payment for ${studentName}`,
      prefill: {
        name: studentName,
        email: '', // You can add email if available
        contact: '', // You can add phone if available
      },
      notes: {
        studentId,
        invoiceId,
        orderId,
      },
      theme: {
        color: '#28a745', // Green color for submit button
      },
      method: {
        upi: true, // Show only UPI methods
        card: false,
        netbanking: false,
        wallet: false,
      },
    };

    // Initialize and wait for payment
    const paymentResult = await initializeRazorpayPayment(razorpayOptions);

    // Verify payment signature
    const verificationData = {
      orderId,
      paymentId: paymentResult.razorpay_payment_id,
      signature: paymentResult.razorpay_signature,
      invoiceId,
      amount: Math.round(amount * 100),
      studentId,
    };

    const verifiedPayment = await verifyPaymentSignature(verificationData, authToken);

    return {
      success: true,
      paymentId: paymentResult.razorpay_payment_id,
      orderId,
      verifiedPayment,
    };
  } catch (error) {
    console.error('Error processing UPI payment:', error);
    throw error;
  }
};

/**
 * Generate QR code for UPI payment (alternative to gateway)
 * @param {Object} upiData - { upiId, amount, studentName }
 * @returns {string} - UPI deep link
 */
export const generateUPILink = (upiData) => {
  const { upiId, amount, studentName, invoiceId } = upiData;
  
  // UPI deep link format
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(studentName)}&am=${amount}&tn=${encodeURIComponent(`Fee-${invoiceId}`)}`;
  
  return upiLink;
};

/**
 * Generate QR code using third-party API
 * @param {string} upiLink - UPI deep link
 * @returns {Promise<string>} - QR code image URL
 */
export const generateQRCode = async (upiLink) => {
  try {
    // Using a free QR code API
    const encodedLink = encodeURIComponent(upiLink);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedLink}`;
    
    return qrCodeUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

export default {
  createPaymentOrder,
  verifyPaymentSignature,
  getPaymentStatus,
  initializeRazorpayPayment,
  processUPIPayment,
  generateUPILink,
  generateQRCode,
};
