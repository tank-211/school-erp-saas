# PostgreSQL Backend - API Documentation

Complete API reference for the ERP Fee Management System Backend.

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints (except register & login) require `Authorization` header:
```
Authorization: Bearer <access_token>
```

---

## Authentication Module (`/auth`)

### 1. Register User
**Create a new user account**

```http
POST /auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "9876543210",
  "password": "SecurePass123",
  "role": "STAFF"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "clpq1z3nk0000ujqj1z3nk000",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "STAFF"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Validation Rules:**
- Email: Valid email format, unique
- Phone: 10 digits, unique
- Password: Min 8 chars, uppercase, lowercase, numbers
- Role: ADMIN, ACCOUNTANT, or STAFF

---

### 2. Login
**Authenticate and receive tokens**

```http
POST /auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "clpq1z3nk0000ujqj1z3nk000",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "STAFF"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### 3. Get Current User Profile
**Fetch authenticated user details**

```http
GET /auth/profile
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "clpq1z3nk0000ujqj1z3nk000",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "9876543210",
    "role": "STAFF",
    "departmentName": "Academic",
    "isActive": true,
    "lastLogin": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:35:00Z"
}
```

---

### 4. Update Profile
**Update user information**

```http
PUT /auth/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "9876543211",
  "departmentName": "Finance"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "clpq1z3nk0000ujqj1z3nk000",
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.doe@example.com",
    "role": "STAFF",
    "departmentName": "Finance"
  },
  "timestamp": "2024-01-15T10:40:00Z"
}
```

---

## Students Module (`/students`)

### 1. Create Student
**Add a new student**

```http
POST /students
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "studentId": "STU20240001",
  "firstName": "Rahul",
  "lastName": "Kumar",
  "email": "rahul@example.com",
  "phone": "9876543212",
  "dateOfBirth": "2006-05-15",
  "gender": "Male",
  "street": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "postalCode": "400001",
  "country": "India",
  "courseId": "course-uuid-123",
  "classId": "class-uuid-123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "id": "student-uuid-123",
    "studentId": "STU20240001",
    "firstName": "Rahul",
    "lastName": "Kumar",
    "email": "rahul@example.com",
    "city": "Mumbai",
    "status": "ACTIVE",
    "enrollmentDate": "2024-01-15T00:00:00Z",
    "course": {
      "id": "course-uuid-123",
      "name": "Bachelor of Science",
      "code": "BSC"
    },
    "class": {
      "id": "class-uuid-123",
      "name": "First Year",
      "code": "BSC-FY"
    }
  },
  "timestamp": "2024-01-15T10:45:00Z"
}
```

---

### 2. Search Students
**Advanced student search with filters**

```http
GET /students/search?search=Rahul&city=Mumbai&courseId=course-uuid-123&page=1&limit=10
Authorization: Bearer <token>
```

**Query Parameters:**
- `search`: Student ID, name, or email (partial match)
- `status`: ACTIVE, INACTIVE, GRADUATED, SUSPENDED
- `city`: Filter by city
- `courseId`: Filter by course
- `classId`: Filter by class
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 10, max: 100)

**Response (200):**
```json
{
  "success": true,
  "message": "Students retrieved successfully",
  "data": [
    {
      "id": "student-uuid-123",
      "studentId": "STU20240001",
      "firstName": "Rahul",
      "lastName": "Kumar",
      "email": "rahul@example.com",
      "city": "Mumbai",
      "status": "ACTIVE",
      "course": {
        "id": "course-uuid-123",
        "name": "Bachelor of Science",
        "code": "BSC"
      },
      "class": {
        "id": "class-uuid-123",
        "name": "First Year",
        "code": "BSC-FY"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  },
  "timestamp": "2024-01-15T10:50:00Z"
}
```

---

### 3. Bulk Upload Students
**Upload multiple students from CSV/Excel**

```http
POST /students/bulk-upload
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

file: students.csv
```

**CSV Format:**
```csv
studentId,firstName,lastName,email,phone,courseId,classId,city,state
STU20240001,Rahul,Kumar,rahul@example.com,9876543212,course-uuid-123,class-uuid-123,Mumbai,Maharashtra
STU20240002,Priya,Sharma,priya@example.com,9876543213,course-uuid-123,class-uuid-123,Delhi,Delhi
```

**Response (200):**
```json
{
  "success": true,
  "message": "Bulk upload completed",
  "data": {
    "created": 2,
    "failed": 0,
    "errors": []
  },
  "timestamp": "2024-01-15T11:00:00Z"
}
```

---

## Fee Payments Module (`/fee-payments`)

### 1. Create Fee Payment
**Assign fee payment to student**

```http
POST /fee-payments
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "studentId": "student-uuid-123",
  "feeStructureId": "feestructure-uuid-123",
  "totalAmount": 120000,
  "dueDate": "2024-07-31T00:00:00Z"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Fee payment created successfully",
  "data": {
    "id": "feepayment-uuid-123",
    "totalAmount": 120000,
    "amountPaid": 0,
    "amountPending": 120000,
    "paymentStatus": "PENDING",
    "dueDate": "2024-07-31T00:00:00Z",
    "student": {
      "id": "student-uuid-123",
      "studentId": "STU20240001",
      "firstName": "Rahul"
    },
    "feeStructure": {
      "id": "feestructure-uuid-123",
      "academicYear": "2024-2025"
    }
  },
  "timestamp": "2024-01-15T11:05:00Z"
}
```

---

### 2. Record Payment
**Record a payment transaction for fee**

```http
POST /fee-payments/feepayment-uuid-123/record-payment
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "amount": 50000,
  "paymentMethod": "BANK_TRANSFER",
  "transactionId": "TXN20240115001",
  "notes": "First installment paid"
}
```

**Payment Methods:** CASH, CHEQUE, BANK_TRANSFER, ONLINE, DD

**Response (200):**
```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": {
    "id": "feepayment-uuid-123",
    "totalAmount": 120000,
    "amountPaid": 50000,
    "amountPending": 70000,
    "paymentStatus": "PARTIAL",
    "dueDate": "2024-07-31T00:00:00Z",
    "payments": [
      {
        "amount": 50000,
        "paymentMethod": "BANK_TRANSFER",
        "transactionId": "TXN20240115001",
        "createdAt": "2024-01-15T11:10:00Z"
      }
    ],
    "student": {
      "studentId": "STU20240001",
      "firstName": "Rahul"
    }
  },
  "timestamp": "2024-01-15T11:10:00Z"
}
```

---

### 3. Get Dashboard Statistics
**Fetch fee collection dashboard data**

```http
GET /fee-payments/dashboard/stats?courseId=course-uuid-123
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Dashboard statistics retrieved successfully",
  "data": {
    "overallStats": {
      "totalFees": 5000000,
      "totalCollected": 3500000,
      "totalRecords": 50
    },
    "byStatus": [
      {
        "status": "PAID",
        "totalAmount": 3500000,
        "amountCollected": 3500000
      },
      {
        "status": "PENDING",
        "totalAmount": 1000000,
        "amountCollected": 0
      },
      {
        "status": "PARTIAL",
        "totalAmount": 500000,
        "amountCollected": 250000
      }
    ],
    "byPaymentMethod": [
      {
        "method": "BANK_TRANSFER",
        "count": 25,
        "totalAmount": 2000000
      },
      {
        "method": "CASH",
        "count": 15,
        "totalAmount": 1500000
      }
    ]
  },
  "timestamp": "2024-01-15T11:15:00Z"
}
```

---

### 4. Get Monthly Collection Data
**Trend data for last 12 months**

```http
GET /fee-payments/dashboard/monthly?courseId=course-uuid-123
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Monthly collection data retrieved successfully",
  "data": [
    {
      "month": "2024-01",
      "totalCollected": 450000,
      "transactionCount": 8
    },
    {
      "month": "2024-02",
      "totalCollected": 520000,
      "transactionCount": 12
    }
  ],
  "timestamp": "2024-01-15T11:20:00Z"
}
```

---

## Refunds Module (`/refunds`)

### 1. Create Refund Request
**Request a refund for paid fee**

```http
POST /refunds
Authorization: Bearer <token>
Content-Type: application/json

{
  "studentId": "student-uuid-123",
  "feePaymentId": "feepayment-uuid-123",
  "amount": 25000,
  "reason": "Partial refund for policy change",
  "description": "Student requested partial refund due to course drop"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Refund request created successfully",
  "data": {
    "id": "refund-uuid-123",
    "studentId": "student-uuid-123",
    "amount": 25000,
    "reason": "Partial refund for policy change",
    "status": "PENDING",
    "requestDate": "2024-01-15T11:25:00Z",
    "student": {
      "studentId": "STU20240001",
      "firstName": "Rahul"
    },
    "feePayment": {
      "id": "feepayment-uuid-123",
      "totalAmount": 120000
    }
  },
  "timestamp": "2024-01-15T11:25:00Z"
}
```

---

### 2. Approve Refund
**Approve pending refund request (Admin/Accountant only)**

```http
POST /refunds/refund-uuid-123/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "notes": "Refund approved - student dropped course"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Refund request approved successfully",
  "data": {
    "id": "refund-uuid-123",
    "status": "APPROVED",
    "amount": 25000,
    "approvalDate": "2024-01-15T11:30:00Z"
  },
  "timestamp": "2024-01-15T11:30:00Z"
}
```

---

### 3. Process Refund
**Execute approved refund (Admin only)**

```http
POST /refunds/refund-uuid-123/process
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "refundMethod": "BANK_TRANSFER",
  "bankDetails": {
    "accountHolder": "Rahul Kumar",
    "accountNumber": "123456789012",
    "ifscCode": "SBIN0001234"
  },
  "transactionId": "REFUND20240115001"
}
```

**Refund Methods:** BANK_TRANSFER, CHEQUE, CASH

**Response (200):**
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "id": "refund-uuid-123",
    "status": "PROCESSED",
    "amount": 25000,
    "refundMethod": "BANK_TRANSFER",
    "refundTransactionId": "REFUND20240115001",
    "processedDate": "2024-01-15T11:35:00Z"
  },
  "timestamp": "2024-01-15T11:35:00Z"
}
```

---

## Error Responses

### 400 - Bad Request
```json
{
  "success": false,
  "message": "Validation failed: Email must be a valid email",
  "code": "VALIDATION_ERROR",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "No token provided",
  "code": "AUTHENTICATION_ERROR",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### 403 - Forbidden
```json
{
  "success": false,
  "message": "This action requires one of these roles: ADMIN, ACCOUNTANT",
  "code": "AUTHORIZATION_ERROR",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "message": "Student not found",
  "code": "NOT_FOUND",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### 409 - Conflict
```json
{
  "success": false,
  "message": "Email or phone already registered",
  "code": "CONFLICT",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### 500 - Internal Server Error
```json
{
  "success": false,
  "message": "Internal Server Error",
  "code": "INTERNAL_ERROR",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

---

## Rate Limiting & Pagination

- **Default page size:** 10 records
- **Max page size:** 100 records
- **Sorting:** By creation date (newest first)
- **Filtering:** Supported on most list endpoints

---

**Last Updated:** January 2024
