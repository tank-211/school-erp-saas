# Razorpay Integration - Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Verify Environment Variables

**Backend (.env)**
```env
RAZORPAY_KEY_ID=rzp_test_1DP5ibksFWsrxJ
RAZORPAY_KEY_SECRET=test_secret_key_change_in_production
RAZORPAY_WEBHOOK_SECRET=webhook_secret_key_change_in_production
```

**Frontend (.env.local)**
```env
VITE_RAZORPAY_KEY=rzp_test_1DP5ibksFWsrxJ
VITE_API_URL=http://localhost:5000/api
```

### Step 2: Check Routes Are Registered

**backend/server.js:**
```javascript
import paymentRoutes from './routes/paymentRoutes.js';
app.use('/api/payments', paymentRoutes);
```

### Step 3: Test Backend

```bash
# Start backend
npm run dev

# Test create order
curl -X POST http://localhost:5000/api/payments/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "studentName": "Test",
    "studentId": "STU001",
    "invoiceId": "INV001",
    "totalAmount": 5000
  }'

# Should return:
# {
#   "success": true,
#   "data": {
#     "orderId": "order_xxx",
#     "amount": 10000,
#     "razorpayKey": "rzp_test_xxx"
#   }
# }
```

### Step 4: Use in Frontend

```javascript
import PaymentPage from './pages/PaymentPage';

function App() {
  return <PaymentPage />;
}
```

### Step 5: Test Payment

1. Start frontend: `npm run dev`
2. Navigate to payment page
3. Click "Pay" button
4. Razorpay modal opens
5. Complete test payment
6. See success message

---

## 📋 File Checklist

- [x] Backend: `config/razorpay.js` - Razorpay initialization
- [x] Backend: `services/paymentService.js` - Business logic
- [x] Backend: `controllers/paymentController.js` - API endpoints
- [x] Backend: `routes/paymentRoutes.js` - Route definitions
- [x] Frontend: `components/RazorpayPaymentModal.jsx` - Payment modal
- [x] Frontend: `pages/PaymentPage.jsx` - Sample page
- [x] Frontend: `styles/payment-page.css` - Styling
- [x] Frontend: `.env.local` - Environment variables
- [x] Root: `RAZORPAY_COMPLETE_GUIDE.md` - Full documentation

---

## 🔑 API Endpoints

### Create Order
```
POST /api/payments/create-order
Body: { amount, studentName, studentId, invoiceId, totalAmount }
Returns: { orderId, amount, currency, razorpayKey }
```

### Verify Payment
```
POST /api/payments/verify
Body: { orderId, paymentId, signature, studentId, amount }
Returns: { success, paymentId, status }
```

### Get Payment Status
```
GET /api/payments/status/:paymentId
Returns: { id, amount, status, method, email }
```

### Refund Payment
```
POST /api/payments/refund
Body: { paymentId, amount (optional) }
Returns: { refundId, status }
```

### Webhook
```
POST /api/payments/webhook
Headers: X-Razorpay-Signature
Body: { event, payload }
```

---

## 🔐 Security Checklist

- [ ] Secret Key ONLY in backend .env
- [ ] Public Key in frontend .env
- [ ] .env files NOT in git (check .gitignore)
- [ ] Signature verification on backend
- [ ] HTTPS enabled (production)
- [ ] CORS configured correctly
- [ ] Input validation on all endpoints
- [ ] Webhook signature verified
- [ ] Database encrypted
- [ ] Rate limiting on payment endpoints

---

## 🧪 Testing Checklist

- [ ] Backend server starts: `npm run dev`
- [ ] Frontend server starts: `npm run dev`
- [ ] Create order endpoint works
- [ ] Payment modal opens
- [ ] Test payment completes
- [ ] Verify endpoint confirms payment
- [ ] Error handling works (invalid signature, etc.)
- [ ] Database updates after payment
- [ ] Webhook tests (if applicable)

---

## 🚀 Production Deployment

1. **Get Live Keys**
   - Go to: https://dashboard.razorpay.com/app/keys
   - Switch to "Live Mode"
   - Copy keys

2. **Update .env**
   ```env
   RAZORPAY_KEY_ID=rzp_live_xxxxx
   RAZORPAY_KEY_SECRET=live_secret_xxxxx
   RAZORPAY_WEBHOOK_SECRET=live_webhook_xxxxx
   ```

3. **Update Frontend**
   ```env
   VITE_RAZORPAY_KEY=rzp_live_xxxxx
   VITE_API_URL=https://api.yourdomain.com/api
   ```

4. **Enable HTTPS**
   - Razorpay requires HTTPS
   - Use SSL certificate
   - Update CORS origins

5. **Deploy & Test**
   - Deploy backend
   - Deploy frontend
   - Run payment test
   - Monitor logs

---

## ❓ Common Issues

| Issue | Solution |
|-------|----------|
| `RAZORPAY_KEY_ID undefined` | Check .env file, restart server |
| `Razorpay SDK failed to load` | Check internet, CDN not blocked |
| `Signature verification failed` | Verify webhook secret, check orderId\|paymentId format |
| `Order creation fails` | Check amount > 0, valid student data |
| `CORS error` | Update CORS origins in backend |

---

## 📞 Support Resources

- **Razorpay Docs:** https://razorpay.com/docs/
- **API Reference:** https://razorpay.com/docs/api/payments/
- **Test Keys:** https://dashboard.razorpay.com/app/keys
- **Webhooks:** https://dashboard.razorpay.com/app/webhooks

---

**Status:** ✅ Ready to Use
**Last Updated:** May 2026
