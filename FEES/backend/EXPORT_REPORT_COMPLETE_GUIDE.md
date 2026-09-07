# Export Report Feature - Complete Implementation Guide

## Overview
This guide provides a complete implementation of the Export Report feature for the ERP Fee Management system, including JWT authentication, backend API, file generation, and frontend integration.

## Architecture

```
Frontend (React/Vite)
    ↓
reportService.js (Axios API Client)
    ↓ (Authorization: Bearer {JWT_TOKEN})
Backend (Express.js)
    ↓
Authentication Middleware (JWT Verification)
    ↓
Authorization Middleware (Role-based)
    ↓
Report Routes (/api/reports/*)
    ↓
Report Controller
    ↓
Report Service (Database Queries via Prisma)
    ↓
PDF/CSV Generators
    ↓
File Response (attachment headers)
    ↓
Frontend Downloads File
```

## 1. Authentication Implementation

### 1.1 JWT Configuration
**File:** `backend/config/jwt.js`

The JWT configuration handles token generation and verification:
- **Access Token:** Short-lived (15 minutes) - Used for API requests
- **Refresh Token:** Long-lived (7 days) - Used to obtain new access tokens

### 1.2 Authentication Middleware
**File:** `backend/middleware/auth.js`

The middleware validates Bearer tokens in the Authorization header:

```javascript
authenticateToken: Extracts and verifies JWT token
  - Checks Authorization header: "Bearer {token}"
  - Verifies token signature and expiration
  - Attaches user info to req.user
  - Returns 401 if token is missing/invalid
  - Returns 403 if token is expired

authorizeRole: Checks user role for specific endpoints
  - Requires admin or accountant role
  - Returns 403 if user doesn't have required role
```

### 1.3 Token Flow

1. **Login:** User provides credentials → Backend issues access token and refresh token
2. **API Request:** Frontend sends `Authorization: Bearer {accessToken}`
3. **Token Verification:** Middleware validates token signature and expiration
4. **Token Refresh:** If expired, use refresh token to get new access token
5. **Logout:** Invalidate refresh token

## 2. Backend API Implementation

### 2.1 Report Routes
**File:** `backend/routes/reportRoutes.js`

All routes are protected with JWT authentication and role-based authorization:

```
GET /api/reports/export
  - Purpose: Export comprehensive PDF report
  - Auth: Required (admin, accountant)
  - Returns: PDF file (attachment)

GET /api/reports/dashboard-stats
  - Purpose: Get dashboard statistics (JSON)
  - Auth: Required (admin, accountant)
  - Returns: JSON with fee collection stats

GET /api/reports/transactions/csv
  - Purpose: Export recent transactions as CSV
  - Auth: Required (admin, accountant)
  - Query: limit (default: 50)
  - Returns: CSV file (attachment)

GET /api/reports/pending-payments/csv
  - Purpose: Export pending payments as CSV
  - Auth: Required (admin, accountant)
  - Query: limit (default: 100)
  - Returns: CSV file (attachment)

GET /api/reports/refunds/csv
  - Purpose: Export refund requests as CSV
  - Auth: Required (admin, accountant)
  - Query: limit (default: 50)
  - Returns: CSV file (attachment)

GET /api/reports/formats
  - Purpose: Get list of available report formats
  - Auth: Not required (public endpoint)
  - Returns: JSON array of available formats
```

### 2.2 Report Controller
**File:** `backend/controllers/reportController.js`

The controller handles all report generation logic:

```javascript
exportReport()
  - Fetches comprehensive report data
  - Generates PDF using PDFKit
  - Sets proper headers: Content-Type: application/pdf
  - Sets filename in Content-Disposition header
  - Sends binary PDF buffer

exportTransactionsCSV()
  - Fetches recent transactions from database
  - Generates CSV with proper formatting
  - Sets proper headers: Content-Type: text/csv
  - Escapes special characters in CSV data

exportPendingPaymentsCSV()
  - Queries pending/overdue payments
  - Calculates days overdue
  - Generates CSV file

exportRefundsCSV()
  - Queries refund requests from database
  - Includes refund details and status
  - Generates CSV file

generateCSV(headers, rows)
  - Private helper method
  - Properly escapes and formats CSV data
  - Handles null/undefined values
```

### 2.3 Report Service
**File:** `backend/services/reportService.js`

Database queries for report data:

```javascript
getDashboardStats()
  - Total fees collected (last year)
  - Pending payments amount
  - Overdue payments amount
  - Refund requests count and total

getRecentTransactions(limit)
  - Fetches transactions from payments table
  - Includes student names, amounts, dates
  - Orders by date (newest first)

getPendingPaymentsReport(limit)
  - Fetches fee payments with pending/partial status
  - Calculates amount pending
  - Calculates days overdue

getRefundRequestsReport(limit)
  - Fetches refund requests from database
  - Includes student info, amounts, status
  - Orders by date (newest first)
```

## 3. File Generation

### 3.1 CSV Generation
Built-in method in controller:
- Properly escapes double quotes in data
- Wraps all values in quotes
- Handles commas and newlines
- UTF-8 encoding

### 3.2 PDF Generation
**File:** `backend/utils/pdfGenerator.js`

Uses PDFKit library:
```javascript
generateReport(reportData)
  - Creates PDF document
  - Adds title and headers
  - Formats data in tables
  - Returns Buffer (binary data)
```

## 4. File Response Format

### 4.1 CSV Response Headers
```javascript
Content-Type: text/csv
Content-Disposition: attachment; filename="Transactions_2025-05-02.csv"
Content-Length: {file_size}
```

### 4.2 PDF Response Headers
```javascript
Content-Type: application/pdf
Content-Disposition: attachment; filename="Fee_Report_2025-05-02.pdf"
Content-Length: {file_size}
```

## 5. Frontend Implementation

### 5.1 Report Service
**File:** `frontend/src/services/reportService.js`

Handles API communication:
- Creates Axios instance with base URL
- Adds request interceptor to include JWT token
- Adds response error interceptor with detailed logging
- Handles blob responses for file downloads
- Provides error messages based on HTTP status codes

### 5.2 Export Report Component
**File:** `frontend/src/pages/ExportReport.jsx`

User interface:
- Display available report formats
- Select report type
- Show authentication status
- Download files on button click
- Display error messages
- Debug information for troubleshooting

### 5.3 Request Flow

1. Component calls `reportService.exportPDF()`
2. Service checks localStorage for `authToken`
3. Adds header: `Authorization: Bearer {token}`
4. Makes GET request to `/api/reports/export`
5. Backend validates token
6. Backend generates and returns file
7. Frontend receives blob response
8. Creates download link and triggers download

## 6. Error Handling

### 6.1 Frontend Error Messages

| Status | Error Message |
|--------|---------------|
| 401 | "Authentication failed. Please login again." |
| 403 | "You do not have permission to access this resource." |
| 404 | "Report endpoint not found." |
| 500 | "Server error: {error message}" |
| Network | "Unable to reach the server. Is the backend running?" |

### 6.2 Backend Error Handling

```javascript
401 Unauthorized
  - Token missing in request
  - Token invalid or expired
  - Response: { success: false, message: "Access token is missing" }

403 Forbidden
  - User lacks required role
  - Response: { success: false, message: "You do not have permission..." }

500 Internal Server Error
  - Database query failed
  - PDF/CSV generation failed
  - Response: { success: false, message: "Failed to export report: {error}" }
```

## 7. Testing the Implementation

### 7.1 Prerequisites
- Backend running on http://localhost:5000
- Frontend running on http://localhost:5173
- Valid JWT token in localStorage

### 7.2 Test Steps

1. **Login:** 
   - Navigate to login page
   - Enter valid credentials
   - Token should be stored in localStorage

2. **Export Report:**
   - Navigate to Export Report page
   - Verify authentication status shows "✅ Authenticated"
   - Select a report format
   - Click "Download Report"
   - File should download to local machine

3. **Debug Issues:**
   - Open browser dev tools (F12)
   - Go to Console tab
   - Look for API request logs
   - Check for error messages
   - Verify Authorization header is included

### 7.3 Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | No token in localStorage | Login first |
| 401 Unauthorized | Token expired | Refresh token or login again |
| 403 Forbidden | User is not admin/accountant | Use admin account |
| Network Error | Backend not running | Start backend: `npm run dev` |
| CORS Error | Wrong backend URL | Check VITE_API_URL in .env |
| PDF/CSV not downloading | Browser popup blocked | Allow popups in browser settings |

## 8. Database Queries

### 8.1 Fee Payments Aggregate
```sql
SELECT 
  SUM(amount_pending) as pending_amount,
  COUNT(*) as pending_count
FROM fee_payments
WHERE payment_status IN ('PENDING', 'PARTIAL', 'OVERDUE')
  AND is_active = true
```

### 8.2 Recent Transactions
```sql
SELECT 
  p.id,
  s.id as student_id,
  s.name as student_name,
  p.amount,
  p.payment_method,
  p.transaction_id,
  fp.total_amount,
  fp.amount_paid,
  fp.payment_status,
  p.created_at
FROM payments p
JOIN fee_payments fp ON p.fee_payment_id = fp.id
JOIN students s ON fp.student_id = s.id
ORDER BY p.created_at DESC
LIMIT ?
```

## 9. Environment Variables

### Backend (.env)
```
JWT_SECRET=your_secret_key
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
DATABASE_URL=postgresql://user:pass@localhost:5432/db
PORT=5000
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000
VITE_API_TIMEOUT=10000
```

## 10. Production Checklist

- [ ] JWT secret is strong and kept secure
- [ ] Tokens have appropriate expiry times
- [ ] CORS is configured correctly
- [ ] Rate limiting is implemented
- [ ] Error messages don't expose sensitive info
- [ ] File paths are validated and sanitized
- [ ] Large files are handled properly
- [ ] Database queries are optimized
- [ ] Logs are properly configured
- [ ] Error tracking is enabled (e.g., Sentry)

## 11. Performance Optimization

- Use database indexes on commonly queried fields
- Paginate large result sets
- Cache frequently accessed reports
- Compress PDF/CSV files for transfer
- Implement request rate limiting
- Use connection pooling for database

## 12. Security Best Practices

- Always verify JWT token before processing
- Use HTTPS in production
- Implement CSRF protection
- Validate and sanitize user input
- Use environment variables for secrets
- Implement audit logging
- Regular security audits
- Keep dependencies updated

## Troubleshooting Guide

### No files downloading after clicking "Download Report"

1. Check browser console (F12 → Console tab)
2. Look for network errors or 401/403/500 responses
3. Verify token is in localStorage: `localStorage.getItem('authToken')`
4. Check if browser popup blocker is preventing download
5. Verify backend is running and accessible

### "401 Unauthorized" error

1. Ensure you're logged in
2. Check if token has expired
3. Try logging out and logging back in
4. Check if Authorization header is included: Look at Network tab → Headers
5. Verify JWT secret is same in backend

### Backend not receiving Authorization header

1. Check reportService.js has correct interceptor setup
2. Verify token format is "Bearer {token}"
3. Check CORS configuration allows Authorization header
4. Verify backend middleware is checking Authorization header

## Additional Resources

- JWT Documentation: https://jwt.io/
- Express.js Middleware: https://expressjs.com/en/guide/using-middleware.html
- Prisma Documentation: https://www.prisma.io/docs/
- PDFKit Documentation: https://pdfkit.org/
- Axios Documentation: https://axios-http.com/

---

**Last Updated:** 2025-05-02
**Status:** Complete Implementation
