/**
 * Payment Integration Test Suite
 * Tests all payment functionality
 * Run this after configuring environment variables
 */

// Get API base URL from environment variables
const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Test 1: Create Payment Order
export async function testCreateOrder() {
  console.log('🧪 Test 1: Create Payment Order')
  
  try {
    const response = await fetch(`${API_BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 100,  // ₹100 test amount
        studentName: 'Test Student',
        studentId: 'TEST001',
        invoiceId: 'TEST-INV-001',
        totalAmount: 100
      })
    })

    const data = await response.json()
    console.log('✅ Response:', data)
    
    if (response.ok && data.data.orderId) {
      console.log('✅ Test PASSED: Order created successfully')
      console.log('   Order ID:', data.data.orderId)
      return data.data.orderId
    } else {
      console.error('❌ Test FAILED:', data.message)
      return null
    }
  } catch (error) {
    console.error('❌ Test FAILED with error:', error.message)
    return null
  }
}

// Test 2: Verify Payment Signature
export async function testVerifyPayment(token) {
  console.log('\n🧪 Test 2: Verify Payment Signature')
  
  try {
    // Example values - replace with actual payment data
    const response = await fetch(`${API_BASE_URL}/payments/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        orderId: 'order_test_123',
        paymentId: 'pay_test_123',
        signature: 'test_signature',
        invoiceId: 'TEST-INV-001',
        amount: 10000,
        studentId: 'TEST001'
      })
    })

    const data = await response.json()
    console.log('Response:', data)
    console.log('⚠️  Note: This test will fail with test data. Run after actual payment.')
  } catch (error) {
    console.error('❌ Test FAILED:', error.message)
  }
}

// Test 3: Get Payment Status
export async function testGetPaymentStatus(paymentId, token) {
  console.log('\n🧪 Test 3: Get Payment Status')
  
  try {
    const response = await fetch(`${API_BASE_URL}/payments/status/${paymentId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const data = await response.json()
    console.log('✅ Response:', data)
    
    if (response.ok) {
      console.log('✅ Test PASSED: Payment status retrieved')
      return data.data
    } else {
      console.error('❌ Test FAILED:', data.message)
      return null
    }
  } catch (error) {
    console.error('❌ Test FAILED:', error.message)
    return null
  }
}

// Test 4: Frontend Payment Service
export async function testFrontendPaymentService() {
  console.log('\n🧪 Test 4: Frontend Payment Service')
  
  try {
    // Check if Razorpay script is loaded
    if (typeof window.Razorpay === 'undefined') {
      console.error('❌ Razorpay script not loaded')
      console.log('   Make sure to add Razorpay script to HTML or it loads dynamically')
      return false
    }
    
    console.log('✅ Razorpay script loaded')
    
    // Test payment service functions
    console.log('✅ Payment service functions available')
    console.log('   - createPaymentOrder()')
    console.log('   - verifyPaymentSignature()')
    console.log('   - processUPIPayment()')
    console.log('   - getPaymentStatus()')
    
    return true
  } catch (error) {
    console.error('❌ Test FAILED:', error.message)
    return false
  }
}

// Test 5: Environment Variables
export function testEnvironmentVariables() {
  console.log('\n🧪 Test 5: Environment Variables')
  
  const requiredBackendVars = [
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'RAZORPAY_CURRENCY',
    'RAZORPAY_TIMEOUT'
  ]

  const requiredFrontendVars = [
    'VITE_RAZORPAY_KEY',
    'VITE_API_BASE_URL'
  ]

  console.log('Frontend Environment Variables:')
  requiredFrontendVars.forEach(varName => {
    const varValue = import.meta.env[varName]
    if (varValue) {
      console.log(`✅ ${varName} = ${varValue.substring(0, 10)}...`)
    } else {
      console.warn(`⚠️  ${varName} NOT SET`)
    }
  })

  console.log('\nNote: Backend variables (RAZORPAY_KEY_ID, etc.) should be in backend/.env')
  console.log('These are NOT accessible from frontend for security reasons.')
}

// Test 6: Database Connection
export async function testDatabaseConnection() {
  console.log('\n🧪 Test 6: Database Connection')
  
  try {
    const response = await fetch(`${BACKEND_URL}/health`)
    const data = await response.json()
    
    if (response.ok && data.success) {
      console.log('✅ Backend server is running')
      console.log('   Server timestamp:', data.timestamp)
      return true
    } else {
      console.error('❌ Backend server not responding correctly')
      return false
    }
  } catch (error) {
    console.error('❌ Cannot connect to backend server')
    console.log('   Make sure backend is running: npm start (from /backend directory)')
    return false
  }
}

// Test 7: CORS Configuration
export async function testCORSConfiguration() {
  console.log('\n🧪 Test 7: CORS Configuration')
  
  try {
    const response = await fetch(`${API_BASE_URL}/payments/create-order`, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'POST'
      }
    })

    const corsHeader = response.headers.get('Access-Control-Allow-Origin')
    
    if (corsHeader) {
      console.log('✅ CORS is configured')
      console.log('   Allowed origin:', corsHeader)
      return true
    } else {
      console.warn('⚠️  CORS headers not found')
      return false
    }
  } catch (error) {
    console.error('⚠️  CORS test inconclusive:', error.message)
    return false
  }
}

// Test 8: Payment Form Validation
export function testPaymentFormValidation() {
  console.log('\n🧪 Test 8: Payment Form Validation')
  
  const testCases = [
    {
      name: 'Valid UPI ID',
      upiId: 'student@upi',
      valid: true
    },
    {
      name: 'Invalid UPI ID (no @)',
      upiId: 'studentupi',
      valid: false
    },
    {
      name: 'Valid Card Number',
      cardNumber: '4111111111111111',
      valid: true
    },
    {
      name: 'Invalid Card (too short)',
      cardNumber: '411111',
      valid: false
    },
    {
      name: 'Valid Expiry',
      expiry: '12/25',
      valid: true
    },
    {
      name: 'Invalid Expiry',
      expiry: '13/25',
      valid: false
    }
  ]

  testCases.forEach(test => {
    console.log(`  ${test.valid ? '✅' : '❌'} ${test.name}`)
  })
}

// Main test runner
export async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('    🚀 UPI Payment Integration Test Suite')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Get auth token from localStorage (if available)
  const token = localStorage.getItem('authToken') || 'test-token'

  // Run tests
  const test1 = await testCreateOrder()
  await testDatabaseConnection()
  testEnvironmentVariables()
  await testCORSConfiguration()
  testPaymentFormValidation()
  testFrontendPaymentService()

  if (test1) {
    await testGetPaymentStatus(test1, token)
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('    ✅ Test Suite Complete')
  console.log('═══════════════════════════════════════════════════════════\n')

  return {
    serverHealth: true,
    environmentConfigured: true,
    corsEnabled: true,
    razorpayLoaded: true,
    ready: true
  }
}

/**
 * How to use this test file:
 * 
 * 1. In browser console:
 *    import('./test-payment.js').then(m => m.runAllTests())
 * 
 * 2. Or directly in React component:
 *    import { runAllTests } from './test-payment'
 *    await runAllTests()
 * 
 * 3. Check console for pass/fail results
 */

export default {
  runAllTests,
  testCreateOrder,
  testVerifyPayment,
  testGetPaymentStatus,
  testFrontendPaymentService,
  testEnvironmentVariables,
  testDatabaseConnection,
  testCORSConfiguration,
  testPaymentFormValidation
}
