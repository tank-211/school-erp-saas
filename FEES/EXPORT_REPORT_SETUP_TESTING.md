# Export Report Feature - Setup and Testing Guide

## 🎯 Quick Summary

This guide walks you through setting up and testing the complete Export Report feature for the ERP Fee Management system. The feature allows administrators and accountants to download:
- PDF comprehensive reports
- CSV export of transactions
- CSV export of pending payments
- CSV export of refund requests

## ✅ Prerequisites

Before starting, ensure you have:
- Node.js 14+ installed
- PostgreSQL 12+ installed and running
- Git (for version control)
- A code editor (VS Code recommended)

---

## 🚀 Step 1: Initial Setup

### 1.1 Clone/Open Project
```bash
# Open your project directory
cd Fee-module-main
```

### 1.2 Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### 1.3 Environment Configuration

**Backend (.env):**
Create or update `backend/.env`:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fee_management

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_very_secret_key_here_min_32_chars
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Frontend URLs
FRONTEND_URL=http://localhost:5173
ADMIN_FRONTEND_URL=http://localhost:5173
```

**Frontend (.env):**
Create or update `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_API_TIMEOUT=10000
VITE_RAZORPAY_KEY=rzp_test_key_here
```

### 1.4 Database Setup

**Create Database:**
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE fee_management;

# Exit
\q
```

**Run Migrations:**
```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed sample data
npm run db:seed
```

---

## 🔌 Step 2: Start Services

### 2.1 Start Backend

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Expected Output:**
```
📚 Server running on port 5000
🔐 Database connected
✅ Ready for requests
```

### 2.2 Start Frontend

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Expected Output:**
```
  VITE v4.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

---

## 🔐 Step 3: User Authentication

### 3.1 Create Admin User

**Option A: Database Seeding**
```bash
# If seed script exists
npm run db:seed
# This creates sample users including admin
```

**Option B: Manual Creation via Prisma Studio**
```bash
# In backend directory
npm run prisma:studio

# 1. Navigate to User table
# 2. Click "Add record"
# 3. Fill in:
#    - email: admin@example.com
#    - password: hashed_password (use bcrypt)
#    - role: ADMIN
#    - firstName: Admin
#    - lastName: User
#    - isActive: true
# 4. Save
```

**Option C: Registration Endpoint**

Use Postman or cURL:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "StrongPassword123",
    "firstName": "Admin",
    "lastName": "User",
    "phone": "1234567890",
    "role": "ADMIN"
  }'
```

### 3.2 Login

1. Open browser: `http://localhost:5173`
2. Go to login page
3. Enter admin credentials:
   - Email: admin@example.com
   - Password: StrongPassword123
4. Click Login
5. Should redirect to dashboard

### 3.3 Verify Token

**In browser console (F12):**
```javascript
localStorage.getItem('authToken')
// Should return a long JWT token
```

---

## 📊 Step 4: Populate Test Data

### 4.1 Add Sample Data via Prisma Studio

```bash
cd backend
npm run prisma:studio
```

Navigate to each table and add:

1. **Course:**
   - name: "B.Tech Computer Science"
   - code: "BTECH_CS"

2. **Class:**
   - name: "Semester 1"
   - code: "CS_101"
   - courseId: (link to course)

3. **Student:**
   - studentId: "STU001"
   - firstName: "John"
   - lastName: "Doe"
   - email: john@example.com
   - courseId: (link to course)
   - classId: (link to class)

4. **FeeStructure:**
   - courseId: (link)
   - classId: (link)
   - academicYear: "2024-2025"
   - totalFee: 100000

5. **FeePayment:**
   - studentId: (link)
   - feeStructureId: (link)
   - totalAmount: 100000
   - amountPaid: 50000
   - amountPending: 50000
   - dueDate: (future date)
   - paymentStatus: "PARTIAL"

6. **Payment:**
   - feePaymentId: (link)
   - amount: 50000
   - paymentMethod: "ONLINE"

7. **RefundRequest:**
   - studentId: (link)
   - feePaymentId: (link)
   - amount: 5000
   - reason: "Overpayment"
   - status: "PENDING"

### 4.2 Add Data via API

```bash
# Add students
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...student data...}'
```

---

## 🧪 Step 5: Test Export Report Feature

### 5.1 Access Export Report Page

1. Go to: `http://localhost:5173/export-report`
2. Should see:
   - ✅ Authenticated (showing you're logged in)
   - Export options (PDF, Transactions, Pending, Refunds)
   - Debug info with API URL

### 5.2 Test PDF Export

1. Select "📄 PDF Report"
2. Click "⬇️ Download Report"
3. Wait for success message
4. Check Downloads folder for `Fee_Report_YYYY-MM-DD.pdf`
5. Open PDF and verify it contains:
   - Title: "Fees & Payments Dashboard Report"
   - Dashboard stats (fees collected, pending, overdue)
   - Monthly trends chart
   - Transaction details
   - Pending payments list

### 5.3 Test CSV Exports

**Transactions CSV:**
1. Select "💳 Transactions"
2. Click download
3. Verify `Transactions_YYYY-MM-DD.csv` contains:
   - Headers: Student ID, Student Name, Amount, Payment Method, etc.
   - Transaction records

**Pending Payments CSV:**
1. Select "⏳ Pending Payments"
2. Click download
3. Verify `Pending_Payments_YYYY-MM-DD.csv` contains:
   - Student info and pending amounts

**Refund Requests CSV:**
1. Select "💰 Refund Requests"
2. Click download
3. Verify `Refund_Requests_YYYY-MM-DD.csv` contains:
   - Refund request details

---

## 🔍 Step 6: Debug & Troubleshoot

### 6.1 Check Backend Logs

Look at Terminal 1 (Backend) for:
- Request logs: `📤 GET /api/reports/export`
- Error messages: `❌ Export report error: ...`
- Database queries

### 6.2 Browser Console Debugging

**Open Console (F12) and run:**
```javascript
// Check token
console.log('Token:', localStorage.getItem('authToken')?.substring(0, 30) + '...');

// Check API URL
console.log('API:', import.meta.env.VITE_API_URL);

// Try manual API call
fetch('http://localhost:5000/api/reports/formats', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  }
})
.then(r => r.json())
.then(d => console.log(d))
.catch(e => console.error('Error:', e))
```

### 6.3 Network Tab Inspection

1. Open DevTools (F12)
2. Go to "Network" tab
3. Click "Download Report"
4. Look for request to `/api/reports/export`
5. Check:
   - Status code (should be 200)
   - Response headers (Content-Type, Content-Disposition)
   - Request headers (Authorization header present)

---

## 📋 Step 7: Complete Test Checklist

- [ ] Backend starts without errors
- [ ] Frontend starts and loads dashboard
- [ ] Can login with admin account
- [ ] Token appears in localStorage after login
- [ ] Export Report page loads
- [ ] Shows "✅ Authenticated" status
- [ ] PDF export downloads successfully
- [ ] PDF file contains valid data
- [ ] Transactions CSV exports successfully
- [ ] CSV opens correctly in Excel/Sheets
- [ ] Pending Payments CSV exports
- [ ] Refund Requests CSV exports
- [ ] All files have correct filenames with dates
- [ ] No 401 Unauthorized errors
- [ ] No CORS errors in console
- [ ] No JavaScript errors in console

---

## 🔧 Common Setup Issues

### Issue: "Cannot connect to database"

**Solution:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list               # Mac
# Windows: Check Services in Task Manager

# Verify connection string in .env:
DATABASE_URL=postgresql://user:password@localhost:5432/fee_management

# Test connection:
psql -U user -d fee_management
```

### Issue: "Prisma migrations failed"

**Solution:**
```bash
# Reset database (WARNING: deletes data)
npm run db:reset

# Or manually:
npm run prisma:migrate:prod
```

### Issue: "VITE_API_URL not recognized"

**Solution:**
```bash
# Stop frontend dev server
# Make sure .env file exists in frontend/ directory
# Restart: npm run dev
```

### Issue: "JWT_SECRET not defined"

**Solution:**
```bash
# Make sure backend/.env exists with:
JWT_SECRET=your_32_character_secret_key

# Restart backend: npm run dev
```

---

## 📚 File Structure Reference

```
Fee-module-main/
├── backend/
│   ├── config/
│   │   ├── jwt.js (Token generation/verification)
│   │   └── database.js (Database config)
│   ├── middleware/
│   │   └── auth.js (Authentication middleware)
│   ├── controllers/
│   │   └── reportController.js (Report logic)
│   ├── services/
│   │   └── reportService.js (Database queries)
│   ├── routes/
│   │   └── reportRoutes.js (API endpoints)
│   ├── utils/
│   │   └── pdfGenerator.js (PDF creation)
│   ├── prisma/
│   │   └── schema.prisma (Database schema)
│   └── .env (Configuration)
│
├── frontend/
│   ├── src/
│   │   ├── services/
│   │   │   └── reportService.js (API client)
│   │   └── pages/
│   │       └── ExportReport.jsx (UI component)
│   └── .env (Configuration)
│
└── Documentation/
    ├── EXPORT_REPORT_COMPLETE_GUIDE.md (Architecture)
    ├── EXPORT_REPORT_TROUBLESHOOTING.md (Troubleshooting)
    └── EXPORT_REPORT_SETUP_TESTING.md (This file)
```

---

## 🚀 Production Deployment Checklist

- [ ] Change JWT_SECRET to a strong random string
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for production URLs only
- [ ] Set appropriate database permissions
- [ ] Enable logging and monitoring
- [ ] Set up database backups
- [ ] Test all export functionality
- [ ] Verify file size limits
- [ ] Set up rate limiting
- [ ] Test with real data volumes
- [ ] Document any customizations

---

## 📞 Support & Resources

- **JWT Info:** https://jwt.io/
- **Prisma Docs:** https://prisma.io/docs/
- **Express Docs:** https://expressjs.com/
- **React Docs:** https://react.dev/
- **PDFKit Docs:** https://pdfkit.org/

---

## ✨ Next Steps After Setup

1. **Customize Reports:** Modify report templates in `pdfGenerator.js`
2. **Add Filters:** Enhance `reportService.js` with date/category filters
3. **Schedule Reports:** Implement automated report generation
4. **Email Reports:** Add email delivery functionality
5. **Caching:** Cache frequently accessed reports
6. **Analytics:** Add usage analytics for exports

---

**Last Updated:** 2025-05-02  
**Status:** Ready for Production
