# Financial Dashboard - Database Setup & Testing Guide

## PostgreSQL Database Setup

### 1. Create the Tables (if not already created via Prisma migrations)

```sql
-- Create User table
CREATE TABLE "User" (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  "firstName" VARCHAR(100),
  "lastName" VARCHAR(100),
  role VARCHAR(50) DEFAULT 'STAFF',
  "departmentName" VARCHAR(100),
  "isActive" BOOLEAN DEFAULT true,
  "lastLogin" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Student table
CREATE TABLE "Student" (
  id VARCHAR(255) PRIMARY KEY,
  "studentId" VARCHAR(50) UNIQUE NOT NULL,
  "firstName" VARCHAR(100) NOT NULL,
  "lastName" VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  "dateOfBirth" TIMESTAMP,
  gender VARCHAR(20),
  street VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  "postalCode" VARCHAR(20),
  country VARCHAR(100),
  "courseId" VARCHAR(255),
  "classId" VARCHAR(255),
  "enrollmentDate" TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  "isVerified" BOOLEAN DEFAULT false,
  "parentId" VARCHAR(255),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Course table
CREATE TABLE "Course" (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  "durationValue" INTEGER,
  "durationUnit" VARCHAR(50),
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Class table
CREATE TABLE "Class" (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  "courseId" VARCHAR(255) NOT NULL,
  semester INTEGER,
  capacity INTEGER,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("courseId") REFERENCES "Course"(id) ON DELETE CASCADE,
  UNIQUE("code", "courseId")
);

-- Create FeeStructure table
CREATE TABLE "FeeStructure" (
  id VARCHAR(255) PRIMARY KEY,
  "courseId" VARCHAR(255) NOT NULL,
  "classId" VARCHAR(255) NOT NULL,
  "academicYear" VARCHAR(20) NOT NULL,
  "totalFee" DECIMAL(10, 2) NOT NULL,
  "paymentTerms" VARCHAR(50),
  "dueDate" TIMESTAMP,
  "gracePeriodDays" INTEGER DEFAULT 15,
  "penaltyPerDay" DECIMAL(5, 2),
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("courseId") REFERENCES "Course"(id) ON DELETE CASCADE,
  FOREIGN KEY ("classId") REFERENCES "Class"(id) ON DELETE CASCADE,
  UNIQUE("courseId", "classId", "academicYear")
);

-- Create FeePayment table
CREATE TABLE "FeePayment" (
  id VARCHAR(255) PRIMARY KEY,
  "studentId" VARCHAR(255) NOT NULL,
  "feeStructureId" VARCHAR(255) NOT NULL,
  "totalAmount" DECIMAL(10, 2) NOT NULL,
  "amountPaid" DECIMAL(10, 2) DEFAULT 0,
  "amountPending" DECIMAL(10, 2),
  "dueDate" TIMESTAMP NOT NULL,
  "paymentStatus" VARCHAR(50) DEFAULT 'PENDING',
  "penaltyCharges" DECIMAL(10, 2) DEFAULT 0,
  "discountAmount" DECIMAL(10, 2) DEFAULT 0,
  "discountReason" VARCHAR(255),
  "approvedBy" VARCHAR(255),
  notes TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON DELETE CASCADE,
  FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"(id) ON DELETE CASCADE
);

-- Create Payment table (this is the transactions table)
CREATE TABLE "Payment" (
  id VARCHAR(255) PRIMARY KEY,
  "feePaymentId" VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  "paymentMethod" VARCHAR(50) NOT NULL,
  "transactionId" VARCHAR(255),
  "receivedBy" VARCHAR(255),
  notes TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("feePaymentId") REFERENCES "FeePayment"(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_payment_createdAt ON "Payment"("createdAt");
CREATE INDEX idx_payment_paymentMethod ON "Payment"("paymentMethod");
CREATE INDEX idx_payment_feePaymentId ON "Payment"("feePaymentId");
CREATE INDEX idx_feePayment_studentId ON "FeePayment"("studentId");
CREATE INDEX idx_feePayment_paymentStatus ON "FeePayment"("paymentStatus");
CREATE INDEX idx_student_firstName ON "Student"("firstName");
CREATE INDEX idx_class_name ON "Class"(name);
CREATE INDEX idx_course_code ON "Course"(code);
```

### 2. Insert Sample Data

```sql
-- Insert Sample Courses
INSERT INTO "Course" (id, name, code, description) VALUES
('c1', 'Bachelor of Science in Information Technology', 'BSIT', 'IT Program'),
('c2', 'Bachelor of Science in Business Administration', 'BSBA', 'Business Program'),
('c3', 'Bachelor of Science in Civil Engineering', 'BSCE', 'Engineering Program');

-- Insert Sample Classes
INSERT INTO "Class" (id, name, code, "courseId", semester, capacity) VALUES
('cls1', 'Class 1-A', 'BSIT-1A', 'c1', 1, 50),
('cls2', 'Class 1-B', 'BSIT-1B', 'c1', 1, 50),
('cls3', 'Class 2-A', 'BSBA-2A', 'c2', 2, 45),
('cls4', 'Class 3-A', 'BSCE-3A', 'c3', 3, 40);

-- Insert Sample Students
INSERT INTO "Student" (id, "studentId", "firstName", "lastName", email, phone, "courseId", "classId", "enrollmentDate", status) VALUES
('s1', 'STU001', 'John', 'Doe', 'john.doe@email.com', '9876543210', 'c1', 'cls1', '2024-01-15', 'ACTIVE'),
('s2', 'STU002', 'Jane', 'Smith', 'jane.smith@email.com', '9876543211', 'c1', 'cls1', '2024-01-15', 'ACTIVE'),
('s3', 'STU003', 'Robert', 'Johnson', 'robert.j@email.com', '9876543212', 'c1', 'cls2', '2024-01-15', 'ACTIVE'),
('s4', 'STU004', 'Maria', 'Garcia', 'maria.garcia@email.com', '9876543213', 'c2', 'cls3', '2024-01-10', 'ACTIVE'),
('s5', 'STU005', 'David', 'Wilson', 'david.w@email.com', '9876543214', 'c3', 'cls4', '2023-09-01', 'ACTIVE'),
('s6', 'STU006', 'Emma', 'Brown', 'emma.brown@email.com', '9876543215', 'c1', 'cls2', '2024-01-15', 'ACTIVE'),
('s7', 'STU007', 'Michael', 'Davis', 'michael.d@email.com', '9876543216', 'c2', 'cls3', '2024-01-10', 'ACTIVE'),
('s8', 'STU008', 'Sarah', 'Martinez', 'sarah.m@email.com', '9876543217', 'c3', 'cls4', '2023-09-01', 'ACTIVE');

-- Insert Sample Fee Structures
INSERT INTO "FeeStructure" (id, "courseId", "classId", "academicYear", "totalFee", "paymentTerms", "dueDate", "gracePeriodDays") VALUES
('fs1', 'c1', 'cls1', '2024-2025', 100000.00, 'Semester', '2024-01-31', 15),
('fs2', 'c1', 'cls2', '2024-2025', 100000.00, 'Semester', '2024-01-31', 15),
('fs3', 'c2', 'cls3', '2024-2025', 120000.00, 'Semester', '2024-01-31', 15),
('fs4', 'c3', 'cls4', '2024-2025', 150000.00, 'Semester', '2024-01-31', 15);

-- Insert Sample Fee Payments
INSERT INTO "FeePayment" (id, "studentId", "feeStructureId", "totalAmount", "amountPaid", "amountPending", "dueDate", "paymentStatus") VALUES
('fp1', 's1', 'fs1', 100000.00, 100000.00, 0, '2024-01-31', 'PAID'),
('fp2', 's2', 'fs1', 100000.00, 50000.00, 50000.00, '2024-01-31', 'PARTIAL'),
('fp3', 's3', 'fs1', 100000.00, 0, 100000.00, '2024-01-31', 'PENDING'),
('fp4', 's4', 'fs3', 120000.00, 120000.00, 0, '2024-01-31', 'PAID'),
('fp5', 's5', 'fs4', 150000.00, 75000.00, 75000.00, '2024-01-31', 'PARTIAL'),
('fp6', 's6', 'fs1', 100000.00, 100000.00, 0, '2024-01-31', 'PAID'),
('fp7', 's7', 'fs3', 120000.00, 120000.00, 0, '2024-01-31', 'PAID'),
('fp8', 's8', 'fs4', 150000.00, 150000.00, 0, '2024-01-31', 'PAID');

-- Insert Sample Payment Transactions (this will populate the dashboard)
-- January 2024 transactions
INSERT INTO "Payment" (id, "feePaymentId", amount, "paymentMethod", "transactionId", notes, "createdAt") VALUES
('p1', 'fp1', 50000.00, 'BANK_TRANSFER', 'TXN20240115001', 'First installment', '2024-01-15 10:30:00'),
('p2', 'fp4', 60000.00, 'ONLINE', 'TXN20240116001', 'Online payment', '2024-01-16 14:15:00'),
('p3', 'fp6', 100000.00, 'CASH', NULL, 'Full payment in cash', '2024-01-18 09:45:00'),
('p4', 'fp7', 120000.00, 'BANK_TRANSFER', 'TXN20240118001', 'Bank transfer payment', '2024-01-18 11:20:00'),
('p5', 'fp1', 50000.00, 'CHEQUE', 'CHQ20240120001', 'Second installment via cheque', '2024-01-20 15:30:00'),
('p6', 'fp5', 75000.00, 'ONLINE', 'TXN20240122001', 'First installment online', '2024-01-22 10:00:00'),
('p7', 'fp8', 150000.00, 'DD', 'DD20240125001', 'Full payment via DD', '2024-01-25 13:45:00'),

-- February 2024 transactions
('p8', 'fp2', 50000.00, 'BANK_TRANSFER', 'TXN20240205001', 'Payment', '2024-02-05 09:30:00'),
('p9', 'fp4', 60000.00, 'ONLINE', 'TXN20240210001', 'Payment', '2024-02-10 14:00:00'),
('p10', 'fp1', 0, 'CASH', NULL, 'Payment', '2024-02-12 10:15:00'),

-- March 2024 transactions
('p11', 'fp5', 75000.00, 'BANK_TRANSFER', 'TXN20240301001', 'Payment', '2024-03-01 11:00:00'),
('p12', 'fp2', 50000.00, 'ONLINE', 'TXN20240305001', 'Payment', '2024-03-05 15:30:00'),
('p13', 'fp6', 100000.00, 'CASH', NULL, 'Payment', '2024-03-08 09:00:00'),
('p14', 'fp1', 50000.00, 'BANK_TRANSFER', 'TXN20240310001', 'Payment', '2024-03-10 13:45:00'),
('p15', 'fp7', 120000.00, 'ONLINE', 'TXN20240315001', 'Payment', '2024-03-15 10:30:00'),

-- April 2024 transactions
('p16', 'fp4', 60000.00, 'BANK_TRANSFER', 'TXN20240402001', 'Payment', '2024-04-02 14:20:00'),
('p17', 'fp8', 150000.00, 'CASH', NULL, 'Payment', '2024-04-05 11:00:00'),
('p18', 'fp5', 75000.00, 'ONLINE', 'TXN20240410001', 'Payment', '2024-04-10 09:45:00'),

-- May 2024 transactions
('p19', 'fp1', 50000.00, 'BANK_TRANSFER', 'TXN20240503001', 'Payment', '2024-05-03 10:30:00'),
('p20', 'fp2', 50000.00, 'ONLINE', 'TXN20240507001', 'Payment', '2024-05-07 15:15:00'),
('p21', 'fp6', 100000.00, 'BANK_TRANSFER', 'TXN20240510001', 'Payment', '2024-05-10 12:00:00'),

-- June 2024 transactions
('p22', 'fp7', 120000.00, 'ONLINE', 'TXN20240605001', 'Payment', '2024-06-05 14:45:00'),
('p23', 'fp4', 60000.00, 'BANK_TRANSFER', 'TXN20240610001', 'Payment', '2024-06-10 09:30:00'),

-- July 2024 transactions
('p24', 'fp5', 75000.00, 'CASH', NULL, 'Payment', '2024-07-01 11:00:00'),
('p25', 'fp8', 150000.00, 'ONLINE', 'TXN20240705001', 'Payment', '2024-07-05 10:15:00'),

-- August 2024 transactions
('p26', 'fp1', 50000.00, 'BANK_TRANSFER', 'TXN20240810001', 'Payment', '2024-08-10 13:30:00'),
('p27', 'fp2', 50000.00, 'ONLINE', 'TXN20240815001', 'Payment', '2024-08-15 14:00:00'),

-- September 2024 transactions
('p28', 'fp6', 100000.00, 'BANK_TRANSFER', 'TXN20240905001', 'Payment', '2024-09-05 10:45:00'),
('p29', 'fp4', 60000.00, 'CASH', NULL, 'Payment', '2024-09-10 11:30:00'),

-- October 2024 transactions
('p30', 'fp7', 120000.00, 'ONLINE', 'TXN20241005001', 'Payment', '2024-10-05 15:20:00'),
('p31', 'fp5', 75000.00, 'BANK_TRANSFER', 'TXN20241010001', 'Payment', '2024-10-10 09:00:00'),

-- November 2024 transactions
('p32', 'fp8', 150000.00, 'CASH', NULL, 'Payment', '2024-11-02 12:00:00'),
('p33', 'fp1', 50000.00, 'ONLINE', 'TXN20241105001', 'Payment', '2024-11-05 14:30:00'),

-- December 2024 transactions
('p34', 'fp2', 50000.00, 'BANK_TRANSFER', 'TXN20241210001', 'Payment', '2024-12-10 10:00:00'),
('p35', 'fp6', 100000.00, 'ONLINE', 'TXN20241215001', 'Payment', '2024-12-15 15:00:00');
```

---

## Testing the API Endpoint

### 1. Using cURL

```bash
# Test the financial dashboard endpoint
curl -X GET http://localhost:5000/api/fee-payments/dashboard?year=2024 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Test with different year
curl -X GET http://localhost:5000/api/fee-payments/dashboard?year=2023 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Using Postman

1. Create a new GET request
2. URL: `http://localhost:5000/api/fee-payments/dashboard?year=2024`
3. Headers:
   - `Authorization: Bearer YOUR_JWT_TOKEN`
   - `Content-Type: application/json`
4. Click Send

### 3. Using Node.js Script

```javascript
// test-dashboard-api.js
import axios from 'axios';

async function testDashboardAPI() {
  try {
    const response = await axios.get('http://localhost:5000/api/fee-payments/dashboard', {
      params: { year: 2024 },
      headers: {
        'Authorization': `Bearer YOUR_JWT_TOKEN`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Dashboard Data:', JSON.stringify(response.data, null, 2));
    
    // Extract and display key metrics
    const data = response.data.data;
    console.log('\n=== SUMMARY ===');
    console.log(`Total Collected: ₹${data.summary.totalCollected.toLocaleString()}`);
    console.log(`Total Transactions: ${data.summary.totalTransactions}`);
    console.log(`Average Amount: ₹${data.summary.averageTransactionAmount.toFixed(2)}`);
    
    // Display monthly collection
    console.log('\n=== MONTHLY COLLECTION ===');
    data.monthlyCollection.data.forEach(month => {
      console.log(`${month.monthName}: ₹${month.amount.toLocaleString()}`);
    });
    
    // Display payment methods
    console.log('\n=== PAYMENT METHODS ===');
    data.paymentMethodDistribution.data.forEach(method => {
      console.log(`${method.method}: ${method.count} transactions, ₹${method.totalAmount.toLocaleString()}`);
    });
    
    // Display recent transactions
    console.log('\n=== RECENT TRANSACTIONS ===');
    data.recentTransactions.data.forEach((txn, index) => {
      console.log(`${index + 1}. ${txn.studentName} - ${txn.method} - ₹${txn.amount.toLocaleString()}`);
    });

  } catch (error) {
    console.error('Error testing API:', error.response?.data || error.message);
  }
}

testDashboardAPI();
```

### 4. Expected Response

```json
{
  "success": true,
  "message": "Financial dashboard data retrieved successfully",
  "data": {
    "year": 2024,
    "monthlyCollection": {
      "title": "Monthly Fee Collection",
      "data": [
        { "month": 1, "monthName": "Jan", "amount": 580000 },
        { "month": 2, "monthName": "Feb", "amount": 110000 },
        { "month": 3, "monthName": "Mar", "amount": 290000 },
        { "month": 4, "monthName": "Apr", "amount": 285000 },
        { "month": 5, "monthName": "May", "amount": 200000 },
        { "month": 6, "monthName": "Jun", "amount": 180000 },
        { "month": 7, "monthName": "Jul", "amount": 225000 },
        { "month": 8, "monthName": "Aug", "amount": 100000 },
        { "month": 9, "monthName": "Sep", "amount": 160000 },
        { "month": 10, "monthName": "Oct", "amount": 195000 },
        { "month": 11, "monthName": "Nov", "amount": 200000 },
        { "month": 12, "monthName": "Dec", "amount": 150000 }
      ],
      "totalCollected": 2675000
    },
    "paymentMethodDistribution": {
      "title": "Payment Method Distribution",
      "data": [
        { "method": "BANK_TRANSFER", "count": 13, "totalAmount": 1055000 },
        { "method": "ONLINE", "count": 13, "totalAmount": 1050000 },
        { "method": "CASH", "count": 6, "totalAmount": 450000 },
        { "method": "DD", "count": 1, "totalAmount": 150000 },
        { "method": "CHEQUE", "count": 1, "totalAmount": 100000 }
      ],
      "total": 35
    },
    "recentTransactions": {
      "title": "Recent Transactions",
      "data": [
        {
          "id": "p35",
          "studentName": "Emma Brown",
          "studentId": "STU006",
          "invoiceNo": "p35",
          "class": "Class 1-B",
          "amount": 100000,
          "method": "ONLINE",
          "status": "PAID",
          "transactionDate": "2024-12-15T15:00:00.000Z",
          "transactionId": "TXN20241215001"
        },
        // ... more transactions
      ],
      "count": 5
    },
    "summary": {
      "totalCollected": 2675000,
      "totalTransactions": 35,
      "averageTransactionAmount": 76428.57
    }
  }
}
```

---

## Performance Testing

### Load Testing Script

```javascript
// load-test.js
import k6 from 'k6';
import http from 'k6/http';
import { check } from 'k6';

const TOKEN = 'YOUR_JWT_TOKEN';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m30s', target: 20 }, // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function () {
  const url = 'http://localhost:5000/api/fee-payments/dashboard?year=2024';
  const params = {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  const response = http.get(url, params);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has monthly collection data': (r) => r.body.includes('monthlyCollection'),
    'has payment method data': (r) => r.body.includes('paymentMethodDistribution'),
    'has recent transactions': (r) => r.body.includes('recentTransactions'),
  });
}
```

Run with: `k6 run load-test.js`

---

## Database Queries for Analysis

```sql
-- Get payment statistics by method
SELECT 
  "paymentMethod",
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  AVG(amount) as average_amount,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount
FROM "Payment"
WHERE EXTRACT(YEAR FROM "createdAt") = 2024
GROUP BY "paymentMethod"
ORDER BY total_amount DESC;

-- Get monthly trends
SELECT 
  EXTRACT(MONTH FROM "createdAt") as month,
  TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month_name,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  AVG(amount) as average_amount
FROM "Payment"
WHERE EXTRACT(YEAR FROM "createdAt") = 2024
GROUP BY EXTRACT(MONTH FROM "createdAt"), month_name
ORDER BY month;

-- Get top paying students
SELECT 
  s."firstName",
  s."lastName",
  s."studentId",
  COUNT(p.id) as payment_count,
  SUM(p.amount) as total_paid,
  MAX(p."createdAt") as last_payment_date
FROM "Payment" p
JOIN "FeePayment" fp ON p."feePaymentId" = fp.id
JOIN "Student" s ON fp."studentId" = s.id
WHERE EXTRACT(YEAR FROM p."createdAt") = 2024
GROUP BY s.id, s."firstName", s."lastName", s."studentId"
ORDER BY total_paid DESC
LIMIT 10;

-- Get collection status by class
SELECT 
  c.name as class_name,
  COUNT(DISTINCT s.id) as total_students,
  COUNT(fp.id) as fee_payments,
  SUM(CASE WHEN fp."paymentStatus" = 'PAID' THEN 1 ELSE 0 END) as paid,
  SUM(CASE WHEN fp."paymentStatus" = 'PARTIAL' THEN 1 ELSE 0 END) as partial,
  SUM(CASE WHEN fp."paymentStatus" = 'PENDING' THEN 1 ELSE 0 END) as pending,
  SUM(fp."amountPaid") as total_collected,
  SUM(fp."totalAmount") as total_due
FROM "Class" c
JOIN "Student" s ON c.id = s."classId"
JOIN "FeePayment" fp ON s.id = fp."studentId"
GROUP BY c.id, c.name
ORDER BY total_collected DESC;
```

---

## Troubleshooting Common Issues

### Issue: "No data returned"
**Cause**: Sample data not inserted
**Solution**: Run the INSERT statements above to populate test data

### Issue: "404 endpoint not found"
**Cause**: Route not registered correctly
**Solution**: 
1. Verify route is added to server.js
2. Check import statements
3. Verify middleware order

### Issue: "Authentication failed"
**Cause**: Invalid or missing JWT token
**Solution**:
1. Get valid token from login endpoint
2. Include in Authorization header
3. Check token expiration

### Issue: "Slow response time"
**Cause**: Missing database indexes
**Solution**: Run the CREATE INDEX statements above

---

## Next Steps

1. **Set up the database** using the SQL scripts above
2. **Insert sample data** for testing
3. **Test the endpoint** using one of the testing methods above
4. **Optimize performance** by adding indexes if needed
5. **Deploy to production** with proper error handling and monitoring
6. **Monitor and maintain** the API with regular performance checks
