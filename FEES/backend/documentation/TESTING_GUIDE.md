# Quick Start Testing Guide - PostgreSQL Backend

Step-by-step guide to test all API endpoints with curl commands.

## Prerequisites

✅ Backend running on `http://localhost:5000`
✅ PostgreSQL database initialized
✅ Sample data seeded (admin user, courses, fee structures)

## 1. Health Check

Verify the server is running:

```bash
curl http://localhost:5000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00Z",
  "environment": "development"
}
```

---

## 2. Authentication Tests

### Register New User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "testuser@example.com",
    "phone": "9876543220",
    "password": "TestPass123",
    "role": "ACCOUNTANT"
  }'
```

**Save the accessToken from response for next requests!**

### Login with Admin Credentials

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@feesystem.com",
    "password": "Admin@2024"
  }'
```

Store the returned `accessToken` in a variable:
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Get User Profile

```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

---

## 3. Student Management Tests

### Get Existing Courses

First, let's find a course ID to use for creating students. You can check the database or seed data:

```bash
# The seed script creates these courses:
# - BSC (Bachelor of Science)
# - BCA (Bachelor of Computer Applications)  
# - MBA (Master of Business Administration)

# Get from seed output or use Prisma Studio:
# npm run prisma:studio
```

### Create a Student

```bash
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "TEST001",
    "firstName": "Rajesh",
    "lastName": "Patel",
    "email": "rajesh@example.com",
    "phone": "9876543225",
    "city": "Bangalore",
    "state": "Karnataka",
    "country": "India",
    "courseId": "YOUR_COURSE_UUID",
    "classId": "YOUR_CLASS_UUID"
  }'
```

**⚠️ Replace YOUR_COURSE_UUID and YOUR_CLASS_UUID with actual IDs from seed**

### Search Students

```bash
curl -X GET "http://localhost:5000/api/students/search?search=Rajesh&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Student by ID

```bash
curl -X GET http://localhost:5000/api/students/STUDENT_UUID \
  -H "Authorization: Bearer $TOKEN"
```

### Update Student

```bash
curl -X PUT http://localhost:5000/api/students/STUDENT_UUID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Mumbai",
    "state": "Maharashtra"
  }'
```

---

## 4. Fee Payment Tests

### Create Fee Payment

```bash
curl -X POST http://localhost:5000/api/fee-payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STUDENT_UUID",
    "feeStructureId": "FEE_STRUCTURE_UUID",
    "totalAmount": 120000,
    "dueDate": "2024-07-31T00:00:00Z"
  }'
```

**Save the payment ID for next requests**

### Record Payment Transaction

```bash
curl -X POST http://localhost:5000/api/fee-payments/PAYMENT_UUID/record-payment \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "paymentMethod": "BANK_TRANSFER",
    "transactionId": "TXN20240115001",
    "notes": "First installment - 50%"
  }'
```

### Get Pending Payments

```bash
curl -X GET "http://localhost:5000/api/fee-payments/pending?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Overdue Payments

```bash
curl -X GET "http://localhost:5000/api/fee-payments/overdue?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Dashboard Statistics

```bash
curl -X GET "http://localhost:5000/api/fee-payments/dashboard/stats" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Monthly Collection Data

```bash
curl -X GET "http://localhost:5000/api/fee-payments/dashboard/monthly" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Payment History for Student

```bash
curl -X GET "http://localhost:5000/api/fee-payments/student/STUDENT_UUID/history" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Refund Tests

### Create Refund Request

```bash
curl -X POST http://localhost:5000/api/refunds \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STUDENT_UUID",
    "feePaymentId": "PAYMENT_UUID",
    "amount": 25000,
    "reason": "Course drop - policy refund",
    "description": "Student requested refund after dropping course"
  }'
```

**Save the refund ID**

### List Refund Requests

```bash
curl -X GET "http://localhost:5000/api/refunds?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Approve Refund Request

```bash
curl -X POST http://localhost:5000/api/refunds/REFUND_UUID/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Refund approved - student documentation verified"
  }'
```

### Process Refund

```bash
curl -X POST http://localhost:5000/api/refunds/REFUND_UUID/process \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refundMethod": "BANK_TRANSFER",
    "bankDetails": {
      "accountHolder": "Rajesh Patel",
      "accountNumber": "123456789012",
      "ifscCode": "SBIN0001234"
    },
    "transactionId": "REFUND20240115001"
  }'
```

### Get Refund Statistics

```bash
curl -X GET "http://localhost:5000/api/refunds/stats" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Testing Checklist

- [ ] Health check passes (200)
- [ ] User registration works (201)
- [ ] User login works (200)
- [ ] Profile retrieval works (200)
- [ ] Student creation works (201)
- [ ] Student search works (200)
- [ ] Student update works (200)
- [ ] Fee payment creation works (201)
- [ ] Payment recording works (200)
- [ ] Overdue calculations work (200)
- [ ] Dashboard stats retrieved (200)
- [ ] Monthly data retrieved (200)
- [ ] Refund creation works (201)
- [ ] Refund approval works (200)
- [ ] Refund processing works (200)
- [ ] Proper error messages for invalid input (400)
- [ ] Unauthorized access blocked (401)
- [ ] Role-based access enforced (403)

---

## Using Postman (Alternative to curl)

### Import Collection

1. Open Postman
2. Create new collection "Fee Management API"
3. Add requests for each endpoint
4. Set environment variables:
   - `BASE_URL`: http://localhost:5000/api
   - `TOKEN`: Your access token
   - `STUDENT_UUID`: Your student ID
   - `PAYMENT_UUID`: Your payment ID

### Environment Setup

```json
{
  "BASE_URL": "http://localhost:5000/api",
  "TOKEN": "{{access_token}}",
  "STUDENT_UUID": "{{student_id}}",
  "PAYMENT_UUID": "{{payment_id}}",
  "COURSE_UUID": "{{course_id}}"
}
```

---

## Common Issues & Solutions

### 401 - Token Expired
```
Error: Token has expired
Solution: Login again to get fresh accessToken
```

### 403 - Permission Denied
```
Error: This action requires one of these roles: ADMIN
Solution: Use admin token or admin user
```

### 404 - Resource Not Found
```
Error: Student not found
Solution: Check that the UUID is correct and resource exists
```

### 400 - Validation Error
```
Error: Validation failed: Email must be a valid email
Solution: Check request data format and required fields
```

### 500 - Internal Server Error
```
Error: Internal Server Error
Solution: Check server logs: npm run dev
Check DATABASE_URL in .env
Verify PostgreSQL is running
```

---

## Performance Testing

### Test Response Times

```bash
# Test long request
time curl http://localhost:5000/api/fee-payments/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"

# Expected: < 1 second for normal queries
# Expected: < 3 seconds for aggregation queries
```

### Load Testing (using Apache Bench)

```bash
# Install: brew install httpd (macOS)
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/fee-payments/pending
```

---

## Debugging

### Enable detailed logs
```bash
npm run dev  # Already in debug mode
```

### View database (Prisma Studio)
```bash
npm run prisma:studio
# Opens http://localhost:5555
```

### Check database directly
```bash
psql fee_management -U postgres
\dt  # List all tables
SELECT COUNT(*) FROM students;  # Count students
```

---

**Last Updated:** January 2024
