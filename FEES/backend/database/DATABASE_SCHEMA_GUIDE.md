# Fee Management System - PostgreSQL Database Schema & Queries

## Overview
This document provides a comprehensive guide to the PostgreSQL database schema and SQL queries for the Fee Management System dashboard. The schema is designed based on Prisma ORM models and optimized for the dashboard requirements.

---

## Table of Contents
1. [Database Schema Overview](#database-schema-overview)
2. [Core Tables](#core-tables)
3. [Dashboard Queries](#dashboard-queries)
4. [Query Examples](#query-examples)
5. [Performance Optimization](#performance-optimization)
6. [Setup Instructions](#setup-instructions)

---

## Database Schema Overview

### High-Level Architecture
```
┌─────────────────┐
│     User        │ (Admin, Accountant, Staff)
└────────┬────────┘
         │
    ┌────┴─────────────┐
    │                  │
┌───▼───────┐    ┌────▼──────┐
│  Student  │    │ FeePayment│ (Invoices)
└───┬───────┘    └────┬──────┘
    │                 │
    ├─────────────┬───┘
    │             │
┌───▼──┐    ┌────▼────┐    ┌───────────┐
│Class │    │ Payment │    │  Refund   │
└──────┘    │ Records │    │ Requests  │
            └─────────┘    └───────────┘
```

---

## Core Tables

### 1. **Student Table**
```sql
CREATE TABLE "Student" (
    id TEXT PRIMARY KEY,
    studentId TEXT UNIQUE NOT NULL,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    dateOfBirth DATE,
    gender VARCHAR(10),
    street TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postalCode VARCHAR(10),
    country VARCHAR(100),
    courseId TEXT NOT NULL,
    classId TEXT NOT NULL,
    enrollmentDate TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, GRADUATED, SUSPENDED
    isVerified BOOLEAN DEFAULT FALSE,
    parentId TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP,
    
    FOREIGN KEY (courseId) REFERENCES "Course"(id),
    FOREIGN KEY (classId) REFERENCES "Class"(id),
    FOREIGN KEY (parentId) REFERENCES "Parent"(id)
);
```

**Key Columns:**
- `studentId`: Unique student identifier (e.g., STU001)
- `classId`: References the class/section
- `status`: Tracks enrollment status

### 2. **Class Table**
```sql
CREATE TABLE "Class" (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    courseId TEXT NOT NULL,
    semester INT,
    capacity INT,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP,
    
    FOREIGN KEY (courseId) REFERENCES "Course"(id),
    UNIQUE(code, courseId)
);
```

### 3. **FeePayment Table (Invoices)**
```sql
CREATE TABLE "FeePayment" (
    id TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    feeStructureId TEXT NOT NULL,
    totalAmount DECIMAL(10,2) NOT NULL,
    amountPaid DECIMAL(10,2) DEFAULT 0,
    amountPending DECIMAL(10,2) NOT NULL,
    dueDate TIMESTAMP NOT NULL,
    paymentStatus VARCHAR(20) DEFAULT 'PENDING', 
    -- PENDING, PARTIAL, PAID, OVERDUE
    penaltyCharges DECIMAL(10,2) DEFAULT 0,
    discountAmount DECIMAL(10,2) DEFAULT 0,
    discountReason TEXT,
    approvedBy TEXT,
    notes TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP,
    
    FOREIGN KEY (studentId) REFERENCES "Student"(id) ON DELETE CASCADE,
    FOREIGN KEY (feeStructureId) REFERENCES "FeeStructure"(id) ON DELETE CASCADE,
    FOREIGN KEY (approvedBy) REFERENCES "User"(id)
);
```

**Key Columns:**
- `totalAmount`: Total fee due
- `amountPaid`: Amount already paid
- `amountPending`: Outstanding balance
- `dueDate`: Payment due date
- `paymentStatus`: Current payment status

### 4. **Payment Table (Transactions)**
```sql
CREATE TABLE "Payment" (
    id TEXT PRIMARY KEY,
    feePaymentId TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    paymentMethod VARCHAR(50) NOT NULL, 
    -- CASH, CHEQUE, BANK_TRANSFER, ONLINE, DD
    transactionId VARCHAR(255),
    receivedBy TEXT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP,
    
    FOREIGN KEY (feePaymentId) REFERENCES "FeePayment"(id) ON DELETE CASCADE
);
```

**Key Columns:**
- `paymentMethod`: How payment was received (Cash, Cheque, Online, etc.)
- `amount`: Payment amount
- `createdAt`: Payment date/time

### 5. **RefundRequest Table**
```sql
CREATE TABLE "RefundRequest" (
    id TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    feePaymentId TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'PENDING', 
    -- PENDING, APPROVED, REJECTED, PROCESSED
    approvedBy TEXT,
    approvalDate TIMESTAMP,
    rejectionReason TEXT,
    refundMethod VARCHAR(50), 
    -- BANK_TRANSFER, CHEQUE, CASH
    bankAccountHolder TEXT,
    bankAccountNumber TEXT,
    ifscCode TEXT,
    processedDate TIMESTAMP,
    refundTransactionId TEXT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP,
    
    FOREIGN KEY (studentId) REFERENCES "Student"(id) ON DELETE CASCADE,
    FOREIGN KEY (feePaymentId) REFERENCES "FeePayment"(id) ON DELETE CASCADE,
    FOREIGN KEY (approvedBy) REFERENCES "User"(id)
);
```

---

## Dashboard Queries

### 1. Total Metrics

#### Query 1.1: Get Dashboard Summary Card Metrics
```sql
SELECT 
    (SELECT COALESCE(SUM(amount), 0) 
     FROM "Payment" 
     WHERE "createdAt" >= CURRENT_DATE - INTERVAL '1 year') as total_fees_collected,
    
    (SELECT COALESCE(SUM("amountPending"), 0) 
     FROM "FeePayment" 
     WHERE "paymentStatus" IN ('PENDING', 'PARTIAL', 'OVERDUE') 
     AND "isActive" = true) as pending_payments,
    
    (SELECT COALESCE(SUM("amountPending"), 0) 
     FROM "FeePayment" 
     WHERE "paymentStatus" IN ('OVERDUE', 'PARTIAL') 
     AND "dueDate" < CURRENT_DATE 
     AND "amountPending" > 0 
     AND "isActive" = true) as overdue_payments,
    
    (SELECT COALESCE(SUM("amount"), 0) 
     FROM "RefundRequest" 
     WHERE "status" IN ('PENDING', 'APPROVED')) as refund_requests;
```

**Expected Output:**
```
total_fees_collected | pending_payments | overdue_payments | refund_requests
        180000       |      240000      |        0         |        0
```

### 2. Monthly Trends

#### Query 2.1: Monthly Fee Collection (Bar Chart)
```sql
SELECT 
    DATE_TRUNC('month', "Payment"."createdAt")::DATE as collection_month,
    TO_CHAR(DATE_TRUNC('month', "Payment"."createdAt"), 'Mon') as month_name,
    COALESCE(SUM("Payment"."amount"), 0) as collected_amount,
    COUNT("Payment"."id") as transaction_count
FROM "Payment"
WHERE "Payment"."createdAt" >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', "Payment"."createdAt")
ORDER BY DATE_TRUNC('month', "Payment"."createdAt") ASC;
```

**Expected Output:**
```
collection_month | month_name | collected_amount | transaction_count
   2026-01-01    |    Jan     |        0         |         0
   2026-02-01    |    Feb     |        0         |         0
   2026-03-01    |    Mar     |       50000      |         5
   2026-04-01    |    Apr     |      130000      |        13
```

### 3. Payment Method Distribution

#### Query 3.1: Payment Method Breakdown (Donut Chart)
```sql
SELECT 
    "Payment"."paymentMethod" as payment_method,
    COALESCE(SUM("Payment"."amount"), 0) as total_amount,
    COUNT("Payment"."id") as transaction_count,
    ROUND(
        (SUM("Payment"."amount") / 
         (SELECT SUM(amount) FROM "Payment") 
        ) * 100, 2
    ) as percentage
FROM "Payment"
GROUP BY "Payment"."paymentMethod"
ORDER BY total_amount DESC;
```

**Expected Output:**
```
payment_method | total_amount | transaction_count | percentage
     CASH      |    120000    |         8         |   66.67
     CHEQUE    |     40000    |         3         |   22.22
     ONLINE    |     20000    |         2         |   11.11
```

### 4. Recent Transactions

#### Query 4.1: Recent Transactions (Table Display)
```sql
SELECT 
    s."firstName" || ' ' || s."lastName" as student_name,
    s."studentId" as student_id,
    fp."id" as invoice_id,
    c."name" as class_name,
    p."amount" as amount,
    p."paymentMethod" as payment_method,
    fp."paymentStatus" as status,
    p."createdAt" as transaction_date
FROM "Payment" p
JOIN "FeePayment" fp ON p."feePaymentId" = fp."id"
JOIN "Student" s ON fp."studentId" = s."id"
JOIN "Class" c ON s."classId" = c."id"
ORDER BY p."createdAt" DESC
LIMIT 10;
```

**Expected Output:**
```
student_name | student_id | invoice_id | class_name | amount | payment_method | status | transaction_date
Priya Singh  |  STU002    |   INV001   | Class 10A  | 120000 |    CASH        | PAID   | 2026-04-26 10:30:00
Rahul Kumar  |  STU001    |   INV002   | Class 10B  |  60000 |    CHEQUE      | PARTIAL| 2026-04-26 09:15:00
```

---

## Query Examples

### Finding Outstanding Student Payments
```sql
-- Get students with pending payments over 30 days
SELECT 
    s."firstName" || ' ' || s."lastName" as student_name,
    s."studentId",
    s."phone",
    c."name" as class_name,
    COALESCE(SUM(fp."amountPending"), 0) as pending_amount,
    MAX(p."createdAt")::DATE as last_payment_date,
    EXTRACT(DAY FROM CURRENT_DATE - MAX(p."createdAt")::DATE) as days_since_payment
FROM "Student" s
LEFT JOIN "FeePayment" fp ON s."id" = fp."studentId"
LEFT JOIN "Class" c ON s."classId" = c."id"
LEFT JOIN "Payment" p ON fp."id" = p."feePaymentId"
WHERE s."status" = 'ACTIVE'
    AND fp."paymentStatus" IN ('PENDING', 'PARTIAL', 'OVERDUE')
GROUP BY s."id", c."id"
HAVING EXTRACT(DAY FROM CURRENT_DATE - MAX(p."createdAt")::DATE) > 30
ORDER BY last_payment_date ASC;
```

### Collection Efficiency by Class
```sql
-- Get collection metrics by class
SELECT 
    c."name" as class_name,
    COUNT(DISTINCT s."id") as student_count,
    COALESCE(SUM(fp."totalAmount"), 0) as total_fees_due,
    COALESCE(SUM(fp."amountPaid"), 0) as total_collected,
    ROUND(
        CASE 
            WHEN SUM(fp."totalAmount") > 0 
            THEN (SUM(fp."amountPaid") / SUM(fp."totalAmount") * 100)
            ELSE 0
        END, 2
    ) as collection_percentage
FROM "Class" c
LEFT JOIN "Student" s ON c."id" = s."classId"
LEFT JOIN "FeePayment" fp ON s."id" = fp."studentId"
WHERE s."status" = 'ACTIVE'
GROUP BY c."id", c."name"
ORDER BY collection_percentage DESC;
```

---

## Performance Optimization

### Recommended Indexes
```sql
-- Primary Indexes
CREATE INDEX idx_payment_created ON "Payment"("createdAt");
CREATE INDEX idx_payment_method ON "Payment"("paymentMethod");
CREATE INDEX idx_feepayment_status ON "FeePayment"("paymentStatus");
CREATE INDEX idx_feepayment_duedate ON "FeePayment"("dueDate");
CREATE INDEX idx_feepayment_student ON "FeePayment"("studentId");
CREATE INDEX idx_student_status ON "Student"("status");
CREATE INDEX idx_student_class ON "Student"("classId");
CREATE INDEX idx_refund_status ON "RefundRequest"("status");

-- Composite Indexes for Common Query Patterns
CREATE INDEX idx_payment_feedate ON "Payment"("feePaymentId", "createdAt");
CREATE INDEX idx_feepayment_status_date ON "FeePayment"("paymentStatus", "dueDate");
```

### Query Optimization Tips
1. **Use Views for Complex Queries**: Pre-calculate metrics in views
2. **Partition Large Tables**: Partition Payment table by year
3. **Archive Old Records**: Archive payments older than 2 years
4. **Use Materialized Views**: For monthly summaries that don't change

---

## Setup Instructions

### 1. Running Migrations
```bash
# Apply Prisma migrations to create tables
cd backend
npx prisma migrate deploy
```

### 2. Running Dashboard Queries
```bash
# Connect to PostgreSQL
psql -U postgres -d fee_management

# Run the dashboard queries SQL file
\i database/dashboard-queries.sql

# Execute sample queries
SELECT * FROM v_dashboard_summary;
SELECT * FROM v_recent_transactions LIMIT 5;
```

### 3. Creating Views
```bash
# Connect to database and create views
psql -U postgres -d fee_management < database/dashboard-queries.sql
```

### 4. Testing Sample Data
```sql
-- Insert test student
INSERT INTO "Student" (
    id, "studentId", "firstName", "lastName", "classId", "courseId", 
    "enrollmentDate", "status"
) VALUES (
    'cuid001', 'STU001', 'Arun', 'Patel', 'class001', 'course001',
    CURRENT_TIMESTAMP, 'ACTIVE'
);

-- Insert test fee payment
INSERT INTO "FeePayment" (
    id, "studentId", "feeStructureId", "totalAmount", "amountPending", 
    "dueDate", "paymentStatus"
) VALUES (
    'inv001', 'cuid001', 'feestruct001', 50000, 50000,
    CURRENT_DATE + INTERVAL '30 days', 'PENDING'
);
```

---

## API Integration Points

### Backend Endpoints Using These Queries

1. **GET /api/fee-payments/dashboard/stats**
   - Uses: Query 1.5 (Dashboard Metrics)
   - Returns: Total collected, pending, overdue, refunds

2. **GET /api/fee-payments/dashboard/monthly**
   - Uses: Query 2.1 (Monthly Trends)
   - Returns: Monthly collection data

3. **GET /api/fee-payments/dashboard/methods**
   - Uses: Query 3.1 (Payment Distribution)
   - Returns: Payment method breakdown

4. **GET /api/fee-payments/recent**
   - Uses: Query 4.1 (Recent Transactions)
   - Returns: Last 10 transactions

---

## Maintenance & Best Practices

### Regular Maintenance Tasks
1. **Monthly**: Archive old payment records
2. **Weekly**: Update materialized views
3. **Daily**: Verify data integrity
4. **Quarterly**: Analyze query performance

### Backup Strategy
```bash
# Weekly backup
pg_dump -U postgres fee_management > backup_$(date +%Y%m%d).sql

# Automated backup
0 2 * * * pg_dump -U postgres fee_management > /backups/fee_db_$(date +\%Y\%m\%d).sql
```

---

## Troubleshooting

### Common Issues

**Issue**: Queries running slow
- **Solution**: Run `VACUUM` and `ANALYZE` on tables
```sql
VACUUM ANALYZE "Payment";
VACUUM ANALYZE "FeePayment";
```

**Issue**: Out of date statistics
- **Solution**: Update table statistics
```sql
ANALYZE "Payment";
ANALYZE "Student";
```

**Issue**: Foreign key constraint error
- **Solution**: Check referential integrity
```sql
SELECT * FROM "Student" s 
WHERE s."classId" NOT IN (SELECT id FROM "Class");
```

---

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Query Optimization Guide](https://www.postgresql.org/docs/current/sql-explain.html)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-29 | Initial schema and queries |

