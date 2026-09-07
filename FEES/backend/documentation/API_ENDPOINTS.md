# API Endpoints Documentation - ERP Fee Management System

## Base URL
```
http://localhost:5000/api
```

## Authentication

All endpoints (except auth endpoints) require a JWT token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

## Endpoints Overview

### 1. Authentication Endpoints

#### Register User
```
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "SecurePass123",
  "role": "accountant",
  "department": "accounts"
}

Response (201):
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "_id": "650d4f9e...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "accountant"
  }
}
```

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}

Response (200):
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiI...",
    "refreshToken": "eyJhbGciOiJIUzI1NiI...",
    "user": {
      "_id": "650d4f9e...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "accountant",
      "department": "accounts"
    }
  }
}
```

#### Refresh Access Token
```
POST /auth/refresh-token
Content-Type: application/json

{
  "userId": "650d4f9e...",
  "refreshToken": "eyJhbGciOiJIUzI1NiI..."
}

Response (200):
{
  "success": true,
  "message": "Access token refreshed",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiI...",
    "user": { ... }
  }
}
```

#### Logout
```
POST /auth/logout
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "650d4f9e...",
  "refreshToken": "eyJhbGciOiJIUzI1NiI..."
}

Response (200):
{
  "success": true,
  "message": "Logout successful"
}
```

---

### 2. Student Endpoints

#### Create Student (Admin/Accountant)
```
POST /students
Content-Type: application/json
Authorization: Bearer <token>

{
  "studentId": "STU001",
  "firstName": "Rahul",
  "lastName": "Kumar",
  "email": "rahul@example.com",
  "phone": "9876543210",
  "dateOfBirth": "2005-01-15",
  "gender": "Male",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001",
    "country": "India"
  },
  "course": "650d4f9e...",
  "class": "650d4f9f...",
  "parentInfo": {
    "parentName": "Mr. Kumar",
    "parentEmail": "parent@example.com",
    "parentPhone": "9999999999",
    "relationship": "Father"
  }
}

Response (201):
{
  "success": true,
  "message": "Student created successfully",
  "data": { ... }
}
```

#### Get Student by ID
```
GET /students/:id
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "message": "Student retrieved successfully",
  "data": { ... }
}
```

#### Search Students
```
GET /students/search?page=1&limit=10&search=Rahul&city=Mumbai&status=active
Authorization: Bearer <token>

Query Parameters:
- page (default: 1)
- limit (default: 10)
- search (firstName/lastName/email/studentId)
- city (address.city filter)
- course (course ID)
- class (class ID)
- status (active/inactive/graduated/dropped)

Response (200):
{
  "success": true,
  "message": "Students retrieved successfully",
  "data": {
    "data": [ ... ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Update Student (Admin/Accountant)
```
PUT /students/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "firstName": "Rahul",
  "lastName": "Singh",
  "email": "newmail@example.com",
  "status": "active"
}

Response (200):
{
  "success": true,
  "message": "Student updated successfully",
  "data": { ... }
}
```

#### Delete Student (Admin only)
```
DELETE /students/:id
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "message": "Student deleted successfully"
}
```

#### Bulk Upload Students (Admin only)
```
POST /students/bulk-upload
Content-Type: application/json
Authorization: Bearer <token>

{
  "students": [
    {
      "studentId": "STU001",
      "firstName": "Student1",
      "lastName": "Last1",
      "course": "650d4f9e...",
      "class": "650d4f9f..."
    }
  ]
}

Response (201):
{
  "success": true,
  "message": "Students uploaded successfully",
  "data": {
    "totalUploaded": 1,
    "students": [ ... ]
  }
}
```

---

### 3. Fee Payment Endpoints

#### Create Fee Payment (Admin/Accountant)
```
POST /fee-payments
Content-Type: application/json
Authorization: Bearer <token>

{
  "student": "650d4f9e...",
  "feeStructure": "650d4fa0...",
  "totalAmount": 50000,
  "dueDate": "2024-12-31"
}

Response (201):
{
  "success": true,
  "message": "Fee payment created successfully",
  "data": {
    "_id": "650d4fa1...",
    "student": { ... },
    "totalAmount": 50000,
    "amountPaid": 0,
    "amountPending": 50000,
    "paymentStatus": "pending",
    "dueDate": "2024-12-31T00:00:00.000Z",
    "payments": [],
    "createdAt": "2024-03-29T..."
  }
}
```

#### Record Payment (Admin/Accountant)
```
POST /fee-payments/:id/record-payment
Content-Type: application/json
Authorization: Bearer <token>

{
  "amount": 10000,
  "paymentMethod": "online",
  "transactionId": "TXN123456",
  "notes": "Installment 1"
}

Response (200):
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": {
    "_id": "650d4fa1...",
    "amountPaid": 10000,
    "amountPending": 40000,
    "paymentStatus": "partial",
    "payments": [
      {
        "amount": 10000,
        "paymentDate": "2024-03-29T...",
        "paymentMethod": "online",
        "transactionId": "TXN123456",
        "receivedBy": "650d4f9e...",
        "notes": "Installment 1"
      }
    ]
  }
}
```

#### Get Pending Payments
```
GET /fee-payments/pending?page=1&limit=10&student=650d4f9e...
Authorization: Bearer <token>

Query Parameters:
- page
- limit
- student (optional)

Response (200):
{
  "success": true,
  "message": "Pending payments retrieved successfully",
  "data": {
    "data": [ ... ],
    "pagination": { ... }
  }
}
```

#### Get Overdue Payments
```
GET /fee-payments/overdue?page=1&limit=10&gracePeriodDays=15
Authorization: Bearer <token>

Query Parameters:
- page
- limit
- gracePeriodDays (default: 0)

Response (200):
{
  "success": true,
  "message": "Overdue payments retrieved successfully",
  "data": {
    "data": [ ... ],
    "pagination": { ... }
  }
}
```

#### Get Dashboard Statistics (Admin/Accountant)
```
GET /fee-payments/dashboard/stats
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "message": "Dashboard stats retrieved successfully",
  "data": {
    "statsByStatus": [
      {
        "_id": "pending",
        "count": 45,
        "totalAmount": 500000,
        "totalCollected": 0
      },
      {
        "_id": "paid",
        "count": 30,
        "totalAmount": 300000,
        "totalCollected": 300000
      }
    ],
    "totalCollected": 300000,
    "paymentByMethod": [
      {
        "_id": "online",
        "count": 25,
        "total": 250000
      }
    ]
  }
}
```

#### Get Monthly Collection Data (Admin/Accountant)
```
GET /fee-payments/dashboard/monthly?year=2024
Authorization: Bearer <token>

Query Parameters:
- year (default: current year)

Response (200):
{
  "success": true,
  "message": "Monthly collection data retrieved successfully",
  "data": [
    {
      "_id": 1,
      "total": 50000,
      "count": 8
    },
    {
      "_id": 2,
      "total": 75000,
      "count": 12
    }
  ]
}
```

---

### 4. Refund Endpoints

#### Create Refund Request
```
POST /refunds
Content-Type: application/json
Authorization: Bearer <token>

{
  "feePayment": "650d4fa1...",
  "amount": 5000,
  "reason": "overpayment",
  "description": "Paid extra amount",
  "refundMethod": "bank_transfer",
  "bankDetails": {
    "accountHolder": "Rahul Kumar",
    "accountNumber": "1234567890",
    "ifscCode": "SBIN0001234"
  }
}

Response (201):
{
  "success": true,
  "message": "Refund request created successfully",
  "data": {
    "_id": "650d4fa2...",
    "student": "650d4f9e...",
    "feePayment": "650d4fa1...",
    "amount": 5000,
    "reason": "overpayment",
    "status": "pending",
    "requestDate": "2024-03-29T..."
  }
}
```

#### Get Refund Requests
```
GET /refunds?page=1&limit=10&status=pending&student=650d4f9e...
Authorization: Bearer <token>

Query Parameters:
- page
- limit
- status (pending/approved/rejected/processed)
- student (optional)

Response (200):
{
  "success": true,
  "message": "Refund requests retrieved successfully",
  "data": {
    "data": [ ... ],
    "pagination": { ... }
  }
}
```

#### Approve Refund Request (Admin/Accountant)
```
POST /refunds/:id/approve
Content-Type: application/json
Authorization: Bearer <token>

{
  "notes": "Approved for overpayment"
}

Response (200):
{
  "success": true,
  "message": "Refund request approved successfully",
  "data": {
    "_id": "650d4fa2...",
    "status": "approved",
    "approvalDate": "2024-03-29T..."
  }
}
```

#### Reject Refund Request (Admin/Accountant)
```
POST /refunds/:id/reject
Content-Type: application/json
Authorization: Bearer <token>

{
  "rejectionReason": "Refund policy does not allow this"
}

Response (200):
{
  "success": true,
  "message": "Refund request rejected successfully",
  "data": {
    "_id": "650d4fa2...",
    "status": "rejected",
    "rejectionReason": "Refund policy does not allow this"
  }
}
```

#### Process Refund (Admin)
```
POST /refunds/:id/process
Content-Type: application/json
Authorization: Bearer <token>

{
  "transactionId": "REF123456789"
}

Response (200):
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "_id": "650d4fa2...",
    "status": "processed",
    "refundTransactionId": "REF123456789",
    "processedDate": "2024-03-29T..."
  }
}
```

#### Get Refund Statistics (Admin/Accountant)
```
GET /refunds/stats
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "message": "Refund statistics retrieved successfully",
  "data": [
    {
      "_id": "pending",
      "count": 10,
      "totalAmount": 50000
    },
    {
      "_id": "approved",
      "count": 5,
      "totalAmount": 25000
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation Error",
  "errors": [
    {
      "field": "email",
      "message": "email is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You do not have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Student not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal Server Error"
}
```

---

## Role-Based Access Control

| Endpoint | Admin | Accountant | Staff |
|----------|:-----:|:----------:|:-----:|
| POST /students | ✓ | ✓ | ✗ |
| PUT /students/:id | ✓ | ✓ | ✗ |
| DELETE /students/:id | ✓ | ✗ | ✗ |
| POST /fee-payments | ✓ | ✓ | ✗ |
| POST /fee-payments/:id/record-payment | ✓ | ✓ | ✗ |
| POST /refunds/:id/approve | ✓ | ✓ | ✗ |
| POST /refunds/:id/process | ✓ | ✗ | ✗ |

---

## Pagination

All list endpoints support pagination:

```
GET /endpoint?page=1&limit=10
```

Response includes:
```json
{
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## Rate Limiting

API is rate limited to prevent abuse:
- Window: 15 minutes
- Max Requests: 100 per window

Exceeded requests return 429 Too Many Requests.
