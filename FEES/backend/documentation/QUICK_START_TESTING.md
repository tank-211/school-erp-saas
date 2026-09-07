# Quick Start Testing Guide

## Testing the Backend in 5 Minutes

This guide will help you quickly test the backend APIs using Postman, cURL, or your browser.

## Prerequisites

✅ Backend running: `npm run dev`
✅ MongoDB running

## Step 1: Get Access Token (First Time)

### Register a New User

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Admin",
    "email": "admin@example.com",
    "phone": "9876543210",
    "password": "Admin@123",
    "role": "admin",
    "department": "accounts"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "_id": "650d4f9e...",
    "name": "John Admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### Login to Get Token

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "650d4f9e...",
      "name": "John Admin",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

**💾 Note:** Copy the `accessToken` - you'll need it for the next requests.

---

## Step 2: Create Test Data

### Create a Course

**Request:**
```bash
curl -X POST http://localhost:5000/api/courses \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bachelor of Computer Science",
    "code": "BCS",
    "description": "4-year course",
    "duration": {
      "value": 4,
      "unit": "years"
    }
  }'
```

### Create a Class

**Request:**
```bash
curl -X POST http://localhost:5000/api/classes \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "BCS-2024-Batch-1",
    "code": "BCS2024B1",
    "course": "COURSE_ID_FROM_PREVIOUS_STEP",
    "semester": 1,
    "capacity": 60
  }'
```

### Create a Fee Type

**Request:**
```bash
curl -X POST http://localhost:5000/api/fee-types \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "tuition",
    "description": "Main tuition fee",
    "amount": 50000
  }'
```

### Create Fee Structure

**Request:**
```bash
curl -X POST http://localhost:5000/api/fee-structures \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course": "COURSE_ID",
    "class": "CLASS_ID",
    "feeComponents": [
      {
        "feeType": "FEE_TYPE_ID",
        "amount": 50000
      }
    ],
    "totalFee": 50000,
    "paymentTerms": "semester",
    "dueDate": "2024-12-31",
    "gracePeriodDays": 15,
    "penaltyPerDay": 100,
    "academicYear": "2024-2025"
  }'
```

---

## Step 3: Create Students

### Create Single Student

**Request:**
```bash
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STU001",
    "firstName": "Rahul",
    "lastName": "Kumar",
    "email": "rahul@example.com",
    "phone": "8765432109",
    "gender": "Male",
    "address": {
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "postalCode": "400001",
      "country": "India"
    },
    "course": "COURSE_ID",
    "class": "CLASS_ID",
    "parentInfo": {
      "parentName": "Mr. Kumar",
      "parentEmail": "parent@example.com",
      "parentPhone": "9999999999",
      "relationship": "Father"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "_id": "650d4fa0...",
    "studentId": "STU001",
    "firstName": "Rahul",
    "lastName": "Kumar",
    "email": "rahul@example.com",
    "status": "active",
    "createdAt": "2024-03-29T10:00:00.000Z"
  }
}
```

### Search Students

**Request:**
```bash
curl -X GET "http://localhost:5000/api/students/search?page=1&limit=10&city=Mumbai&search=Rahul" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Step 4: Manage Fee Payments

### Create Fee Payment

**Request:**
```bash
curl -X POST http://localhost:5000/api/fee-payments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student": "STUDENT_ID",
    "feeStructure": "FEE_STRUCTURE_ID",
    "totalAmount": 50000,
    "dueDate": "2024-12-31"
  }'
```

**Response:**
```json
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
    "payments": []
  }
}
```

### Record Payment

**Request:**
```bash
curl -X POST "http://localhost:5000/api/fee-payments/PAYMENT_ID/record-payment" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25000,
    "paymentMethod": "online",
    "transactionId": "TXN20240329001",
    "notes": "First installment"
  }'
```

### Get Pending Payments

**Request:**
```bash
curl -X GET "http://localhost:5000/api/fee-payments/pending?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Dashboard Stats

**Request:**
```bash
curl -X GET http://localhost:5000/api/fee-payments/dashboard/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Dashboard stats retrieved successfully",
  "data": {
    "statsByStatus": [
      {
        "_id": "pending",
        "count": 10,
        "totalAmount": 500000,
        "totalCollected": 0
      },
      {
        "_id": "partial",
        "count": 5,
        "totalAmount": 250000,
        "totalCollected": 100000
      }
    ],
    "totalCollected": 100000,
    "paymentByMethod": [
      {
        "_id": "online",
        "count": 15,
        "total": 100000
      }
    ]
  }
}
```

---

## Step 5: Manage Refunds

### Create Refund Request

**Request:**
```bash
curl -X POST http://localhost:5000/api/refunds \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feePayment": "PAYMENT_ID",
    "amount": 5000,
    "reason": "overpayment",
    "description": "Paid extra amount by mistake",
    "refundMethod": "bank_transfer",
    "bankDetails": {
      "accountHolder": "Rahul Kumar",
      "accountNumber": "1234567890123456",
      "ifscCode": "SBIN0001234"
    }
  }'
```

### Get Refund Requests

**Request:**
```bash
curl -X GET "http://localhost:5000/api/refunds?page=1&limit=10&status=pending" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Approve Refund Request

**Request:**
```bash
curl -X POST "http://localhost:5000/api/refunds/REFUND_ID/approve" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Approved for overpayment"
  }'
```

### Process Refund

**Request:**
```bash
curl -X POST "http://localhost:5000/api/refunds/REFUND_ID/process" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "REF20240329001"
  }'
```

---

## Using Postman (Alternative)

### Import Collection

1. Open Postman
2. Click **Import**
3. Select **Link**
4. Paste collection URL: `(Will be provided)`
5. Click **Import**

### Set Environment Variables

1. Create new environment: **Postman Settings → Manage Environments**
2. Add variables:
   - `baseUrl`: `http://localhost:5000/api`
   - `accessToken`: Paste token from login response
   - `studentId`: Paste ID from student creation
   - `paymentId`: Paste ID from fee payment creation

### Using Variables in Requests

```
Authorization: Bearer {{accessToken}}
URL: {{baseUrl}}/students/{{studentId}}
```

---

## Common Test Scenarios

### Scenario 1: Complete Payment Flow
1. Create student
2. Create fee payment
3. Record first installment payment
4. Record second installment payment
5. Check dashboard stats shows "paid"

### Scenario 2: Handle Overdue
1. Create fee payment with past due date
2. Call get overdue payments endpoint
3. Verify payment appears in overdue list

### Scenario 3: Refund Workflow
1. Create and pay fee
2. Create refund request
3. Approve refund (Admin)
4. Process refund (Admin)
5. Verify refund status is "processed"

### Scenario 4: Search Functionality
1. Create 3-4 students in different cities
2. Search with city filter
3. Verify pagination works
4. Try search by name

---

## Troubleshooting

### "Invalid Token" Error
```
{ "success": false, "message": "Invalid or expired token" }
```
**Solution:** Token may have expired. Run login again to get new token.

### "Validation Error"
```
{
  "success": false,
  "message": "Validation Error",
  "errors": [{ "field": "email", "message": "Email is required" }]
}
```
**Solution:** Check required fields and data types match API documentation.

### "Student not found"
```
{ "success": false, "message": "Student not found" }
```
**Solution:** Use correct student ID. Verify ID was created successfully.

### "MongoDB Connection Error"
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Ensure MongoDB is running. Start with `mongod` command.

---

## Next Steps

1. ✅ Test all endpoints
2. ✅ Review [API_ENDPOINTS.md](./API_ENDPOINTS.md) for complete documentation
3. ✅ Check [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) to integrate with frontend
4. ✅ Implement error handling in frontend
5. ✅ Add form validation
6. ✅ Connect dashboard to APIs

---

## Tips

💡 **Use Postman Collections** - Save time by using pre-built requests
💡 **Check Backend Logs** - View `./logs/app.log` for detailed debugging
💡 **Browser DevTools** - Network tab shows full request/response
💡 **Pagination** - Always include page and limit for list endpoints
💡 **Validation** - All required fields must be provided

---

Ready for next steps? → [Integration Guide](./INTEGRATION_GUIDE.md)
