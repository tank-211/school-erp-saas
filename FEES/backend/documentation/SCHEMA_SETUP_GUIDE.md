# PostgreSQL Schema Setup Guide - Fee Module

## 📋 Overview

The schema includes:

### Core Tables
- **students** - Student information (15 sample records)
- **classes** - Class/Grade information (5 sample records)
- **student_class** - Student enrollment in classes (many-to-many)
- **transactions** - Fee payments with status tracking (90 sample records: 6 months × 15 students)
- **fee_structure** - Fee types and amounts per class
- **refund_requests** - Refund management
- **payment_receipts** - Receipt tracking

### Sample Data Included
✅ 15 Students across 3 classes
✅ 5 Classes (12-A, 12-B, 11-A, 10-A, 10-B)
✅ 90 Transactions (6 months: Jan-June 2024)
✅ Payment methods: Cash, Check, UPI, Bank Transfer
✅ Transaction statuses: Paid, Pending, Overdue, Partial
✅ Realistic payment dates throughout each month

### Views Included
- `vw_monthly_collection` - Monthly fee collection summary
- `vw_payment_method_distribution` - Payment method breakdown
- `vw_student_fee_status` - Individual student fee status

---

## 🚀 Quick Setup

### Option 1: PostgreSQL Command Line

```bash
# Connect to PostgreSQL
psql -U postgres -h localhost

# Create database
CREATE DATABASE fee_management_db;
\c fee_management_db

# Run the schema file
\i 'path/to/schema.sql'
```

### Option 2: DBeaver or pgAdmin

1. Create a new database: `fee_management_db`
2. Open the SQL file in your tool
3. Execute all statements

### Option 3: Node.js (from your backend)

```javascript
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'your_password',
  host: 'localhost',
  port: 5432,
  database: 'fee_management_db'
});

const schema = fs.readFileSync('./schema.sql', 'utf8');
pool.query(schema, (err, res) => {
  if (err) console.error('Error:', err);
  else console.log('Schema created successfully!');
});
```

---

## 📊 Database Schema Structure

### Students Table
```
id (PK)
├─ student_id (UNIQUE) - STU-2024-001, STU-2024-002...
├─ first_name
├─ last_name
├─ email
├─ phone
├─ gender
├─ address, city, state
├─ guardian_name
├─ enrollment_date
├─ status (Active/Inactive/Graduated)
└─ timestamps
```

### Classes Table
```
id (PK)
├─ class_name - "Class 12-A"
├─ class_code (UNIQUE) - "CLASS-12-A"
├─ section - A, B, C...
├─ academic_year - "2024-2025"
├─ capacity
├─ class_teacher
├─ start_date
├─ end_date
├─ status
└─ timestamps
```

### Transactions Table (Main for Fee Collection)
```
id (PK)
├─ transaction_id (UNIQUE) - "TXN-2024-01-001"
├─ student_id (FK → students)
├─ class_id (FK → classes)
├─ invoice_number (UNIQUE) - "INV-2024-01-001"
├─ amount (6500.00 per month)
├─ payment_method - Cash, Check, UPI, Bank Transfer
├─ status - Paid, Pending, Overdue, Partial
├─ payment_date - When paid (nullable if Pending)
├─ due_date - When due
├─ receipt_number
├─ bank_name, check_number, upi_id
├─ notes
└─ timestamps (indexed for fast queries)
```

### Student-Class Enrollment
```
id (PK)
├─ student_id (FK)
├─ class_id (FK)
├─ enrollment_date
├─ status
└─ timestamps (UNIQUE constraint on student_id + class_id)
```

### Fee Structure
```
id (PK)
├─ class_id (FK)
├─ fee_type - Tuition, Transport, Lab
├─ amount
├─ frequency - Monthly, Quarterly, Yearly
├─ due_date - Day of month
├─ status
└─ timestamps
```

---

## 📈 Sample Data Details

### Classes
| Class Code | Class Name | Section | Teacher | Capacity |
|-----------|-----------|---------|---------|----------|
| CLASS-12-A | Class 12-A | A | Mr. Kumar Singh | 50 |
| CLASS-12-B | Class 12-B | B | Ms. Priya Sharma | 48 |
| CLASS-11-A | Class 11-A | A | Mr. Rajesh Verma | 52 |
| CLASS-10-A | Class 10-A | A | Ms. Anjali Patel | 55 |
| CLASS-10-B | Class 10-B | B | Mr. Vikram Desai | 50 |

### Students Distribution
- 5 students in Class 12-A
- 5 students in Class 12-B
- 5 students in Class 11-A
- Total: 15 students

### Monthly Transactions (Per Student)
- **January**: All 15 students paid (100% collection)
- **February**: 14 paid, 1 pending (93% collection)
- **March**: All 15 students paid (100% collection)
- **April**: 13 paid, 1 overdue, 1 pending (87% collection)
- **May**: 15 paid (1 partial payment) (100% participation)
- **June**: 14 paid, 1 pending (93% collection)

**Total Transactions**: 90 records (6 months × 15 students)

---

## 🔍 Sample Queries

### Query 1: Monthly Collection via View
```sql
SELECT * FROM vw_monthly_collection;
```
Returns: Month, transaction count, collected, pending, overdue amounts

### Query 2: Payment Method Distribution via View
```sql
SELECT * FROM vw_payment_method_distribution;
```
Returns: Payment method, count, total amount, percentage

### Query 3: Specific Month Transactions
```sql
SELECT 
    t.transaction_id,
    s.student_id,
    s.first_name,
    s.last_name,
    c.class_name,
    t.amount,
    t.payment_method,
    t.status,
    t.payment_date
FROM transactions t
JOIN students s ON t.student_id = s.id
JOIN classes c ON t.class_id = c.id
WHERE DATE_TRUNC('month', t.created_at) = '2024-01-01'
ORDER BY t.payment_date DESC;
```

### Query 4: Student Pending Fees
```sql
SELECT 
    s.student_id,
    CONCAT(s.first_name, ' ', s.last_name) as student_name,
    c.class_name,
    SUM(t.amount) as pending_amount
FROM transactions t
JOIN students s ON t.student_id = s.id
JOIN classes c ON t.class_id = c.id
WHERE t.status = 'Pending'
GROUP BY s.id, s.student_id, c.id, c.class_name
ORDER BY pending_amount DESC;
```

### Query 5: Payment Method Usage
```sql
SELECT 
    t.payment_method,
    COUNT(*) as usage_count,
    SUM(t.amount) as total_amount
FROM transactions t
WHERE t.status = 'Paid'
GROUP BY t.payment_method
ORDER BY total_amount DESC;
```

### Query 6: Monthly Collection Trend
```sql
SELECT 
    DATE_TRUNC('month', t.payment_date)::DATE as month,
    SUM(t.amount) as collected
FROM transactions t
WHERE t.status = 'Paid'
GROUP BY DATE_TRUNC('month', t.payment_date)
ORDER BY month;
```

### Query 7: Student Status via View
```sql
SELECT * FROM vw_student_fee_status
WHERE total_pending > 0
ORDER BY total_pending DESC;
```

---

## 🔐 Security Features

✅ **Primary Keys** - All tables have unique identifiers
✅ **Foreign Keys** - Referential integrity (CASCADE delete)
✅ **Unique Constraints** - Prevent duplicate transactions
✅ **Indexes** - Performance optimization for common queries:
  - student_id, class_id (foreign key lookups)
  - payment_date (time-range queries)
  - status (status filtering)
  - invoice_number (unique lookup)

---

## 📱 Integration with Your App

### Express Backend
```javascript
// Use this to fetch dashboard data
const query = `
  SELECT 
    DATE_TRUNC('month', t.payment_date)::DATE as month,
    SUM(t.amount) as amount
  FROM transactions t
  WHERE t.status = 'Paid'
  AND EXTRACT(YEAR FROM t.payment_date) = $1
  GROUP BY DATE_TRUNC('month', t.payment_date)
  ORDER BY month;
`;

pool.query(query, [2024], (err, result) => {
  if (err) throw err;
  // Use result.rows for chart data
});
```

### React Frontend
```javascript
// The schema provides exactly the data structure your dashboard needs:
{
  monthlyCollection: [
    { month: 1, monthName: "Jan", amount: 97500 },
    { month: 2, monthName: "Feb", amount: 91500 },
    // ...
  ],
  paymentMethodDistribution: [
    { method: "Cash", count: 15, totalAmount: 97500 },
    // ...
  ],
  recentTransactions: [
    { studentName: "Aaryan Gupta", amount: 6500, status: "Paid", ... },
    // ...
  ]
}
```

---

## ✅ Verification

After running the schema, verify the setup:

```sql
-- Check all tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check record counts
SELECT 'Classes', COUNT(*) FROM classes
UNION ALL
SELECT 'Students', COUNT(*) FROM students
UNION ALL
SELECT 'Transactions', COUNT(*) FROM transactions;

-- Check a sample transaction
SELECT * FROM transactions LIMIT 5;

-- Check views
\dv  -- List all views
```

Expected output:
- 7 tables created
- 5 classes
- 15 students
- 90 transactions
- 3 views

---

## 🔧 Customization

### Add More Students
```sql
INSERT INTO students (student_id, first_name, last_name, email)
VALUES ('STU-2024-016', 'New', 'Student', 'new@school.com');
```

### Add New Class
```sql
INSERT INTO classes (class_name, class_code, section, academic_year, capacity)
VALUES ('Class 9-A', 'CLASS-9-A', 'A', '2024-2025', 50);
```

### Modify Fee Structure
```sql
UPDATE fee_structure 
SET amount = 6000.00 
WHERE fee_type = 'Tuition Fee' AND class_id = 1;
```

### Record a Payment
```sql
INSERT INTO transactions (transaction_id, student_id, class_id, invoice_number, amount, payment_method, status, payment_date)
VALUES ('TXN-2024-12-001', 1, 1, 'INV-2024-12-001', 6500.00, 'UPI', 'Paid', NOW());
```

---

## 📞 Need Help?

- **Connect with psql**: `psql -U postgres -d fee_management_db`
- **Check errors**: Look for constraint violations in INSERT statements
- **Reset everything**: `DROP DATABASE fee_management_db;` then rerun schema.sql
- **Backup**: `pg_dump -U postgres fee_management_db > backup.sql`

---

## 🎯 Next Steps

1. ✅ Run schema.sql to create tables and seed data
2. ✅ Verify data using sample queries above
3. ✅ Connect from your Express backend using connection pool
4. ✅ Update your API endpoints to fetch from these tables
5. ✅ Test with your React dashboard component
6. ✅ Monitor query performance with EXPLAIN ANALYZE
7. ✅ Add additional indexes if needed based on your query patterns

**Your database is ready for production!** 🚀
