# Export Report Feature - Quick Reference & Code Snippets

## 📋 Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Frontend Integration](#frontend-integration)
3. [Error Codes](#error-codes)
4. [Database Queries](#database-queries)
5. [Authentication Flow](#authentication-flow)
6. [File Response Headers](#file-response-headers)
7. [Useful Commands](#useful-commands)

---

## API Endpoints

### Export PDF Report
```
GET /api/reports/export
Authorization: Bearer {JWT_TOKEN}

Response: Binary PDF file
Headers:
  Content-Type: application/pdf
  Content-Disposition: attachment; filename="Fee_Report_2025-05-02.pdf"
```

### Export Transactions CSV
```
GET /api/reports/transactions/csv?limit=50
Authorization: Bearer {JWT_TOKEN}

Query Parameters:
  - limit: Number of transactions (default: 50)

Response: CSV file
Headers:
  Content-Type: text/csv
  Content-Disposition: attachment; filename="Transactions_2025-05-02.csv"
```

### Export Pending Payments CSV
```
GET /api/reports/pending-payments/csv?limit=100
Authorization: Bearer {JWT_TOKEN}

Query Parameters:
  - limit: Number of records (default: 100)

Response: CSV file
```

### Export Refunds CSV
```
GET /api/reports/refunds/csv?limit=50
Authorization: Bearer {JWT_TOKEN}

Query Parameters:
  - limit: Number of refund requests (default: 50)

Response: CSV file
```

### Get Dashboard Stats (JSON)
```
GET /api/reports/dashboard-stats
Authorization: Bearer {JWT_TOKEN}

Response: JSON
{
  "success": true,
  "data": {
    "totalFeesCollected": 500000,
    "pendingPayments": 150000,
    "overduePayments": 25000,
    "refundRequests": 5000,
    "refundCount": 2
  }
}
```

### Get Available Formats
```
GET /api/reports/formats

Response: JSON
{
  "success": true,
  "data": [
    {
      "id": "pdf",
      "name": "PDF Report",
      "description": "...",
      "endpoint": "/api/reports/export"
    },
    ...
  ]
}
```

---

## Frontend Integration

### Using reportService

```javascript
import { reportService } from '../services/reportService';

// Export PDF
const result = await reportService.exportPDF();
if (result.success) {
  console.log('✅ PDF exported');
} else {
  console.error('❌', result.message);
}

// Export Transactions CSV
const result = await reportService.exportTransactionsCSV(50);

// Export Pending Payments CSV
const result = await reportService.exportPendingPaymentsCSV(100);

// Export Refunds CSV
const result = await reportService.exportRefundsCSV(50);

// Get Dashboard Stats
const stats = await reportService.getDashboardStats();

// Get Available Formats
const formats = await reportService.getAvailableFormats();
```

### Manual Fetch Implementation

```javascript
// Get token from localStorage
const token = localStorage.getItem('authToken');

// Export PDF with fetch
fetch('http://localhost:5000/api/reports/export', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(response => response.blob())
.then(blob => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Fee_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
})
.catch(error => console.error('Error:', error));
```

### React Component Example

```javascript
import React, { useState } from 'react';
import { reportService } from '../services/reportService';

function ExportReport() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleExport = async () => {
    setLoading(true);
    try {
      const result = await reportService.exportPDF();
      setMessage(result.success ? '✅ ' + result.message : '❌ ' + result.message);
    } catch (error) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleExport} disabled={loading}>
        {loading ? 'Exporting...' : 'Download Report'}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}

export default ExportReport;
```

---

## Error Codes

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access token is missing"
}
```
**Solution:** Check if token exists in localStorage and is valid

### 403 Forbidden
```json
{
  "success": false,
  "message": "You do not have permission to access this resource"
}
```
**Solution:** User must have admin or accountant role

### 404 Not Found
```json
{
  "success": false,
  "message": "Report endpoint not found"
}
```
**Solution:** Check endpoint URL

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to export report: {error details}"
}
```
**Solution:** Check backend logs for details

---

## Database Queries

### Get Dashboard Statistics

```javascript
// From reportService.js
const stats = await prisma.payment.aggregate({
  _sum: { amount: true },
  where: {
    createdAt: {
      gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
    }
  }
});
```

### Get Recent Transactions with Student Names

```javascript
const transactions = await prisma.payment.findMany({
  take: -50,
  select: {
    id: true,
    amount: true,
    paymentMethod: true,
    createdAt: true,
    feePayment: {
      select: {
        student: {
          select: { firstName: true, lastName: true, studentId: true }
        },
        totalAmount: true,
        amountPaid: true,
        paymentStatus: true
      }
    }
  },
  orderBy: { createdAt: 'desc' }
});
```

### Get Pending Payments

```javascript
const pending = await prisma.feePayment.findMany({
  where: {
    paymentStatus: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
    isActive: true
  },
  select: {
    id: true,
    totalAmount: true,
    amountPaid: true,
    amountPending: true,
    dueDate: true,
    paymentStatus: true,
    student: {
      select: {
        firstName: true,
        lastName: true,
        studentId: true,
        email: true
      }
    }
  },
  orderBy: { dueDate: 'asc' }
});
```

### Get Refund Requests

```javascript
const refunds = await prisma.refundRequest.findMany({
  where: {
    status: { in: ['PENDING', 'APPROVED'] }
  },
  select: {
    id: true,
    amount: true,
    reason: true,
    status: true,
    requestDate: true,
    student: {
      select: { firstName: true, lastName: true, studentId: true }
    }
  },
  orderBy: { requestDate: 'desc' }
});
```

---

## Authentication Flow

### 1. Login
```javascript
// Frontend
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const data = await response.json();
localStorage.setItem('authToken', data.data.accessToken);
localStorage.setItem('refreshToken', data.data.refreshToken);
```

### 2. API Request with Token
```javascript
// Frontend - Add to every request
const token = localStorage.getItem('authToken');
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

### 3. Backend Verification
```javascript
// backend/middleware/auth.js
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token after "Bearer "
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token missing' });
  }
  
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // User info attached to request
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
};
```

---

## File Response Headers

### PDF Response
```javascript
// backend/controllers/reportController.js
res.setHeader('Content-Type', 'application/pdf');
res.setHeader(
  'Content-Disposition',
  `attachment; filename="Fee_Report_${new Date().toISOString().split('T')[0]}.pdf"`
);
res.setHeader('Content-Length', pdfBuffer.length);
res.end(pdfBuffer);
```

### CSV Response
```javascript
res.setHeader('Content-Type', 'text/csv');
res.setHeader(
  'Content-Disposition',
  `attachment; filename="Transactions_${new Date().toISOString().split('T')[0]}.csv"`
);
res.end(csvContent);
```

### CSV Generation Utility
```javascript
static generateCSV(headers, rows) {
  const csvHeaders = headers
    .map(h => `"${h.replace(/"/g, '""')}"`)
    .join(',');

  const csvRows = rows
    .map(row =>
      row
        .map(cell => {
          const str = cell !== null && cell !== undefined ? String(cell) : '';
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\n');

  return `${csvHeaders}\n${csvRows}`;
}
```

---

## Useful Commands

### Backend Commands
```bash
# Start development server
npm run dev

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Open Prisma Studio (GUI for database)
npm run prisma:studio

# Reset database (CAREFUL!)
npm run db:reset

# Seed sample data
npm run db:seed
```

### Frontend Commands
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Useful curl Commands

```bash
# Check if backend is running
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Export PDF (with token)
curl -X GET http://localhost:5000/api/reports/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o report.pdf

# Export CSV
curl -X GET "http://localhost:5000/api/reports/transactions/csv?limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o transactions.csv

# Get dashboard stats
curl -X GET http://localhost:5000/api/reports/dashboard-stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Environment Variables Summary

**Backend (.env)**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/fee_management
JWT_SECRET=your_secret_key_at_least_32_characters
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:5000
VITE_API_TIMEOUT=10000
```

---

## Token Structure (JWT Payload)

```javascript
// Decoded JWT structure
{
  "userId": "user_id_here",
  "role": "admin",  // or "accountant" or "staff"
  "iat": 1704153600,  // Issued at
  "exp": 1704154500   // Expiration time
}
```

---

## Response Success Format

```javascript
// Standard success response
{
  "success": true,
  "message": "Report exported successfully",
  "data": { /* actual data */ }
}

// Success response for download
// HTTP 200 with binary data (PDF or CSV)
// Headers include Content-Disposition with filename
```

---

## Testing with Postman

### 1. Create Environment
```json
{
  "baseUrl": "http://localhost:5000",
  "token": ""
}
```

### 2. Login Request
```
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

### 3. Set Token
In Postman > Tests tab:
```javascript
pm.environment.set("token", pm.response.json().data.accessToken);
```

### 4. Export Report Request
```
GET {{baseUrl}}/api/reports/export
Authorization: Bearer {{token}}
```

---

## Debug Checklist

- [ ] Backend is running on port 5000
- [ ] Frontend is running on port 5173
- [ ] Database is connected
- [ ] `.env` files are configured
- [ ] Token is in localStorage
- [ ] Token is not expired (check `exp` field)
- [ ] User has admin/accountant role
- [ ] Authorization header is sent
- [ ] CORS is configured correctly
- [ ] API endpoint exists and responds
- [ ] Database tables have data
- [ ] No console errors in browser
- [ ] No console errors in backend
- [ ] File download is not blocked by popup blocker

---

## Performance Tips

```javascript
// 1. Limit query results
const limit = 50; // Instead of all records

// 2. Add database indexes (in Prisma schema)
@@index([paymentStatus])
@@index([createdAt])

// 3. Use select to fetch only needed fields
select: {
  id: true,
  amount: true,
  // Don't include unused fields
}

// 4. Cache frequently accessed reports
const cache = {};
if (cache.dashboardStats && Date.now() - cache.time < 60000) {
  return cache.dashboardStats;
}

// 5. Paginate large result sets
const skip = (page - 1) * limit;
const results = await prisma.model.findMany({
  take: limit,
  skip: skip
});
```

---

## Security Considerations

```javascript
// 1. Always verify token
if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

// 2. Check role-based access
if (!['admin', 'accountant'].includes(req.user.role)) {
  return res.status(403).json({ message: 'Forbidden' });
}

// 3. Sanitize file paths
// Don't allow user input in filenames

// 4. Validate query parameters
const limit = Math.min(parseInt(req.query.limit) || 50, 1000);

// 5. Use HTTPS in production
// Set up SSL/TLS certificate

// 6. Implement rate limiting
// Use express-ratelimit middleware

// 7. Add request validation
// Use express-validator middleware
```

---

**Last Updated:** 2025-05-02  
**Quick Reference Version:** 1.0
