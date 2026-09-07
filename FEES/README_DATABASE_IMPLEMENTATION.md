# Fee Management System - Complete Database & API Implementation Guide

## 📋 Overview

This guide provides complete implementation details for the Fee Management System's PostgreSQL database and REST API endpoints, designed to power the Fees & Payments Dashboard.

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
│              Fees & Payments Dashboard UI                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                    API Calls (HTTP)
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   API LAYER (Express)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Dashboard Endpoints                                  │   │
│  │  - /api/dashboard/stats                              │   │
│  │  - /api/dashboard/monthly                            │   │
│  │  - /api/dashboard/payment-methods                    │   │
│  │  - /api/dashboard/recent-transactions               │   │
│  │  - etc.                                              │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
┌───────▼────────┐          ┌────────────▼──────┐
│ Service Layer  │          │ Middleware Layer  │
│ Dashboard      │          │ Auth, Validation  │
│ Service        │          └───────────────────┘
└───────┬────────┘
        │
┌───────▼──────────────────────────────────────────────────────┐
│              DATABASE LAYER (Prisma + PostgreSQL)             │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Tables:                                             │    │
│  │  - Student, Class, Course, FeeStructure             │    │
│  │  - FeePayment (Invoices), Payment (Transactions)    │    │
│  │  - RefundRequest, User, Parent                      │    │
│  └──────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Tables

### Core Tables

#### 1. **Student**
```
├─ id (Primary Key)
├─ studentId (Unique)
├─ firstName, lastName
├─ email, phone
├─ classId (Foreign Key)
├─ courseId (Foreign Key)
├─ status (ACTIVE, INACTIVE, GRADUATED, SUSPENDED)
└─ enrollmentDate, createdAt, updatedAt
```

#### 2. **Class**
```
├─ id (Primary Key)
├─ name, code
├─ courseId (Foreign Key)
├─ semester, capacity
├─ isActive
└─ timestamps
```

#### 3. **FeePayment** (Invoices)
```
├─ id (Primary Key)
├─ studentId (Foreign Key)
├─ feeStructureId (Foreign Key)
├─ totalAmount, amountPaid, amountPending
├─ dueDate
├─ paymentStatus (PENDING, PARTIAL, PAID, OVERDUE)
├─ penaltyCharges, discountAmount
└─ timestamps
```

#### 4. **Payment** (Transactions)
```
├─ id (Primary Key)
├─ feePaymentId (Foreign Key)
├─ amount
├─ paymentMethod (CASH, CHEQUE, BANK_TRANSFER, ONLINE, DD)
├─ transactionId (External gateway ID)
└─ timestamps
```

#### 5. **RefundRequest**
```
├─ id (Primary Key)
├─ studentId, feePaymentId (Foreign Keys)
├─ amount, reason
├─ status (PENDING, APPROVED, REJECTED, PROCESSED)
├─ refundMethod (BANK_TRANSFER, CHEQUE, CASH)
├─ bankAccountHolder, bankAccountNumber, ifscCode
└─ timestamps
```

---

## 🔌 API Endpoints

### Dashboard Endpoints

#### 1. **Get Dashboard Metrics**
```
GET /api/dashboard/stats
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "totalFeesCollected": 180000,
    "pendingPayments": 240000,
    "overduePayments": 0,
    "refundRequests": 0
  }
}
```

#### 2. **Get Monthly Collection Trend**
```
GET /api/dashboard/monthly?year=2026
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "collection_month": "2026-04-01",
      "month_name": "Apr",
      "collected_amount": 130000,
      "transaction_count": 13
    },
    ...
  ]
}
```

#### 3. **Get Payment Method Distribution**
```
GET /api/dashboard/payment-methods
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "paymentMethod": "CASH",
      "totalAmount": 120000,
      "transactionCount": 8,
      "percentage": "66.67"
    },
    {
      "paymentMethod": "CHEQUE",
      "totalAmount": 40000,
      "transactionCount": 3,
      "percentage": "22.22"
    },
    ...
  ]
}
```

#### 4. **Get Recent Transactions**
```
GET /api/dashboard/recent-transactions?limit=10
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "studentName": "Priya Singh",
      "studentId": "STU002",
      "invoiceId": "INV001",
      "className": "Class 10A",
      "amount": 120000,
      "paymentMethod": "CASH",
      "status": "PAID",
      "transactionDate": "2026-04-26T10:30:00Z",
      "transactionId": "TXN123"
    },
    ...
  ]
}
```

#### 5. **Get Status Distribution**
```
GET /api/dashboard/status-distribution
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "status": "PAID",
      "count": 25,
      "totalAmount": 500000
    },
    {
      "status": "PENDING",
      "count": 15,
      "totalAmount": 300000
    },
    ...
  ]
}
```

#### 6. **Get Collection by Class**
```
GET /api/dashboard/by-class
Authorization: Bearer {admin-token}

Response:
{
  "success": true,
  "data": [
    {
      "className": "Class 10A",
      "classCode": "10A",
      "studentCount": 40,
      "totalFeesDue": 800000,
      "totalCollected": 720000,
      "totalPending": 80000,
      "collectionPercentage": "90.00"
    },
    ...
  ]
}
```

#### 7. **Get Outstanding Balances**
```
GET /api/dashboard/outstanding?limit=20
Authorization: Bearer {admin-token}

Response:
{
  "success": true,
  "data": [
    {
      "studentName": "Arun Patel",
      "studentId": "STU001",
      "className": "Class 10A",
      "pendingAmount": 50000,
      "invoiceCount": 2,
      "studentEmail": "arun@example.com",
      "studentPhone": "9876543210"
    },
    ...
  ]
}
```

#### 8. **Get Dashboard Summary** (Aggregated)
```
GET /api/dashboard/summary
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "metrics": { ... },
    "monthlyTrend": [ ... ],
    "paymentMethods": [ ... ],
    "recentTransactions": [ ... ],
    "statusDistribution": [ ... ],
    "classMetrics": [ ... ],
    "overdueCount": 5,
    "timestamp": "2026-04-29T10:00:00Z"
  }
}
```

---

## 🚀 Implementation Steps

### Step 1: Database Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already done)
npm install

# Configure environment variables
echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/fee_management" >> .env

# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### Step 2: Register Dashboard Routes

Update your main server file:

```javascript
// backend/server.js or backend/src/server.ts
import dashboardRoutes from './routes/dashboardRoutes';

// Add dashboard routes
app.use('/api/dashboard', dashboardRoutes);
```

### Step 3: Test Endpoints

```bash
# Start backend server
npm run dev

# Test dashboard stats endpoint
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/dashboard/stats

# Test monthly trend
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/dashboard/monthly?year=2026
```

### Step 4: Frontend Integration

Update your frontend dashboard component:

```javascript
// frontend/src/services/dashboardService.js
export const getDashboardData = async () => {
  try {
    const response = await api.get('/dashboard/summary');
    return response.data.data;
  } catch (error) {
    console.error('Dashboard data error:', error);
  }
};

export const getMonthlyTrend = async (year) => {
  try {
    const response = await api.get(`/dashboard/monthly?year=${year}`);
    return response.data.data;
  } catch (error) {
    console.error('Monthly trend error:', error);
  }
};
```

---

## 📈 Query Performance

### Recommended Indexes

```sql
-- Execute these indexes for optimal performance
CREATE INDEX idx_payment_created ON "Payment"("createdAt");
CREATE INDEX idx_payment_method ON "Payment"("paymentMethod");
CREATE INDEX idx_payment_feepayment ON "Payment"("feePaymentId", "createdAt");
CREATE INDEX idx_feepayment_status ON "FeePayment"("paymentStatus");
CREATE INDEX idx_feepayment_duedate ON "FeePayment"("dueDate");
CREATE INDEX idx_feepayment_student ON "FeePayment"("studentId", "paymentStatus");
CREATE INDEX idx_student_status ON "Student"("status");
CREATE INDEX idx_student_class ON "Student"("classId", "status");
CREATE INDEX idx_refund_status ON "RefundRequest"("status");
CREATE INDEX idx_refund_date ON "RefundRequest"("requestDate");
```

### Query Optimization Tips

1. **Use Aggregated Endpoint**: Use `/api/dashboard/summary` for initial load to reduce multiple API calls
2. **Pagination**: Add pagination for large result sets
3. **Caching**: Implement Redis caching for frequently accessed metrics
4. **Materialized Views**: Create materialized views for complex queries

---

## 🔒 Security

### Authentication & Authorization

```javascript
// All dashboard endpoints require authentication
router.use(authenticateToken); // JWT token validation

// Role-based access control
router.get('/by-class', 
  authorizeRole('ADMIN', 'ACCOUNTANT'),
  dashboardController.getCollectionByClass
);
```

### Token Requirements

Include JWT token in request headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📝 SQL Queries Reference

All raw SQL queries are available in:
- `backend/database/dashboard-queries.sql`

Key query categories:
1. **Total Metrics** (Queries 1.1-1.5)
2. **Monthly Trends** (Queries 2.1-2.3)
3. **Payment Distribution** (Queries 3.1-3.3)
4. **Recent Transactions** (Queries 4.1-4.3)
5. **Student Analysis** (Queries 5.1-5.2)
6. **Invoice Analysis** (Queries 6.1-6.2)
7. **Refund Analysis** (Queries 7.1-7.2)
8. **Analytics** (Queries 8.1-8.4)

---

## 🧪 Testing

### Sample Data

```javascript
// Insert test student
const student = await prisma.student.create({
  data: {
    studentId: 'STU001',
    firstName: 'Arun',
    lastName: 'Patel',
    classId: 'class001',
    courseId: 'course001',
    enrollmentDate: new Date(),
    status: 'ACTIVE'
  }
});

// Insert test fee payment
const feePayment = await prisma.feePayment.create({
  data: {
    studentId: student.id,
    feeStructureId: 'feestruct001',
    totalAmount: new Decimal('50000'),
    amountPending: new Decimal('50000'),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    paymentStatus: 'PENDING'
  }
});

// Insert test payment
await prisma.payment.create({
  data: {
    feePaymentId: feePayment.id,
    amount: new Decimal('50000'),
    paymentMethod: 'CASH'
  }
});
```

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Dashboard specific tests
npm run test:dashboard
```

---

## 📊 Dashboard Components Mapping

| Component | Endpoint | Query |
|-----------|----------|-------|
| Metric Cards | `/api/dashboard/stats` | Query 1.5 |
| Bar Chart | `/api/dashboard/monthly` | Query 2.1 |
| Donut Chart | `/api/dashboard/payment-methods` | Query 3.1 |
| Transactions Table | `/api/dashboard/recent-transactions` | Query 4.1 |
| Status Distribution | `/api/dashboard/status-distribution` | Query 3.2 |
| Class Comparison | `/api/dashboard/by-class` | Query 8.1 |
| Outstanding List | `/api/dashboard/outstanding` | Query 5.1 |
| Overdue List | `/api/dashboard/overdue` | Query 6.1 |

---

## 🐛 Troubleshooting

### Common Issues

**Q: Queries are slow**
- A: Run `VACUUM ANALYZE` on tables and ensure indexes are created

**Q: NULL values in aggregations**
- A: Use `COALESCE()` to handle NULL amounts

**Q: Foreign key constraint errors**
- A: Verify referential integrity with data existence checks

**Q: Connection timeout**
- A: Check `DATABASE_URL` in `.env` and database connectivity

---

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [SQL Aggregation Functions](https://www.postgresql.org/docs/current/functions-aggregate.html)

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review SQL queries in `dashboard-queries.sql`
3. Check service implementation in `dashboardService.ts`
4. Review API routes in `dashboardRoutes.ts`

---

## 📄 Files Created

```
backend/
├── database/
│   ├── dashboard-queries.sql          # All SQL queries
│   └── DATABASE_SCHEMA_GUIDE.md       # Detailed schema documentation
├── src/
│   ├── services/
│   │   └── dashboardService.ts        # Service layer implementation
│   ├── controllers/
│   │   └── dashboardController.ts     # API controllers
│   └── routes/
│       └── dashboardRoutes.ts         # API route definitions
└── (other existing files)
```

---

**Version**: 1.0  
**Last Updated**: 2026-04-29  
**Status**: Production Ready ✅

