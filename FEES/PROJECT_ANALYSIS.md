# Fee-Module Project - Comprehensive Analysis

**Generated:** 2026-06-18  
**Project Path:** `c:\Users\Atharva Bide\Desktop\ACURA CRM\module\Fee-module1.1`

---

## 1. BACKEND ANALYSIS

### 1.1 API Routes & Endpoints Summary

#### **Authentication Routes** (`/api/auth`)
| Method | Endpoint | Protected | Role Required | Description |
|--------|----------|-----------|---------------|-------------|
| POST | `/auth/register` | ❌ | - | Register new user with email/phone |
| POST | `/auth/login` | ❌ | - | Login with email and password |
| POST | `/auth/refresh-token` | ❌ | - | Refresh access token using refresh token |
| POST | `/auth/logout` | ❌ | - | Logout and invalidate tokens |

#### **Fee Payment Routes** (`/api/fee-payments`)
| Method | Endpoint | Protected | Role Required | Description |
|--------|----------|-----------|---------------|-------------|
| POST | `/fee-payments/` | ✅ | admin, accountant | Create new fee payment record |
| POST | `/fee-payments/submit` | ✅ | - | Submit fee payment from frontend |
| POST | `/fee-payments/:id/record-payment` | ✅ | admin, accountant | Record payment against fee record |
| GET | `/fee-payments/pending` | ✅ | - | Get pending payments with pagination |
| GET | `/fee-payments/overdue` | ✅ | - | Get overdue payments with grace period |
| GET | `/fee-payments/dashboard/stats` | ✅ | admin, accountant | Dashboard statistics (collected, pending, overdue) |
| GET | `/fee-payments/dashboard/monthly` | ✅ | admin, accountant | Monthly collection data by year |
| GET | `/fee-payments/dashboard/recent-transactions` | ✅ | admin, accountant | Recent transactions list |

#### **Payment Routes** (`/api/payments` - Razorpay)
| Method | Endpoint | Protected | Role Required | Description |
|--------|----------|-----------|---------------|-------------|
| POST | `/payments/create-order` | ❌ | - | Create Razorpay order for UPI payment |
| POST | `/payments/verify` | ❌ | - | Verify payment signature & update fee status |
| POST | `/payments/verify-payment` | ❌ | - | **DEPRECATED** - Use `/verify` instead |
| POST | `/payments/webhook` | ❌ | - | Razorpay webhook for payment callbacks |
| GET | `/payments/status/:paymentId` | ✅ | - | Get payment status from Razorpay |
| POST | `/payments/refund` | ✅ | admin | Refund a payment |

#### **Refund Routes** (`/api/refunds`)
| Method | Endpoint | Protected | Role Required | Description |
|--------|----------|-----------|---------------|-------------|
| POST | `/refunds/` | ✅ | - | Create refund request |
| GET | `/refunds/` | ✅ | - | Get refund requests with filters |
| POST | `/refunds/:id/approve` | ✅ | admin, accountant | Approve refund request |
| POST | `/refunds/:id/reject` | ✅ | admin, accountant | Reject refund request with reason |
| POST | `/refunds/:id/process` | ✅ | admin | Process approved refund |
| GET | `/refunds/stats` | ✅ | admin, accountant | Refund statistics |

#### **Student Routes** (`/api/students`)
| Method | Endpoint | Protected | Role Required | Description |
|--------|----------|-----------|---------------|-------------|
| POST | `/students/` | ✅ | admin, accountant | Create new student record |
| GET | `/students/search` | ✅ | - | Search students by name, email, ID, filters |
| GET | `/students/:id` | ✅ | - | Get specific student details |
| PUT | `/students/:id` | ✅ | admin, accountant | Update student information |
| DELETE | `/students/:id` | ✅ | admin | Delete student record |
| POST | `/students/bulk-upload` | ✅ | admin | Bulk upload students from CSV/Excel |

#### **Report Routes** (`/api/reports`)
| Method | Endpoint | Protected | Role Required | Description |
|--------|----------|-----------|---------------|-------------|
| GET | `/reports/export` | ✅ | admin, accountant | Export comprehensive fee report as PDF |
| GET | `/reports/dashboard-stats` | ✅ | admin, accountant | Get current dashboard statistics |
| GET | `/reports/transactions/csv` | ✅ | admin, accountant | Export recent transactions as CSV |
| GET | `/reports/pending-payments/csv` | ✅ | admin, accountant | Export pending payments as CSV |

#### **Health Check**
| Method | Endpoint | Protected | Description |
|--------|----------|-----------|-------------|
| GET | `/health` | ❌ | Server health check endpoint |

---

### 1.2 Controllers & Exported Functions

#### **authController.js**
```javascript
- register(req, res, next)          // User registration
- login(req, res, next)              // User login
- refreshToken(req, res, next)       // Refresh access token
- logout(req, res, next)             // User logout
```

#### **feePaymentController.js**
```javascript
- createFeePayment(req, res, next)   // Create fee payment record
- submitFeePayment(req, res, next)   // Submit payment from frontend
- recordPayment(req, res, next)      // Record payment against fee
- getPendingPayments(req, res, next) // Get pending fees list
- getOverduePayments(req, res, next) // Get overdue fees list
// Dashboard endpoints
- getDashboardStats(req, res, next)  // Aggregate fee statistics
- getMonthlyData(req, res, next)     // Monthly collection trends
- getRecentTransactions(req, res, next) // Recent payment transactions
```

#### **paymentController.js**
```javascript
- createOrder(req, res)              // Create Razorpay order
- verifyPayment(req, res)            // Verify payment signature
- handlePaymentWebhook(req, res)     // Handle Razorpay webhook
- getPaymentStatus(req, res)         // Get Razorpay payment status
```

#### **refundController.js**
```javascript
- createRefundRequest(req, res, next)   // Create refund request
- getRefundRequests(req, res, next)     // Fetch refund requests
- approveRefundRequest(req, res, next)  // Approve refund
- rejectRefundRequest(req, res, next)   // Reject refund
- processRefund(req, res, next)         // Process approved refund
- getRefundStats(req, res, next)        // Refund statistics
```

#### **studentController.js**
```javascript
- createStudent(req, res, next)      // Create new student
- getStudent(req, res, next)         // Get student by ID
- updateStudent(req, res, next)      // Update student record
- deleteStudent(req, res, next)      // Delete student record
- searchStudents(req, res, next)     // Search with filters (city, course, class, status)
- bulkUploadStudents(req, res, next) // Bulk import from CSV/Excel
```

#### **reportController.js**
```javascript
- ReportController.exportReport(req, res)        // PDF export
- ReportController.exportDashboardStats(req, res) // Dashboard statistics
- ReportController.exportTransactionsCSV(req, res) // CSV export
- ReportController.exportPendingPaymentsCSV(req, res) // Pending CSV
```

---

### 1.3 Middleware

#### **auth.js**
- `authenticateToken(req, res, next)` - JWT Bearer token validation
- `authorizeRole(...roles)` - Role-based access control (admin, accountant, staff)

#### **validation.js**
- `validateRequest(schema)` - Joi schema validation for request body
- `validateQuery(schema)` - Joi schema validation for query parameters

#### **errorHandler.js**
- `errorHandler(err, req, res, next)` - Global error handler for all errors
- Handles: Mongoose validation, duplicate keys, JWT errors, internal errors
- `asyncHandler(fn)` - Wrapper for async route handlers

#### **requestLogger.js**
- Logs all HTTP requests with method, URL, status, and duration

---

### 1.4 Database Models & Schema (Prisma + PostgreSQL)

#### **Core Models**

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **User** | System users (admin, accountant, staff) | id, email, phone, password, role, firstName, lastName, isActive, lastLogin |
| **Parent** | Student parents/guardians | id, firstName, lastName, email, phone, relationship, occupation, address, city, state |
| **Student** | Student records | id, studentId (unique), firstName, lastName, email, phone, courseId, classId, status (ACTIVE, INACTIVE, GRADUATED, SUSPENDED), enrollmentDate, parentId |
| **Course** | Courses/Programs | id, name, code, description, durationValue, durationUnit, isActive |
| **Class** | Classes within courses | id, name, code, courseId, semester, capacity, isActive |
| **FeeType** | Fee categories | id, name, description, isActive |
| **FeeStructure** | Fee configuration per course/class | courseId, classId, academicYear, totalFee, paymentTerms, dueDate, gracePeriodDays, penaltyPerDay |
| **FeeStructureComponent** | Fee breakdown | feeStructureId, feeTypeId, amount |
| **FeePayment** | Invoice records | studentId, feeStructureId, totalAmount, amountPaid, dueDate, paymentStatus (PENDING, PARTIAL, PAID, OVERDUE), penaltyCharges, discountAmount |
| **Payment** | Transaction records | feePaymentId, amount, paymentMethod (CASH, CHEQUE, BANK_TRANSFER, ONLINE, DD), transactionId, receivedBy |
| **RefundRequest** | Refund requests | studentId, feePaymentId, amount, reason, status (PENDING, APPROVED, REJECTED, PROCESSED), refundMethod, bankDetails |
| **BulkUploadLog** | Upload tracking | fileName, totalRecords, successCount, failureCount, status |

#### **Model Relationships**
```
User (1) ─── (M) FeePayment [approver]
User (1) ─── (M) RefundRequest [approver, creator]

Parent (1) ─── (M) Student
Student (1) ─── (M) FeePayment
Student (1) ─── (M) RefundRequest

Course (1) ─── (M) Class
Course (1) ─── (M) FeeStructure
Course (1) ─── (M) Student

Class (1) ─── (M) FeeStructure
Class (1) ─── (M) Student

FeeStructure (1) ─── (M) FeePayment
FeeStructure (1) ─── (M) FeeStructureComponent
FeeStructureComponent (M) ─── (1) FeeType

FeePayment (1) ─── (M) Payment
FeePayment (1) ─── (M) RefundRequest

RefundRequest (M) ─── (1) Student
RefundRequest (M) ─── (1) FeePayment
```

---

### 1.5 Environment Variables Required

**Location:** `.env` file in `backend/` directory

```env
# ============ Server Configuration ============
NODE_ENV=development                    # development, production
PORT=5000                               # API server port
HOST=localhost                          # Server host
FRONTEND_URL=http://localhost:5173      # Frontend URL (for CORS)
ADMIN_FRONTEND_URL=http://localhost:5173 # Admin frontend URL

# ============ PostgreSQL Database ============
DATABASE_URL=postgresql://postgres:Yash2005@localhost:5432/fee_management?schema=public
# Format: postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?schema=public

# ============ JWT Configuration ============
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_in_production
ACCESS_TOKEN_EXPIRY=7d                  # Access token expiration
REFRESH_TOKEN_EXPIRY=30d                # Refresh token expiration

# ============ CORS Configuration ============
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# ============ File Upload ============
MAX_FILE_SIZE=10485760                  # 10MB in bytes
UPLOAD_DIR=./uploads                    # Upload directory

# ============ Logging ============
LOG_LEVEL=debug                         # debug, info, warn, error
LOG_FILE=./logs/app.log                # Application log file
ERROR_LOG_FILE=./logs/error.log        # Error log file

# ============ API Rate Limiting ============
RATE_LIMIT_WINDOW=15                    # Rate limit window in minutes
RATE_LIMIT_MAX_REQUESTS=100             # Max requests per window

# ============ Razorpay Configuration ============
RAZORPAY_KEY_ID=rzp_test_xxxxx          # Razorpay API Key (test/prod)
RAZORPAY_KEY_SECRET=test_secret_key_change_in_production
RAZORPAY_WEBHOOK_SECRET=webhook_secret_key_change_in_production
```

---

### 1.6 Database Configuration & Connection

**Primary Database:** PostgreSQL with Prisma ORM

**Database Config File:** `backend/config/database.js`

**⚠️ ISSUE DETECTED:** The config file shows MongoDB/Mongoose imports, but the project actually uses **PostgreSQL + Prisma** (as shown in `prisma/schema.prisma`).

```javascript
// Current (INCORRECT - needs update)
import mongoose from 'mongoose';
export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fee-management';
  await mongoose.connect(mongoURI, {...});
};

// Should be: Prisma auto-connects via DATABASE_URL in .env
// PrismaClient is initialized in each service file
```

**Connection Details:**
- **Host:** localhost (default)
- **Port:** 5432 (PostgreSQL default)
- **Database:** fee_management
- **Username:** postgres
- **Password:** Yash2005 (from .env.example)
- **Schema:** public

**Prisma Setup:**
- ORM: `@prisma/client` v5.7.1
- Database: PostgreSQL
- Schema file: `backend/prisma/schema.prisma`
- Migrations: `backend/prisma/migrations/`

**Key Commands:**
```bash
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Run pending migrations
npx prisma migrate reset # Reset database
npx prisma studio       # Open Prisma Studio GUI
```

---

### 1.7 Services Layer

#### **authService.js**
- `register(userData)` - Create new user with hashed password
- `login(email, password)` - Authenticate user, return tokens
- `refreshAccessToken(userId, refreshToken)` - Generate new access token
- `logout(userId, refreshToken)` - Invalidate refresh token

#### **feePaymentService.js**
- `createFeePayment(data)` - Create fee payment record
- `submitFeePayment(data)` - Submit payment from frontend
- `recordPayment(id, paymentData, userId)` - Record payment transaction
- `getPendingPayments(filters, skip, limit)` - Query pending fees
- `getOverduePayments(graceDays, skip, limit)` - Query overdue fees
- Dashboard data methods for stats, monthly data, recent transactions

#### **paymentService.js**
- `createOrder(orderData)` - Create Razorpay order for payment
- `verifyPaymentSignature(paymentData, webhookSecret)` - Verify payment signature
- `updateFeePaymentStatus(studentId, amount)` - Update fee after verification

#### **refundService.js**
- `createRefundRequest(refundData, studentId)` - Create refund request
- `approveRefundRequest(refundId, approvalData)` - Approve refund
- `rejectRefundRequest(refundId, rejectionData)` - Reject refund
- `processRefund(refundId, transactionData)` - Process approved refund
- `getRefundRequests(filters, skip, limit)` - Query refunds
- `getRefundStats()` - Get refund statistics

#### **studentService.js**
- `createStudent(studentData)` - Create new student
- `getStudentById(id)` - Fetch student by ID
- `updateStudent(id, updateData)` - Update student record
- `deleteStudent(id)` - Delete student
- `searchStudents(filters, skip, limit)` - Search with multiple filters
- `bulkCreateStudents(studentsArray)` - Import multiple students

#### **reportService.js**
- `exportReport()` - Generate PDF report
- `exportDashboardStats()` - Export dashboard metrics
- `exportTransactionsCSV()` - Export transactions as CSV
- `exportPendingPaymentsCSV()` - Export pending payments as CSV

---

### 1.8 Validators (Joi Schemas)

#### **authValidator.js**
- `loginSchema` - email, password
- `createUserSchema` - firstName, lastName, email, phone, password, role

#### **feePaymentValidator.js**
- `createFeePaymentSchema` - student, feeStructure, totalAmount, dueDate
- `submitFeePaymentSchema` - totalAmount, amountPaid (with validation: amountPaid ≤ totalAmount), paymentMethod, paymentStatus, student, dueDate, notes
- `recordPaymentSchema` - amount, paymentMethod, transactionId, notes

#### **studentValidator.js**
- `createStudentSchema` - firstName, lastName, email, phone, courseId, classId, enrollmentDate
- `updateStudentSchema` - firstName, lastName, email, phone, status, etc.

#### **refundValidator.js**
- `createRefundRequestSchema` - feePayment, amount, reason, description, refundMethod, bankDetails

---

## 2. FRONTEND ANALYSIS

### 2.1 Pages/Views Available

| Page | Route | Purpose | Key Components |
|------|-------|---------|-----------------|
| **Dashboard** | `/` | Main overview page | Stat cards, charts, recent transactions |
| **Fees** | `/fees` | Fee monitoring & tracking | Transaction table, filters, search |
| **Bulk Upload** | `/bulk-upload` | Import student/fee data | File upload, progress tracking |
| **Export Report** | `/export-report` | Generate/download reports | Report options, export buttons |
| **Invoice** | `/invoice/:invoiceId` | Invoice details & review | Invoice data display |
| **Payment** | `/payment/:invoiceId` | Payment gateway interface | Razorpay, payment methods |
| **Payment Success** | `/payment-success` | Payment confirmation page | Transaction confirmation |
| **Receipt** | `/receipt/:invoiceId` | Payment receipt view | Receipt details, download |
| **Refund Request** | `/refund-request` | Create refund request | Form, submission |
| **Refund Success** | `/refund/success` | Refund confirmation page | Confirmation details |
| **Refund Management** | `/refund-management` | Manage refund requests | Refund list, actions |
| **Refund Details** | `/refund-details/:id` | View refund details | Refund information |

---

### 2.2 React Components Structure

#### **Layout Components** (`components/layout/`)
- `MainLayout.jsx` - Main app wrapper with Sidebar and Navbar
- Provides: Sidebar, Navbar, main content area

#### **Dashboard Components** (`components/dashboard/`)
- `DashboardHeader.jsx` - Page header with title
- `DashboardMetrics.jsx` - Stats cards (Total Collected, Pending, Overdue, Refunds)
- `FinancialDashboard.jsx` - Dashboard container
- `SummaryCardsSection.jsx` - Card grid layout
- `TransactionsTable.jsx` - Recent transactions table
- `RefundRequestsCard.jsx` - Refund requests display

#### **Chart Components** (`components/charts/`)
- `MonthlyFeeChart.jsx` - Line/Bar chart for monthly collection trends
- `PaymentMethodChart.jsx` - Pie chart for payment method distribution

#### **Card Components** (`components/cards/`)
- Various reusable card components for metrics display

#### **Navigation Components** (`components/navbar/`, `components/sidebar/`)
- `Navbar.jsx` - Top navigation bar
- `Sidebar.jsx` - Side navigation menu

#### **Modals** (`components/modals/`)
- Modal dialogs for confirmations, data entry

#### **Refund Components** (`components/refund/`)
- Refund-specific UI components

#### **Other Components**
- `SendMessageButtons.jsx` - WhatsApp/SMS notification buttons
- `shared/` - Reusable shared components

---

### 2.3 API Endpoints Called by Frontend

#### **Dashboard Data**
```javascript
GET /api/fee-payments/dashboard/stats              // Metrics (collected, pending, overdue)
GET /api/fee-payments/dashboard/monthly?year=2024  // Monthly collection data
GET /api/fee-payments/dashboard/recent-transactions?limit=5 // Recent transactions
GET /api/transactions                               // Payment methods distribution
```

#### **Fee Payments**
```javascript
GET /api/fee-payments/pending?page=1&limit=100     // Pending fees list
GET /api/fee-payments/overdue                      // Overdue fees list
POST /api/fee-payments/submit                      // Submit fee payment
GET /api/invoice/:invoiceId                        // Invoice details (mock endpoint - not in backend)
```

#### **Payment Gateway**
```javascript
POST /api/payments/create-order                    // Create Razorpay order
POST /api/payments/verify                          // Verify payment signature
POST /api/payments/verify-payment                  // Verify payment (deprecated)
```

#### **Refunds**
```javascript
POST /api/refunds                                  // Create refund request
GET /api/refunds?status=PENDING                    // Get refund requests with filters
POST /api/refunds/:id/approve                      // Approve refund
POST /api/refunds/:id/reject                       // Reject refund
POST /api/refunds/:id/process                      // Process refund
GET /api/refunds/stats                             // Refund statistics
```

#### **Notifications** (Not in Backend)
```javascript
POST /api/notifications/whatsapp                   // Send WhatsApp message
POST /api/notifications/sms                        // Send SMS message
```

#### **Health Check**
```javascript
GET /api/health                                    // Server health check
```

---

### 2.4 Frontend API Service Structure

**File:** `frontend/src/services/apiService.js`

**Configuration:**
```javascript
API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000/api'
API_TIMEOUT = process.env.VITE_API_TIMEOUT || 10000ms
```

**Axios Instance Setup:**
- Base URL: `/api` appended to backend host
- Timeout: 10 seconds
- Interceptors: Request (token injection), Response (error handling)

**Exported Functions:**
- `fetchDashboardStats()` - Get dashboard metrics
- `fetchMonthlyCollectionData(year)` - Get monthly data
- `fetchPaymentMethodData()` - Get payment method stats
- `fetchPendingFeesData(page, limit)` - Get pending fees
- `fetchRecentTransactions(limit)` - Get recent transactions
- `fetchInvoiceDetails(invoiceId)` - Get invoice details
- `processPayment(invoiceId, amount, method)` - Process payment
- `createRefundRequest(refundData)` - Create refund
- `fetchRefundRequests(filters)` - Get refunds
- `approveRefundRequest(refundId, approvalData)` - Approve refund
- `rejectRefundRequest(refundId, rejectionData)` - Reject refund
- `processRefund(refundId, transactionData)` - Process refund
- `sendWhatsAppMessage(invoiceId)` - Send WhatsApp (not implemented in backend)
- `sendSMSMessage(invoiceId)` - Send SMS (not implemented in backend)

---

### 2.5 State Management

**Current Implementation:**
- ❌ **No Redux store** detected
- ❌ **No Context API** detected
- ✅ **Local React State** (useState hooks in components)
- ✅ **SessionStorage** for temporary data (payment data, refund data)
- ✅ **LocalStorage** for auth token storage

**State Management Points:**
- Dashboard metrics state in `Dashboard.jsx`
- Fee list state in `Fees.jsx`
- Payment form state in `Payment.jsx`
- Refund form state in `RefundRequest.jsx`

---

### 2.6 Frontend Environment Variables

**Location:** `.env` or `.env.local` in `frontend/` directory

**Expected Variables:**
```env
VITE_API_URL=http://localhost:5000          # Backend API base URL
VITE_API_TIMEOUT=10000                      # API request timeout in ms
```

**Current Setup:**
- Uses `import.meta.env.VITE_*` to read environment variables (Vite standard)
- Falls back to `http://localhost:5000` if not defined

---

### 2.7 Authentication Mechanism

**Current Implementation:**
- JWT-based authentication (Bearer token)
- Token stored in `localStorage.getItem('authToken')`
- Token sent in header: `Authorization: Bearer {token}`

**Flow:**
1. Frontend makes login request to `/api/auth/login`
2. Backend returns `accessToken` and `refreshToken`
3. Frontend stores tokens in localStorage
4. API interceptor adds token to all subsequent requests
5. If token expires, use refreshToken to get new token

**Missing:** No actual login UI found in the project - appears to be a dashboard-only interface

---

### 2.8 Mock Data & Services

**Mock Data Files** (`frontend/src/data/`):
- `dashboardData.js` - Mock dashboard statistics (now fetches from API)
- `invoiceData.js` - Mock invoice data
- `refundData.js` - Mock refund data
- `transactionsData.js` - Mock transaction data

**Current Status:** These files are being replaced with API calls, but still have fallback mock data defined.

---

### 2.9 Hardcoded Values Detected

- API timeout: `10000ms` (hardcoded, should be env variable)
- Backend URL: Falls back to `http://localhost:5000`
- Payment methods: Hardcoded list in `Payment.jsx` (Razorpay, Stripe, UPI Direct)

---

## 3. INTEGRATION GAPS & ISSUES

### 3.1 Missing API Endpoints in Backend

Frontend calls these endpoints, but **NOT implemented** in backend:

| Frontend Call | Route | Status | Impact |
|---------------|-------|--------|--------|
| `fetchInvoiceDetails()` | `GET /api/invoice/:invoiceId` | ❌ Missing | Invoice page will fail |
| `processPayment()` | `POST /api/payment` | ❌ Missing | Payment method selection broken |
| `fetchTransactions()` | `GET /api/transactions` | ❌ Missing | Payment method chart will fail |
| `fetchPendingFees()` | `GET /api/pending-fees` | ❌ Missing | Fees page will fail |
| `sendWhatsAppMessage()` | `POST /api/notifications/whatsapp` | ❌ Missing | WhatsApp button won't work |
| `sendSMSMessage()` | `POST /api/notifications/sms` | ❌ Missing | SMS button won't work |
| `getPaymentMethodData()` | Various methods to calc distribution | ⚠️ Incomplete | Chart may not show correctly |

---

### 3.2 Data Structure Mismatches

#### **FeePayment Structure Mismatch**

**Frontend expects:** (from `transactionsData.js`)
```javascript
{
  invoiceId: string,
  studentName: string,
  studentId: string,
  class: string,
  amount: number,
  amountPaid: number,
  dueDate: string,
  status: "Paid" | "Pending" | "Failed",
  paymentMethod: string,
  timestamp: date
}
```

**Backend provides:** (from Prisma schema)
```javascript
{
  id: string (CUID),
  studentId: string,
  feeStructureId: string,
  totalAmount: decimal,
  amountPaid: decimal,
  amountPending: decimal,
  dueDate: date,
  paymentStatus: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE",
  penaltyCharges: decimal,
  discountAmount: decimal,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Issues:**
- Backend doesn't have `studentName`, `class`, `invoiceId`
- Status values differ (string vs enum)
- Missing student/class population in response

#### **Student Data Mismatch**

**Frontend expects:** Student data from mock
**Backend provides:** Student with relations to Course/Class

**Issues:**
- Frontend `searchStudents()` expects user to be authenticated, but no login UI exists
- No student creation form in frontend

#### **Refund Data Mismatch**

**Frontend RefundRequest form:**
```javascript
{
  invoiceId: string,
  studentName: string,
  amount: string,
  reason: string,
  notes: string
}
```

**Backend RefundRequest model:**
```javascript
{
  studentId: string,
  feePaymentId: string,
  amount: decimal,
  reason: string,
  description: string,
  refundMethod: "BANK_TRANSFER" | "CHEQUE" | "CASH",
  bankDetails: {...},
  status: "PENDING" | "APPROVED" | "REJECTED" | "PROCESSED"
}
```

**Issues:**
- Frontend sends `invoiceId`, backend expects `feePaymentId`
- Frontend doesn't have `refundMethod` or bank details form
- Frontend `studentName` maps to which backend field? (studentId is required)

---

### 3.3 Authentication Issues

**Problem:** Frontend tries to authenticate with JWT token, but:
- ❌ No login page/component exists
- ❌ Token not set in localStorage initially
- ❌ API calls using `GET /students/search` require authentication but no user context

**Current Flow:**
1. User navigates to frontend
2. Frontend assumes user is logged in (token in localStorage)
3. All API calls fail with 401 Unauthorized

---

### 3.4 Environment Variable Mismatches

**Backend .env.example expects:**
```
DATABASE_URL=postgresql://...
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=test_secret_key_...
RAZORPAY_WEBHOOK_SECRET=webhook_secret_...
JWT_SECRET=your_super_secret_jwt_key...
```

**Frontend .env expectations:**
```
VITE_API_URL=http://localhost:5000
VITE_API_TIMEOUT=10000
```

**Issue:** Frontend has no `.env.example` or documentation for setup

---

### 3.5 Database Configuration Issue

**Problem:** Backend `config/database.js` uses MongoDB/Mongoose:
```javascript
import mongoose from 'mongoose';
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/...';
```

**But:** Actual database is PostgreSQL with Prisma (as shown in `prisma/schema.prisma`)

**Impact:** Database connection will fail; file needs to be removed or rewritten

---

### 3.6 Model Relationships Missing from Frontend

Backend supports these but frontend doesn't use:
- Student → Parent relationship
- Student → Course/Class relationships
- FeeStructure → FeeStructureComponent breakdown
- Fee payment history (multiple payments per invoice)

---

### 3.7 API Response Format Inconsistencies

**Inconsistent Responses:**

**Dashboard endpoint format:**
```javascript
{
  success: true,
  data: {
    overallStats: { totalCollected: ... },
    byStatus: [{ status: "PAID", totalAmount: ... }, ...]
  }
}
```

**Fee payment endpoint format:**
```javascript
{
  success: true,
  data: [...pagination...],
  pagination: { page, total, pages }
}
```

**Frontend assumes:**
```javascript
response.data?.data || response.data
```

---

### 3.8 Missing Endpoints for Expected Features

**Bulk Upload:**
- Frontend has `/bulk-upload` page but no bulk upload form implementation
- Backend has `POST /students/bulk-upload` but no file upload handling

**Export Report:**
- Frontend has `/export-report` page but no report generation UI
- Backend has report endpoints but no form to trigger them

**Payment Methods:**
- Frontend hardcodes "Razorpay, Stripe, UPI Direct"
- Backend only supports Razorpay
- No Stripe integration exists

---

## 4. CRITICAL ISSUES SUMMARY

| Issue | Severity | Impact | Fix Priority |
|-------|----------|--------|--------------|
| Missing `/api/invoice/:invoiceId` endpoint | 🔴 Critical | Invoice page broken | P0 |
| Missing `/api/pending-fees` endpoint | 🔴 Critical | Fees page broken | P0 |
| Missing `/api/transactions` endpoint | 🔴 Critical | Payment chart broken | P0 |
| `database.js` uses MongoDB instead of PostgreSQL | 🔴 Critical | App won't start | P0 |
| No login page/authentication UI | 🔴 Critical | Can't authenticate | P0 |
| FeePayment data structure mismatch | 🟠 High | Dashboard data inconsistent | P1 |
| Missing SMS/WhatsApp notification endpoints | 🟠 High | Notification buttons broken | P1 |
| Refund data structure mismatch | 🟠 High | Refund submission fails | P1 |
| No `.env` setup documentation for frontend | 🟡 Medium | Dev setup unclear | P2 |
| Mock data still referenced but obsolete | 🟡 Medium | Confusion, technical debt | P2 |
| Missing bulk upload UI | 🟡 Medium | Feature incomplete | P2 |
| Hardcoded payment methods | 🟡 Medium | Limited flexibility | P3 |

---

## 5. RECOMMENDED INTEGRATION FIXES

### 5.1 Immediate Actions (P0)

1. **Remove MongoDB import from `backend/config/database.js`**
   - Delete the file entirely (Prisma auto-connects)
   - Or rewrite to use Prisma if custom logic needed

2. **Create missing API endpoints:**

   **`GET /api/fee-payments/:id`** - Get single fee payment
   ```javascript
   // Returns fee payment with student details
   {
     id, studentId, studentName, class, totalAmount, amountPaid,
     dueDate, paymentStatus, createdAt
   }
   ```

   **`GET /api/fee-payments/list`** - Get all fee payments
   ```javascript
   // Returns paginated list with student/class details
   ```

   **`POST /api/payment`** - Process payment (different from verify)
   ```javascript
   // Handles general payment processing
   ```

   **`GET /api/transactions`** - Get transaction list
   ```javascript
   // Returns transactions grouped by payment method
   ```

3. **Add login page/authentication UI:**
   - Create `/login` route
   - Add login form component
   - Handle JWT token storage
   - Add logout functionality to navbar

---

### 5.2 High Priority Fixes (P1)

1. **Fix data structure responses:**
   - Add student/class details to FeePayment queries
   - Standardize response formats across all endpoints

2. **Implement notification endpoints:**
   - `POST /api/notifications/whatsapp`
   - `POST /api/notifications/sms`

3. **Update Frontend API service:**
   - Change refund request to use correct field names
   - Add invoice fetch endpoint
   - Fix fee payment list mapping

4. **Create `.env.example` for frontend:**
   ```env
   VITE_API_URL=http://localhost:5000
   VITE_API_TIMEOUT=10000
   ```

---

### 5.3 Medium Priority Fixes (P2)

1. **Implement bulk upload UI:**
   - CSV file picker
   - Column mapping
   - Progress tracking
   - Error handling

2. **Implement export report UI:**
   - Report type selector
   - Date range picker
   - Export button with loading state

3. **Clean up mock data:**
   - Either use only API data or clearly separate mock mode
   - Remove unused mock files

---

## 6. TECHNOLOGY STACK SUMMARY

### Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | Latest (tsx for TS support) |
| Framework | Express.js | 4.18.2 |
| Database | PostgreSQL | 12+ |
| ORM | Prisma | 5.7.1 |
| Authentication | JWT + bcryptjs | 9.0.3 + 2.4.3 |
| Validation | Joi | 17.x |
| Payment Gateway | Razorpay | 2.9.6 |
| File Handling | Multer | 1.4.5 |
| Export | PDF (pdfkit), Excel (xlsx) | Latest |
| Logging | Winston | 3.11.0 |

### Frontend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 19.2.4 |
| Router | React Router | 7.13.1 |
| State | Redux + React-Redux | 5.0.1 + 9.3.0 |
| HTTP Client | Axios | 1.13.6 |
| Charts | Recharts | 3.8.0 |
| Build Tool | Vite | 8.0.14 |
| Styling | Tailwind CSS | 3.4 |
| Icons | Lucide React + React Icons | Latest |

---

## 7. DEPLOYMENT CONSIDERATIONS

### Backend Deployment
- Environment variables must be set (DATABASE_URL, JWT_SECRET, RAZORPAY_* keys)
- Prisma migrations must run: `npx prisma migrate deploy`
- Node version: 16+ recommended
- PORT: Default 5000

### Frontend Deployment
- Build command: `npm run build` → outputs to `dist/`
- Requires `VITE_API_URL` pointing to backend
- Static hosting (Vercel, Netlify, GitHub Pages)

### Database
- PostgreSQL 12+ required
- Backup strategy needed for production
- Connection pooling recommended (PgBouncer, PgPool)

---

**End of Analysis**

*This analysis identifies all API routes, models, data flow, and integration points. Use this as a reference for development, debugging, and completing missing features.*
