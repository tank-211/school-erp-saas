# Razorpay Integration - Security Deep Dive

## 🔐 Critical Security Concepts

### Why Secret Key Must Never Reach Frontend

When your Secret Key reaches the frontend:
1. **Any User Can Create Orders**: Attacker can create unlimited orders
2. **Any User Can Verify Payments**: Attacker can fake payment confirmations
3. **Your Server Accepts Fake Payments**: Database gets corrupted
4. **Money Lost**: You won't receive actual payments

### The Complete Attack Flow (If Secret Is Exposed)

```
Attacker sees Secret Key in frontend code
       ↓
Opens browser console (F12)
       ↓
Finds Secret Key in localStorage / environment
       ↓
Uses Secret Key to create orders on Razorpay API
       ↓
Modifies payment response locally
       ↓
Sends fake signature to verification endpoint
       ↓
Backend can't verify (doesn't have Secret Key yet)
       ↓
Fake payment accepted!
       ↓
Your database marked as "paid"
       ↓
💸 Money Lost! No actual payment received
```

---

## ✅ The Secure Flow (Our Implementation)

```
User clicks "Pay"
       ↓
Frontend creates order request (no secrets)
       ↓
Backend receives request
       ↓
Backend uses Secret Key to create real order on Razorpay
       ↓
Backend returns ONLY Order ID to frontend
       ↓
Frontend can't do anything malicious (no Secret Key)
       ↓
Frontend opens Razorpay modal with Order ID + Public Key
       ↓
Razorpay processes payment securely
       ↓
Razorpay returns: orderId|paymentId|HMAC-SHA256(orderId|paymentId)
       ↓
Frontend sends all 3 values to backend verification endpoint
       ↓
Backend uses Secret Key to verify HMAC-SHA256
       ↓
ONLY backend can verify (only backend has Secret Key)
       ↓
Attacker can't fake the HMAC-SHA256 signature
       ↓
Payment confirmed as genuine ✅
       ↓
Database safely marked as "paid"
```

---

## 🛡️ Cryptographic Signature Verification

### How HMAC-SHA256 Works

```
HMAC-SHA256 is a cryptographic algorithm that creates a unique "fingerprint"
of a message using a secret key.

Key Property: Only someone with the secret key can create a valid fingerprint.

Formula:
  signature = HMAC-SHA256(secret_key, "orderId|paymentId")

Example:
  secret_key = "webhook_secret_xyz"
  message = "order_123|pay_456"
  
  signature = HMAC-SHA256("webhook_secret_xyz", "order_123|pay_456")
           = "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a"

Frontend sends:
  - orderId: "order_123"
  - paymentId: "pay_456"
  - signature: "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a"

Backend verifies:
  expected = HMAC-SHA256("webhook_secret_xyz", "order_123|pay_456")
  expected = "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a"
  
  if (expected === received_signature) {
    ✅ Payment is genuine!
  } else {
    ❌ Payment is fake!
  }
```

### Why Attacker Can't Fake It

```
Attacker tries to fake a signature without Secret Key:

signature_from_frontend = "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a"

Backend computes expected signature:
  expected = HMAC-SHA256("REAL_SECRET_KEY", "orderId|paymentId")
  expected = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"

Comparison:
  received: "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a"
  expected: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
  
  They don't match! ❌ FAKE PAYMENT REJECTED
```

---

## 📄 Environment Variable Security

### ✅ CORRECT (.env - Backend Only)

```env
# Backend .env
RAZORPAY_KEY_ID=rzp_test_abc123          # Safe (public)
RAZORPAY_KEY_SECRET=secret_key_xyz       # ⚠️ SENSITIVE - Never expose!
RAZORPAY_WEBHOOK_SECRET=webhook_xyz      # ⚠️ SENSITIVE - Never expose!
```

### ❌ WRONG (.env - Frontend)

```env
# frontend/.env - NEVER PUT SECRETS HERE
RAZORPAY_KEY_ID=rzp_test_abc123
RAZORPAY_KEY_SECRET=secret_key_xyz       # 🚨 HUGE SECURITY HOLE!
RAZORPAY_WEBHOOK_SECRET=webhook_xyz      # 🚨 HUGE SECURITY HOLE!
```

### Why?

Frontend code is downloaded to every user's browser.
```javascript
// This is visible to EVERY user
const SECRET_KEY = "secret_key_xyz";

// Someone can open DevTools (F12) and see it:
// console.log(SECRET_KEY) → "secret_key_xyz"

// Or in Network tab → .env file contents revealed
```

---

## 🔒 Best Practices Implementation

### 1. Load Secrets in Backend Only

```javascript
// ✅ CORRECT: In backend/server.js
import dotenv from 'dotenv';
dotenv.config(); // Load .env file

const SECRET = process.env.RAZORPAY_KEY_SECRET;
// SECRET is now available only in backend memory
// Not sent to any client
```

### 2. Never Log Sensitive Data

```javascript
// ❌ WRONG
logger.info(`Secret key is: ${SECRET_KEY}`);
// Logs file now contains secret!

// ✅ CORRECT
logger.info(`Using Razorpay API with key: rzp_test_***`);
// Mask sensitive data
```

### 3. Validate on Backend, Never Trust Frontend

```javascript
// ❌ WRONG - Trusting frontend data
if (req.body.paymentVerified === true) {
  // Mark as paid
}

// ✅ CORRECT - Verify with secret
const isValid = verifySignature(
  req.body.orderId,
  req.body.paymentId,
  req.body.signature,
  process.env.RAZORPAY_WEBHOOK_SECRET  // Secret from backend
);

if (isValid) {
  // Mark as paid
}
```

### 4. Use .gitignore

```bash
# .gitignore
.env
.env.local
.env.*.local
.env.production

# Never commit these files!
```

### 5. Use Environment-Specific Keys

```env
# .env (Development)
RAZORPAY_KEY_ID=rzp_test_abc123
RAZORPAY_KEY_SECRET=test_secret_xyz

# .env.production (Production)
RAZORPAY_KEY_ID=rzp_live_def456
RAZORPAY_KEY_SECRET=live_secret_abc
```

### 6. Rotate Keys Periodically

```
Every 3-6 months:
1. Generate new keys from Razorpay dashboard
2. Update .env files
3. Restart servers
4. Monitor for issues
5. Delete old keys from dashboard
```

---

## 🚨 Common Security Mistakes

### Mistake 1: Hardcoding Secrets

```javascript
// ❌ NEVER DO THIS
const SECRET_KEY = "my_secret_key_12345";
```

### Mistake 2: Secrets in Frontend

```javascript
// ❌ NEVER DO THIS
export const API_SECRET = "secret_xyz";
```

### Mistake 3: Secrets in Git

```bash
# ❌ NEVER COMMIT .env FILES
git add .env          # ❌ NO!
git commit -m "..."   # NOW IN GIT HISTORY FOREVER
```

### Mistake 4: Secrets in Logs

```javascript
// ❌ NEVER LOG SECRETS
console.log("Secret:", SECRET_KEY);
// Appears in log files accessible to anyone
```

### Mistake 5: Secrets in URLs

```javascript
// ❌ NEVER DO THIS
const url = `https://api.example.com?secret=${SECRET_KEY}`;
// Visible in browser history, logs, monitoring tools
```

### Mistake 6: Frontend Verification

```javascript
// ❌ NEVER VERIFY IN FRONTEND
const isValid = signature === crypto
  .createHmac('sha256', SECRET_KEY)  // Secret exposed!
  .update(body)
  .digest('hex');
```

---

## ✅ Security Verification Checklist

### Code Review

- [ ] No hardcoded secrets anywhere
- [ ] All secrets in .env files
- [ ] .env files in .gitignore
- [ ] .env files not checked into git
- [ ] Secrets only loaded in backend
- [ ] Frontend never receives secrets
- [ ] Verification done on backend only
- [ ] All sensitive logging masked

### Runtime Security

- [ ] .env file exists on production server
- [ ] File permissions set correctly (600)
- [ ] Environment variables set in deployment
- [ ] No secrets in server logs
- [ ] No secrets in error responses
- [ ] HTTPS enabled
- [ ] CORS restricted to known domains
- [ ] Rate limiting enabled

### Git Security

- [ ] Run: `git log -p .env` → returns nothing
- [ ] Run: `git log -p package.json` → no secrets
- [ ] Run: `grep -r "secret" .` → no exposed secrets
- [ ] All team members understand security rules

---

## 🔍 Testing Security

### Test 1: Frontend Has No Secrets

```javascript
// In browser console
console.log(import.meta.env.VITE_RAZORPAY_SECRET)
// Should be: undefined

console.log(import.meta.env.VITE_RAZORPAY_KEY)
// Should be: "rzp_test_xxx" (PUBLIC KEY)
```

### Test 2: Signature Verification

```bash
# Attacker tries to fake signature
curl -X POST http://localhost:5000/api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_123",
    "paymentId": "pay_456",
    "signature": "fake_signature_123",
    "studentId": "STU001",
    "amount": 500000
  }'

# Should fail:
# {
#   "success": false,
#   "message": "Payment verification failed. Invalid signature."
# }
```

### Test 3: Missing Secret Causes Error

```bash
# If SECRET_KEY is missing/wrong, signature fails
curl -X POST http://localhost:5000/api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{...}'

# Backend logs:
# "❌ Invalid signature for pay_456"
```

---

## 📊 Security Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          SECURE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Frontend (User Browser)        Backend (Your Server)               │
│  ────────────────────────       ──────────────────────              │
│                                                                      │
│  ✓ Public Key (Safe)            ✓ Public Key                        │
│  ✗ NO Secret Key                ✓ Secret Key (PROTECTED)           │
│  ✓ Payment Modal                ✓ Signature Verification           │
│  ✗ NO Verification              ✓ Order Creation                   │
│  ✗ NO Database Access           ✓ Database Updates                 │
│                                                                      │
│  Communication Flow:                                                │
│                                                                      │
│  Frontend                     Backend              Razorpay         │
│     │                           │                    │             │
│     │──── Create Order ────────→│                    │             │
│     │    (no secrets)           │──── Create Order ─→│             │
│     │                           │  (with Secret)     │             │
│     │←─── Order ID ─────────────│←─ Order ID ────────│             │
│     │  (public info)            │  (public info)     │             │
│     │                           │                    │             │
│     │─── Open Modal ──────────────────────────────→  │             │
│     │  (Order ID + Public Key)                       │             │
│     │                                                │             │
│     │←─ User Completes Payment ──────────────────────│             │
│     │  (signature from Razorpay)                     │             │
│     │                                                │             │
│     │──── Verify Payment ──────→│                    │             │
│     │  (with signature)         │──── Verify ───────→│             │
│     │                           │  (with Secret)     │             │
│     │                           │                    │             │
│     │←─ Payment Verified ───────│←─ Confirmed ───────│             │
│     │  (success message)        │                    │             │
│     │                           │                    │             │
│     │                           │──── Update DB ─────│             │
│     │                           │  (mark as paid)    │             │
│     │                                                │             │
│  ✅ SECURE - No secrets exposed!                     │             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📚 Additional Resources

- **OWASP Secrets Management:** https://owasp.org/
- **Node.js Security Best Practices:** https://nodejs.org/en/docs/guides/security/
- **Razorpay Security:** https://razorpay.com/docs/security/
- **Environment Variables:** https://12factor.net/config

---

**Last Updated:** May 2026
**Security Level:** 🟢 Production Ready
