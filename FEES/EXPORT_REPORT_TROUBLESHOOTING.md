# Export Report Feature - Troubleshooting & Testing Guide

## Quick Start Checklist

Before exporting reports, ensure:
- [ ] Backend is running: `npm run dev` in `backend/` folder
- [ ] Frontend is running: `npm run dev` in `frontend/` folder
- [ ] Database is configured and running
- [ ] You are logged in with an admin or accountant account
- [ ] Browser console shows no errors (F12)

---

## Problem: 401 Unauthorized Error

### Symptom
When clicking "Download Report", you see: `❌ Authentication failed. Please login again. (401 Unauthorized)`

### Step 1: Verify Token in Browser Storage
```javascript
// Open browser console (F12) and run:
localStorage.getItem('authToken')
```

**Expected Result:** Should show a long JWT token starting with `eyJ...`

**If empty or shows `null`:**
- You are not logged in
- **Solution:** Log out completely, clear cookies, and log back in

### Step 2: Check Authorization Header

1. Open browser DevTools (F12)
2. Go to "Network" tab
3. Click "Download Report" button
4. Look for request to `GET /api/reports/export`
5. Click on the request
6. Go to "Request Headers" tab
7. Look for: `Authorization: Bearer eyJ...`

**If Authorization header is missing:**
- The frontend is not sending the token
- **Solution:** Check if `reportService.js` interceptor is working:
  ```javascript
  // Check if interceptor is setting header
  console.log(localStorage.getItem('authToken'))
  ```

**If Authorization header shows wrong format:**
- Example: `Authorization: eyJ...` (missing "Bearer ")
- **Solution:** Edit `frontend/src/services/reportService.js` and verify the interceptor:
  ```javascript
  config.headers.Authorization = `Bearer ${token}`
  ```

### Step 3: Verify Token Validity

1. Decode your JWT token at https://jwt.io/
2. Check the `exp` field (expiration time)
3. Convert it to a readable date: `new Date({exp} * 1000)`

**If token is expired:**
- **Solution:** Log out and log back in to get a fresh token

### Step 4: Check Backend Is Running

In terminal, verify backend is responding:
```bash
curl http://localhost:5000/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-05-02T12:00:00.000Z"
}
```

**If connection refused:**
- Backend is not running
- **Solution:** Run `npm run dev` in the backend folder

### Step 5: Verify JWT Secret

The backend must have the same JWT secret to verify tokens:

1. Check `backend/.env` file has `JWT_SECRET` set
2. Verify the value matches what was used during login
3. If you changed it, you need to log out and log back in

---

## Problem: 403 Forbidden Error

### Symptom
When clicking "Download Report", you see: `❌ You do not have permission to access this resource. (403 Forbidden)`

### Solution: Check User Role

The export report feature requires either `admin` or `accountant` role.

**Check your role:**
1. Open browser console (F12)
2. Decode your JWT token at https://jwt.io/
3. Look for `role` field in the payload
4. Should show: `"role": "admin"` or `"role": "accountant"`

**If role is different:**
- Your account doesn't have permission
- **Solution:** Ask administrator to upgrade your account role

**If role is missing from token:**
- Token wasn't generated properly
- **Solution:** Log out and log back in

---

## Problem: Network Error or Backend Not Responding

### Symptom
When clicking "Download Report", you see: `❌ Network error. Unable to reach the server. Is the backend running?`

### Step 1: Verify Backend URL

1. Open `frontend/.env` file
2. Check: `VITE_API_URL=http://localhost:5000`
3. Match with backend port in `backend/.env`: `PORT=5000`

**If ports don't match:**
- **Solution:** Update `frontend/.env` to match the backend port

### Step 2: Check Backend Is Running

In terminal:
```bash
# Navigate to backend folder
cd backend

# Start the backend
npm run dev
```

**Expected Output:**
```
Server running on port 5000
Database connected
```

**If backend fails to start:**
- Check for dependency issues: `npm install`
- Check database connection
- Check for port conflicts: `netstat -an | findstr :5000` (Windows)

### Step 3: Test Direct API Call

In browser console:
```javascript
fetch('http://localhost:5000/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

**Should return:**
```json
{
  "success": true,
  "message": "Server is running"
}
```

**If this fails:**
- Backend is not accessible
- Possible issues: firewall, port blocked, wrong URL

### Step 4: Check CORS Configuration

If you see CORS error in console like:
```
Access to XMLHttpRequest at 'http://localhost:5000/...' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

Check `backend/server.js`:
```javascript
app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.ADMIN_FRONTEND_URL],
  credentials: true
}));
```

**Solution:** Ensure frontend URL is listed or change to:
```javascript
app.use(cors({
  origin: '*', // Allow all origins for development
  credentials: true
}));
```

---

## Problem: File Not Downloading

### Symptom
No file appears to download after clicking the button, even though console shows "✅ Report exported successfully"

### Step 1: Check Browser Popup Blocker

1. Look for popup blocker notification in browser address bar
2. Click "Allow" to permit downloads
3. Try exporting again

### Step 2: Check Downloads Folder

The file might have downloaded but you need to find it:
- **Windows:** `C:\Users\{YourUsername}\Downloads\`
- **Mac:** `~/Downloads/`
- **Linux:** `~/Downloads/` or `~/Downloads/`

Look for files named:
- `Fee_Report_YYYY-MM-DD.pdf`
- `Transactions_YYYY-MM-DD.csv`
- `Pending_Payments_YYYY-MM-DD.csv`
- `Refund_Requests_YYYY-MM-DD.csv`

### Step 3: Check Network Response

1. Open DevTools (F12)
2. Go to "Network" tab
3. Click "Download Report"
4. Look for the request to `/api/reports/export` or similar
5. Click on it
6. Go to "Response" tab
7. Should show binary data (for PDF) or text data (for CSV)

**If Response tab shows error JSON:**
```json
{
  "success": false,
  "message": "Error message here"
}
```

This means the request failed on the backend. Check the error message and follow the corresponding troubleshooting section.

---

## Problem: Server Error (500)

### Symptom
When clicking "Download Report", you see: `❌ Server error: Internal Server Error`

### Step 1: Check Backend Logs

Look at the terminal where backend is running for error messages:
```
Error exporting PDF: {error details}
```

### Step 2: Common Causes

**Database Connection Error:**
```
Error: connection refused
```
- Verify database is running
- Check `DATABASE_URL` in `.env`
- Run migrations: `npm run prisma:migrate`

**Missing Data:**
```
Error: Cannot read property 'map' of undefined
```
- Database query returned no data
- Check if data exists: `npm run prisma:studio`

**PDF Generation Error:**
```
Error: PDFKit error
```
- Check if PDFKit is installed: `npm install pdfkit`

### Step 3: Enable Debug Logging

Add debug logs to see what's happening:

1. Edit `backend/controllers/reportController.js`
2. Add console.log statements:
```javascript
static async exportReport(req, res, next) {
  try {
    console.log('📋 User:', req.user);
    console.log('🔍 Fetching report data...');
    const reportData = await ReportService.getComprehensiveReportData();
    console.log('✅ Data fetched:', Object.keys(reportData));
    // ... rest of function
  }
}
```

3. Run `npm run dev` and check console output
4. Try exporting again and look for debug messages

### Step 4: Test Database Directly

```bash
# Open Prisma Studio to view database
npm run prisma:studio
```

Verify:
- Students table has data
- Fee payments table has data
- Payments table has data
- Refund requests table has data

---

## Testing the Feature End-to-End

### Test Case 1: PDF Export

**Setup:**
- Logged in as admin
- Backend running
- Database populated with test data

**Steps:**
1. Navigate to Export Report page
2. Verify "✅ Authenticated" appears
3. Select "📄 PDF Report"
4. Click "⬇️ Download Report"
5. Wait for "✅ Report exported successfully"
6. Verify PDF downloaded

**Verification:**
- Check `Fee_Report_YYYY-MM-DD.pdf` exists in Downloads
- Open PDF and verify it contains data

### Test Case 2: CSV Export - Transactions

**Steps:**
1. Select "💳 Transactions"
2. Click "⬇️ Download Report"
3. Wait for "✅ Transactions exported successfully"
4. Verify CSV downloaded

**Verification:**
- Check `Transactions_YYYY-MM-DD.csv` exists
- Open CSV in Excel/Sheets
- Verify it contains transaction data with headers

### Test Case 3: Authorization Failure

**Setup:**
- Create a non-admin user account
- Log in with that account

**Steps:**
1. Navigate to Export Report page
2. Should show "✅ Authenticated" (since user is logged in)
3. Try to export a report
4. Should see "❌ You do not have permission to access this resource. (403 Forbidden)"

**Expected:** Only admin/accountant accounts can export

### Test Case 4: Authentication Failure

**Setup:**
- Don't log in, or clear localStorage

**Steps:**
1. Navigate to Export Report page
2. Should show "⚠️ Not authenticated"
3. Try to click export button
4. Should show "❌ Not authenticated. Please login first."

**Expected:** Button is disabled until logged in

---

## Debug Information Collection

If you still can't resolve the issue, gather this debug info:

### Browser Console (F12 → Console tab)
```javascript
// Token check
console.log('Token:', localStorage.getItem('authToken')?.substring(0, 30) + '...');

// API Base URL
console.log('API URL:', import.meta.env.VITE_API_URL);

// User Agent
console.log('Browser:', navigator.userAgent);
```

### Backend Console Output
```bash
# Show last 20 lines of backend output
# Look for any error messages when exporting
```

### Network Tab Details
1. Find the failed request
2. Right-click → "Copy as cURL"
3. Share the cURL command (hide the actual token)

### .env File Check
- Backend `.env`: JWT_SECRET, DATABASE_URL, PORT
- Frontend `.env`: VITE_API_URL

---

## Contact Support

When reporting an issue, provide:
1. Screenshot of error message
2. Browser console output (F12 → Console)
3. Network request details (F12 → Network)
4. Backend server logs
5. Steps to reproduce the issue
6. Expected vs actual behavior

---

## Performance Optimization Tips

If reports take too long to generate:

1. **Reduce data limit:**
   ```javascript
   // In ExportReport.jsx
   await reportService.exportTransactionsCSV(20) // was 50
   ```

2. **Add database indexes:**
   ```sql
   CREATE INDEX idx_payment_status ON fee_payments(payment_status);
   CREATE INDEX idx_created_at ON payments(created_at);
   ```

3. **Optimize queries in reportService:**
   - Add `.select()` to fetch only needed fields
   - Add pagination for large datasets

---

**Last Updated:** 2025-05-02
**Version:** 1.0
