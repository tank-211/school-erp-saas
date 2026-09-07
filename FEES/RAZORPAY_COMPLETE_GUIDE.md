# Complete Razorpay Integration Guide for Vite + Node.js/Express

## Table of Contents
1. [Architecture & Security](#architecture--security)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Environment Configuration](#environment-configuration)
5. [Implementation Walkthrough](#implementation-walkthrough)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Architecture & Security

### The Critical Security Principle

**RULE: Secret Key NEVER leaves the backend**

```
┌─────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend (Browser)              Backend (Node.js)           │
│  ───────────────────              ──────────────             │
│  ✓ PUBLIC Key                     ✓ PUBLIC Key              │
│  ✗ NO Secret Key                  ✓ SECRET Key (secure)     │
│  ✓ Payment Modal (Razorpay SDK)   ✓ Signature Verification  │
│                                   ✓ Order Creation          │
│                                                               │
│  Communication:                                              │
│  Frontend → Backend: Only public order details              │
│  Backend → Razorpay: Full order creation (uses secret)      │
│  Razorpay → Frontend: Payment modal & payment details       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Why This Matters

1. **Public Key (expose to frontend):**
   - Used by Razorpay SDK for payment UI
   - Cannot create/verify payments without Secret Key
   - Safe to hardcode in frontend code

2. **Secret Key (NEVER expose):**
   - Used only in backend
   - Creates payment orders on Razorpay servers
   - Verifies payment signatures
   - If leaked, attacker can accept fake payments

3. **Signature Verification:**
   - Razorpay uses HMAC-SHA256 to create signature
   - Only backend (with Secret Key) can verify it
   - Prevents fake payment confirmations

---

## Backend Setup

### 1. Install Required Packages

```bash
npm install razorpay crypto dotenv
```

- `razorpay`: Official SDK to interact with Razorpay API
- `crypto`: Built-in Node.js module for signature verification
- `dotenv`: Load environment variables from .env file

### 2. Environment Variables (.env)

```env
# Razorpay Configuration (Test/Development)
RAZORPAY_KEY_ID=rzp_test_1DP5ibksFWsrxJ
RAZORPAY_KEY_SECRET=test_secret_key_change_in_production
RAZORPAY_WEBHOOK_SECRET=webhook_secret_key_change_in_production

# For Production:
# RAZORPAY_KEY_ID=rzp_live_xxxxx
# RAZORPAY_KEY_SECRET=live_secret_xxxxx
# RAZORPAY_WEBHOOK_SECRET=live_webhook_xxxxx
```

**Get these from:** https://dashboard.razorpay.com/app/keys

### 3. Razorpay Configuration File

**File: `backend/config/razorpay.js`**

```javascript
import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Razorpay instance with Secret Key
// This instance is ONLY used in backend
export const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,           // PUBLIC Key
  key_secret: process.env.RAZORPAY_KEY_SECRET,   // SECRET Key (backend only)
});

// Configuration
export const razorpayConfig = {
  currency: 'INR',
  timeout: 900, // 15 minutes
};

export default razorpayInstance;
```

### 4. Payment Service (Business Logic)

**File: `backend/services/paymentService.js`**

Key functions:
- `createOrder()`: Create Razorpay order using Secret Key
- `verifyPaymentSignature()`: Verify signature using Secret Key
- `getPaymentDetails()`: Fetch payment status from Razorpay
- `refundPayment()`: Process refunds

See `paymentService.js` file for complete implementation.

### 5. Payment Controller (API Routes)

**File: `backend/controllers/paymentController.js`**

Key endpoints:
- `POST /api/payments/create-order`: Create order
- `POST /api/payments/verify`: Verify payment
- `GET /api/payments/status/:paymentId`: Check payment status
- `POST /api/payments/refund`: Process refund
- `POST /api/payments/webhook`: Razorpay webhooks

See `paymentController.js` file for complete implementation.

### 6. Routes Setup

**File: `backend/routes/paymentRoutes.js`**

```javascript
import express from 'express';
import * as paymentController from '../controllers/paymentController.js';

const router = express.Router();

// Public routes (no auth required for initial order creation)
router.post('/create-order', paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);

// Admin routes (require authentication)
router.get('/status/:paymentId', authenticateToken, paymentController.getPaymentStatus);
router.post('/refund', authenticateToken, paymentController.refundPayment);

// Webhook (no auth required - Razorpay calls this)
router.post('/webhook', paymentController.handlePaymentWebhook);

export default router;
```

### 7. Register Routes in Main Server

**File: `backend/server.js`**

```javascript
import paymentRoutes from './routes/paymentRoutes.js';

// Register routes
app.use('/api/payments', paymentRoutes);
```

---

## Frontend Setup

### 1. Environment Variables (.env.local or .env)

**File: `frontend/.env.local`**

```env
# PUBLIC Razorpay Key - Safe to expose
VITE_RAZORPAY_KEY=rzp_test_1DP5ibksFWsrxJ

# Backend API URL
VITE_API_URL=http://localhost:5000/api
```

**Important:**
- Only PUBLIC Key in frontend .env
- NO Secret Key in frontend
- Vite converts `VITE_*` to `import.meta.env.*`

### 2. React Payment Component

**File: `frontend/src/components/RazorpayPaymentModal.jsx`**

See complete implementation file above.

### 3. Usage in Your App

```javascript
import RazorpayPaymentModal from './components/RazorpayPaymentModal';

function PaymentPage() {
  const handlePaymentSuccess = (paymentData) => {
    console.log('Payment successful:', paymentData);
    // Update UI, show confirmation, etc.
  };

  const handlePaymentFailure = (error) => {
    console.error('Payment failed:', error);
    // Show error message
  };

  return (
    <RazorpayPaymentModal
      studentName="John Doe"
      studentId="STU001"
      amount={5000}
      invoiceId="INV2024001"
      totalAmount={10000}
      onSuccess={handlePaymentSuccess}
      onFailure={handlePaymentFailure}
    />
  );
}

export default PaymentPage;
```

---

## Environment Configuration

### Development (.env)

```env
# Backend
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fee_db

# Razorpay - Test Mode
RAZORPAY_KEY_ID=rzp_test_1DP5ibksFWsrxJ
RAZORPAY_KEY_SECRET=test_secret_key
RAZORPAY_WEBHOOK_SECRET=webhook_secret

# Frontend (.env.local)
VITE_RAZORPAY_KEY=rzp_test_1DP5ibksFWsrxJ
VITE_API_URL=http://localhost:5000/api
```

### Production (.env.production)

```env
# Backend
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://prod_user:prod_password@prod_host:5432/fee_db

# Razorpay - Live Mode
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=live_secret_xxxxx
RAZORPAY_WEBHOOK_SECRET=live_webhook_xxxxx

# Frontend (.env.production)
VITE_RAZORPAY_KEY=rzp_live_xxxxx
VITE_API_URL=https://api.yourdomain.com/api
```

**CRITICAL:** 
- Use separate test & live keys
- Never commit .env files to git
- Use .gitignore for .env files
- Rotate keys periodically

---

## Implementation Walkthrough

### Payment Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Pay" button                                    │
│    └─→ Frontend: initiate() function called                    │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 2. Frontend calls Backend: POST /api/payments/create-order     │
│    Body: { amount, studentName, studentId, invoiceId }         │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 3. Backend:                                                    │
│    - Receives order request                                    │
│    - Validates input                                           │
│    - Creates order on Razorpay API using SECRET Key            │
│    - Returns ONLY public Order ID to frontend                  │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 4. Frontend:                                                   │
│    - Receives Order ID                                         │
│    - Loads Razorpay SDK                                        │
│    - Opens Razorpay Payment Modal with Order ID + Public Key   │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 5. User:                                                       │
│    - Sees payment modal (UPI, card, etc.)                      │
│    - Enters payment details                                    │
│    - Completes payment                                         │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 6. Razorpay:                                                   │
│    - Processes payment                                         │
│    - Generates Payment ID                                      │
│    - Creates HMAC-SHA256(orderId|paymentId) signature          │
│    - Sends back to frontend:                                   │
│      {                                                         │
│        razorpay_order_id: "order_xxx",                         │
│        razorpay_payment_id: "pay_xxx",                         │
│        razorpay_signature: "hmac_xxx"                          │
│      }                                                         │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 7. Frontend receives payment data                              │
│    Calls Backend: POST /api/payments/verify                    │
│    Body: { orderId, paymentId, signature, studentId, amount }  │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 8. Backend (MOST CRITICAL STEP):                               │
│    - Receives payment verification request                     │
│    - Uses SECRET Key to verify signature:                      │
│      expectedSignature = HMAC-SHA256(orderId|paymentId)        │
│    - Compares with frontend's signature                        │
│    - If match: Payment is GENUINE                              │
│    - If mismatch: Payment is FAKE (attack attempt)             │
│    - Returns success/failure                                   │
│    - Updates database (mark payment as received)               │
│    - Sends confirmation email                                  │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 9. Frontend:                                                   │
│    - Shows success/failure message                             │
│    - Redirects to receipt or fee payment page                  │
│    - Notifies user                                             │
└────────────────────────────────────────────────────────────────┘
```

### Code Flow Example

```javascript
// Frontend - Step 1: Initiate Payment
const handlePayClick = async () => {
  // Create order on backend (backend uses secret key)
  const orderResponse = await fetch('http://localhost:5000/api/payments/create-order', {
    method: 'POST',
    body: JSON.stringify({
      amount: 5000,
      studentName: 'John Doe',
      studentId: 'STU001',
      invoiceId: 'INV2024001'
    })
  });

  const { data } = await orderResponse.json();
  const { orderId, razorpayKey } = data;

  // Open Razorpay Modal with PUBLIC key + Order ID
  const options = {
    key: razorpayKey,        // PUBLIC key from backend
    order_id: orderId,       // Order ID from backend
    handler: async (response) => {
      // User completed payment - verify on backend
      const verifyResponse = await fetch('http://localhost:5000/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature  // Razorpay signature
        })
      });

      const { success } = await verifyResponse.json();
      // Backend verified using SECRET key - payment is secure
    }
  };

  new Razorpay(options).open();
};
```

---

## Testing

### Test Mode (Development)

Razorpay provides test credentials that don't process real payments:

```env
RAZORPAY_KEY_ID=rzp_test_1DP5ibksFWsrxJ
RAZORPAY_KEY_SECRET=test_secret_key_change_in_production
```

### Test Payment Methods

Use these for testing:

1. **UPI:**
   - Enter any UPI ID (e.g., `test@okhdfcbank`)
   - Accept on device

2. **Card:**
   - Use test card: `4111 1111 1111 1111`
   - Any CVV/Expiry

### Test Scenarios

```bash
# Test successful payment
1. Click Pay
2. Choose UPI
3. Complete transaction

# Test failed payment
1. Click Pay
2. Cancel payment
3. Verify error handling

# Test webhook
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "X-Razorpay-Signature: test-signature" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.captured",
    "payload": {
      "payment": { "entity": { "id": "pay_test" } }
    }
  }'
```

### Using Postman

1. Create POST request to `http://localhost:5000/api/payments/create-order`
2. Body (JSON):
```json
{
  "amount": 100,
  "studentName": "Test Student",
  "studentId": "STU001",
  "invoiceId": "INV001",
  "totalAmount": 5000
}
```
3. Copy `orderId` from response
4. Use orderId with Razorpay test mode

---

## Production Deployment

### 1. Get Live Keys

1. Go to https://dashboard.razorpay.com/app/keys
2. Switch to "Live Mode"
3. Generate live keys
4. Copy KEY_ID and KEY_SECRET

### 2. Update Production .env

```env
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=live_secret_xxxxx
RAZORPAY_WEBHOOK_SECRET=live_webhook_xxxxx
```

### 3. HTTPS Required

Razorpay requires HTTPS in production. Ensure:
- Backend: HTTPS endpoint
- Frontend: HTTPS deployment
- Update CORS origins to production domain

### 4. Update Frontend URLs

```env
# frontend/.env.production
VITE_RAZORPAY_KEY=rzp_live_xxxxx
VITE_API_URL=https://api.yourdomain.com/api
```

### 5. Webhook Configuration

1. Go to Razorpay Dashboard → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/payments/webhook`
3. Select events: `payment.captured`, `payment.failed`
4. Copy webhook secret to .env

### 6. Security Checklist

- [ ] Secret Key in backend .env only
- [ ] NO .env files in git (add to .gitignore)
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Webhook signature verification enabled
- [ ] Database encrypted for sensitive data
- [ ] Logs sanitized (no payment IDs in logs)
- [ ] Rate limiting on payment endpoints
- [ ] Input validation on all endpoints

---

## Troubleshooting

### Common Issues

#### 1. "RAZORPAY_KEY_ID is undefined"
**Problem:** Environment variable not loaded
**Solution:**
```bash
# Check .env file exists
# Verify RAZORPAY_KEY_ID is set
# Restart backend server
# Use: dotenv.config() at top of server.js
```

#### 2. "Razorpay SDK failed to load"
**Problem:** Network issue or CDN blocked
**Solution:**
```javascript
// Add fallback
const script = document.createElement('script');
script.src = 'https://checkout.razorpay.com/v1/checkout.js';
script.onerror = () => console.error('Failed to load Razorpay SDK');
document.body.appendChild(script);
```

#### 3. "Payment signature verification failed"
**Problem:** Secret key mismatch or tampering detected
**Solution:**
```bash
# Verify webhook secret matches RAZORPAY_KEY_SECRET
# Check payment data: orderId|paymentId format
# Ensure HMAC-SHA256 algorithm used
```

#### 4. "Order creation fails"
**Problem:** Amount validation or API error
**Solution:**
```javascript
// Validate amount is positive
if (amount <= 0) throw new Error('Amount must be > 0');

// Check Razorpay quota/limits
// Use test mode to verify
```

#### 5. "CORS Error when calling backend"
**Problem:** Frontend can't reach backend
**Solution:**
```javascript
// In backend/server.js:
app.use(cors({
  origin: ['http://localhost:5173', 'https://yourdomain.com'],
  credentials: true
}));
```

---

## Security Best Practices

### 1. Environment Variables
```bash
# Never commit .env files
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore

# Use secrets manager in production (AWS Secrets Manager, etc.)
```

### 2. Secret Key Protection
```javascript
// ✓ CORRECT: Only in backend
const SECRET_KEY = process.env.RAZORPAY_KEY_SECRET;

// ✗ WRONG: Never in frontend
// const SECRET_KEY = "rzp_live_xxxx"; // BAD!
```

### 3. Signature Verification
```javascript
// Always verify on backend, never on frontend
const isValid = crypto
  .createHmac('sha256', SECRET_KEY)
  .update(`${orderId}|${paymentId}`)
  .digest('hex') === signature;
```

### 4. Input Validation
```javascript
// Always validate on backend
if (amount <= 0) throw new Error('Invalid amount');
if (!studentId.match(/^[A-Z0-9]+$/)) throw new Error('Invalid student ID');
```

### 5. HTTPS in Production
```javascript
// Enforce HTTPS
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```

---

## API Reference

### POST /api/payments/create-order
Creates a Razorpay order

**Request:**
```json
{
  "amount": 5000,
  "studentName": "John Doe",
  "studentId": "STU001",
  "invoiceId": "INV2024001",
  "totalAmount": 10000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "order_1DP5ibksFWsrxJ",
    "amount": 500000,
    "currency": "INR",
    "razorpayKey": "rzp_test_1DP5ibksFWsrxJ"
  }
}
```

### POST /api/payments/verify
Verifies payment signature

**Request:**
```json
{
  "orderId": "order_1DP5ibksFWsrxJ",
  "paymentId": "pay_1DP5ibksFWsrxJ",
  "signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a",
  "studentId": "STU001",
  "amount": 500000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "paymentId": "pay_1DP5ibksFWsrxJ",
    "orderId": "order_1DP5ibksFWsrxJ",
    "status": "captured"
  }
}
```

---

## Additional Resources

- **Razorpay Docs:** https://razorpay.com/docs/
- **API Reference:** https://razorpay.com/docs/api/payments/
- **Test Keys:** https://dashboard.razorpay.com/app/keys
- **Webhook Setup:** https://dashboard.razorpay.com/app/webhooks

---

**Last Updated:** May 2026
**Status:** Production Ready ✓
