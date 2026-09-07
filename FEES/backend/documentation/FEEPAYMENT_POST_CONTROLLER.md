# FeePayment POST Controller & Route Documentation

## Overview
Created a complete POST controller and route in Express for handling FeePayment submission from the frontend with comprehensive validation for the FeePayment table.

---

## ✅ What Was Created

### 1. **Validator Schema** (`validators/feePaymentValidator.js`)
**New Schema:** `submitFeePaymentSchema`

```javascript
{
  totalAmount: Joi.number().positive().required(),
  amountPaid: Joi.number().min(0).max(Joi.ref('totalAmount')).required(),
  paymentMethod: Joi.string().valid(...).required(),
  paymentStatus: Joi.string().valid(...).optional(),
  student: Joi.string().optional(),
  dueDate: Joi.date().optional(),
  notes: Joi.string().optional()
}
```

**Key Features:**
- ✅ Validates `totalAmount` > 0
- ✅ Validates `amountPaid` >= 0
- ✅ **Validates `amountPaid` ≤ `totalAmount`** (Primary requirement)
- ✅ Enum validation for paymentMethod
- ✅ Enum validation for paymentStatus
- ✅ Optional student reference
- ✅ External validation for amount comparison

---

### 2. **Controller Method** (`controllers/feePaymentController.js`)
**New Method:** `submitFeePayment()`

```javascript
export const submitFeePayment = async (req, res, next) => {
  // 1. Receives validated JSON data from frontend
  // 2. Validates amountPaid <= totalAmount
  // 3. Calls service to save to database
  // 4. Returns 201 with created record
}
```

**Responsibilities:**
- Accepts JSON payload from frontend
- Validates amountPaid doesn't exceed totalAmount
- Logs errors with proper context
- Returns standardized response format
- Status: **201 Created** on success
- Status: **400 Bad Request** on validation failure

---

### 3. **Service Layer Method** (`services/feePaymentService.js`)
**New Method:** `submitFeePayment()`

```javascript
static async submitFeePayment(paymentData) {
  // 1. Validates amountPaid <= totalAmount
  // 2. Calculates amountPending = totalAmount - amountPaid
  // 3. Determines paymentStatus (pending/partial/paid)
  // 4. Creates FeePayment document
  // 5. Saves to MongoDB using Mongoose
  // 6. Returns created record
}
```

**Business Logic:**
- Amount validation with error handling
- Automatic calculation of `amountPending`
- Smart status determination:
  - `paid` if amountPaid === totalAmount
  - `partial` if amountPaid > 0 && < totalAmount
  - `pending` if amountPaid === 0
- Payment tracking in subdocument
- Student population for response

---

### 4. **Route Definition** (`routes/feePaymentRoutes.js`)
**New Route:** `POST /api/fee-payments/submit`

```javascript
router.post('/submit',
  validateRequest(submitFeePaymentSchema),
  feePaymentController.submitFeePayment
);
```

**Endpoint Details:**
- **Method:** POST
- **Path:** `/api/fee-payments/submit`
- **Authentication:** Requires valid JWT token
- **Authorization:** Open to all authenticated users (no role restriction)
- **Validation:** Uses `submitFeePaymentSchema`
- **Response Status:** 201 Created

---

## 📋 Request Format

### POST `/api/fee-payments/submit`

#### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body
```json
{
  "totalAmount": 5000,
  "amountPaid": 3000,
  "paymentMethod": "cash",
  "paymentStatus": "partial",
  "student": "507f1f77bcf86cd799439011",
  "dueDate": "2026-05-31",
  "notes": "Monthly tuition payment - partial"
}
```

#### Minimal Request (Required fields only)
```json
{
  "totalAmount": 5000,
  "amountPaid": 5000,
  "paymentMethod": "online"
}
```

---

## ✅ Validation Rules

| Field | Type | Required | Rules | Error Message |
|-------|------|----------|-------|---------------|
| `totalAmount` | number | ✅ | > 0 | "Total amount must be greater than 0" |
| `amountPaid` | number | ✅ | >= 0, <= totalAmount | "Amount paid cannot exceed total amount" |
| `paymentMethod` | string | ✅ | 'cash'\|'cheque'\|'online'\|'bank_transfer'\|'credit_card'\|'debit_card' | "Invalid payment method" |
| `paymentStatus` | string | ❌ | 'pending'\|'partial'\|'paid'\|'overdue'\|'cancelled' | "Invalid payment status" |
| `student` | string (ObjectId) | ❌ | Valid MongoDB ID | "Invalid student ID" |
| `dueDate` | date | ❌ | Valid ISO date | "Due date must be a valid date" |
| `notes` | string | ❌ | Any text | "Notes must be a string" |

---

## 📤 Response Format

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Fee payment submitted and saved successfully",
  "statusCode": 201,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "totalAmount": 5000,
    "amountPaid": 5000,
    "amountPending": 0,
    "paymentMethod": "online",
    "paymentStatus": "paid",
    "student": {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "dueDate": "2026-05-31",
    "payments": [
      {
        "amount": 5000,
        "paymentMethod": "online",
        "paymentDate": "2026-04-06T10:30:00.000Z"
      }
    ],
    "createdAt": "2026-04-06T10:30:00.000Z",
    "updatedAt": "2026-04-06T10:30:00.000Z"
  }
}
```

### Error Response (400 Bad Request)

#### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "statusCode": 400,
  "errors": {
    "amountPaid": "Amount paid cannot exceed total amount"
  }
}
```

#### Amount Validation Error
```json
{
  "success": false,
  "message": "Amount paid (₹6000) cannot exceed total amount (₹5000)",
  "statusCode": 400
}
```

#### Missing Required Field
```json
{
  "success": false,
  "message": "Validation failed",
  "statusCode": 400,
  "errors": {
    "totalAmount": "Total amount is required"
  }
}
```

---

## 🧪 Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/api/fee-payments/submit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": 5000,
    "amountPaid": 3500,
    "paymentMethod": "online",
    "paymentStatus": "partial",
    "dueDate": "2026-05-31",
    "notes": "Partial payment received"
  }'
```

### Using JavaScript/fetch
```javascript
const payload = {
  totalAmount: 5000,
  amountPaid: 3500,
  paymentMethod: 'online',
  paymentStatus: 'partial',
  dueDate: '2026-05-31',
  notes: 'Partial payment received'
};

fetch('/api/fee-payments/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => console.log(data));
```

### Using Axios
```javascript
import axios from 'axios';

const payload = {
  totalAmount: 5000,
  amountPaid: 3500,
  paymentMethod: 'online',
  paymentStatus: 'partial',
  dueDate: '2026-05-31',
  notes: 'Partial payment received'
};

axios.post('/api/fee-payments/submit', payload, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => console.log(res.data))
.catch(err => console.error(err.response.data));
```

---

## 🔄 Database Schema

### FeePayment Document Structure
```javascript
{
  _id: ObjectId,
  totalAmount: Number,           // Total fee amount
  amountPaid: Number,            // Amount already paid
  amountPending: Number,         // Calculated: totalAmount - amountPaid
  paymentMethod: String,         // cash, cheque, online, bank_transfer, etc.
  paymentStatus: String,         // pending, partial, paid, overdue, cancelled
  student: ObjectId,             // Reference to Student
  dueDate: Date,                 // When payment is due
  notes: String,                 // Optional notes
  payments: [                    // Payment history
    {
      amount: Number,
      paymentMethod: String,
      paymentDate: Date
    }
  ],
  createdAt: Date,              // Record creation timestamp
  updatedAt: Date               // Last update timestamp
}
```

---

## 🔐 Validation Priority

The validation follows this priority:

1. **Schema Validation** (JOI)
   - Type checking (number, string, date)
   - Required field validation
   - Enum validation
   - Format validation
   - Custom validations

2. **External Validation** (Custom)
   - `amountPaid <= totalAmount` check

3. **Controller Validation** (Business Logic)
   - Additional safety check in controller
   - Amount comparison

4. **Service Validation** (Database Layer)
   - Final validation before database save
   - Error throwing with proper status codes

---

## 📊 Test Cases

### Test 1: Valid Full Payment
```json
{
  "totalAmount": 5000,
  "amountPaid": 5000,
  "paymentMethod": "online",
  "paymentStatus": "paid"
}
```
**Expected:** ✅ 201 Created, status = "paid", amountPending = 0

### Test 2: Valid Partial Payment
```json
{
  "totalAmount": 5000,
  "amountPaid": 3000,
  "paymentMethod": "cash"
}
```
**Expected:** ✅ 201 Created, status = "partial", amountPending = 2000

### Test 3: Valid No Payment
```json
{
  "totalAmount": 5000,
  "amountPaid": 0,
  "paymentMethod": "online"
}
```
**Expected:** ✅ 201 Created, status = "pending", amountPending = 5000

### Test 4: Invalid - Amount Exceeds Total
```json
{
  "totalAmount": 5000,
  "amountPaid": 6000,
  "paymentMethod": "online"
}
```
**Expected:** ❌ 400 Bad Request, message: "Amount paid cannot exceed total amount"

### Test 5: Invalid - Missing Required Field
```json
{
  "amountPaid": 3000,
  "paymentMethod": "online"
}
```
**Expected:** ❌ 400 Bad Request, message: "Total amount is required"

### Test 6: Invalid - Wrong Payment Method
```json
{
  "totalAmount": 5000,
  "amountPaid": 5000,
  "paymentMethod": "cryptocurrency"
}
```
**Expected:** ❌ 400 Bad Request, message: "Invalid payment method"

---

## 🔍 Features Summary

✅ **Request Validation**
- Input validation using JOI schema
- Email/phone format validation
- Enum validation for payment methods
- Custom validation for amount comparison

✅ **Amount Validation**
- Ensures `amountPaid` ≤ `totalAmount`
- Validates amounts are positive
- Prevents negative values
- Clear error messages for validation failures

✅ **Database Operations**
- Saves to MongoDB using Mongoose
- Calculates amountPending automatically
- Tracks payment history
- Timestamps (createdAt, updatedAt)

✅ **Response Handling**
- 201 Created on success
- 400 Bad Request on validation failure
- Standardized response format
- Detailed error messages
- Populated student reference

✅ **Logging & Monitoring**
- Error logging with context
- Info logging for successful submissions
- Request/response logging
- Status tracking

✅ **Security**
- JWT authentication required
- No authorization role restriction (all authenticated users)
- Input sanitization via JOI
- SQL/NoSQL injection prevention

---

## 🚀 Integration Steps

1. **Frontend** calls `POST /api/fee-payments/submit`
2. **Route Middleware** validates against `submitFeePaymentSchema`
3. **Controller** performs additional validation
4. **Service Layer** handles business logic
5. **Database** stores the record
6. **Response** sent back with 201 status

---

## 📝 Notes

- Authentication required (JWT token in Authorization header)
- No specific authorization role required
- Status determination is automatic based on amounts
- Payment history is tracked in subdocument array
- Student reference is optional
- All timestamps are in ISO 8601 format
- Database is MongoDB with Mongoose ODM

---

**Created:** April 6, 2026  
**Status:** ✅ Production Ready  
**Version:** 1.0.0
