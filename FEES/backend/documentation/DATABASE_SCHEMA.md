# Database Schema & Models Documentation

## Overview
This document outlines the MongoDB schema design for the ERP Fee Management System.

## Collections & Schemas

### 1. User Collection

**Purpose:** Store admin, accountant, and staff accounts

```javascript
{
  _id: ObjectId,
  name: String,              // Full name
  email: String,             // Unique email
  phone: String,             // Unique phone number
  password: String,          // Hashed password
  role: String,              // 'admin' | 'accountant' | 'staff'
  department: String,        // 'accounts' | 'administration' | 'support'
  isActive: Boolean,         // Default: true
  lastLogin: Date,           // Last login timestamp
  refreshTokens: [{
    token: String,
    createdAt: Date          // Expires in 30 days
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ email: 1 }` (unique)
- `{ phone: 1 }` (unique)

### 2. Student Collection

**Purpose:** Store student information

```javascript
{
  _id: ObjectId,
  studentId: String,         // Unique student ID
  firstName: String,
  lastName: String,
  email: String,             // Optional
  phone: String,             // Optional
  dateOfBirth: Date,         // Optional
  gender: String,            // 'Male' | 'Female' | 'Other'
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  course: ObjectId,          // Reference to Course
  class: ObjectId,           // Reference to Class
  parentInfo: {
    parentName: String,
    parentEmail: String,
    parentPhone: String,
    relationship: String
  },
  enrollmentDate: Date,      // Default: current date
  status: String,            // 'active'|'inactive'|'graduated'|'dropped'
  isVerified: Boolean,       // Default: false
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ studentId: 1 }` (unique)
- `{ email: 1 }`
- `{ "address.city": 1 }`
- `{ course: 1 }`
- `{ status: 1 }`

---

### 3. Course Collection

**Purpose:** Store course information

```javascript
{
  _id: ObjectId,
  name: String,              // Unique course name
  code: String,              // Unique course code (uppercase)
  description: String,       // Optional
  duration: {
    value: Number,           // e.g., 4
    unit: String            // 'months' | 'years'
  },
  isActive: Boolean,         // Default: true
  createdAt: Date,
  updatedAt: Date
}
```

**Example Courses:**
- Name: "Bachelor of Computer Science"
- Code: "BCS"
- Duration: 4 years

---

### 4. Class Collection

**Purpose:** Store class/section information

```javascript
{
  _id: ObjectId,
  name: String,              // e.g., "BCS-101" or "Batch 2024"
  code: String,              // e.g., "BCS101" (uppercase)
  course: ObjectId,          // Reference to Course (required)
  semester: Number,          // 1-8 (for 4-year course)
  capacity: Number,          // Max students (default: 50)
  isActive: Boolean,         // Default: true
  createdAt: Date,
  updatedAt: Date
}
```

**Example:**
- Name: "BCS-2024-S1"
- Course: Reference to "CSE" course
- Semester: 1

---

### 5. FeeType Collection

**Purpose:** Define types of fees that can be charged

```javascript
{
  _id: ObjectId,
  name: String,              // Type of fee
  description: String,       // Short description
  amount: Number,            // Base amount
  isActive: Boolean,         // Default: true
  createdAt: Date,
  updatedAt: Date
}
```

**Standard Fee Types:**
- Tuition
- Lab Fee
- Library Fee
- Sports Fee
- Transport Fee
- Examination Fee
- Hostel Fee
- Other

---

### 6. FeeStructure Collection

**Purpose:** Define fee structure per course/class/semester

```javascript
{
  _id: ObjectId,
  course: ObjectId,          // Reference to Course (required)
  class: ObjectId,           // Reference to Class (optional)
  feeComponents: [{
    feeType: ObjectId,       // Reference to FeeType (required)
    amount: Number           // Specific amount for this course
  }],
  totalFee: Number,          // Sum of all components
  paymentTerms: String,      // 'monthly'|'quarterly'|'semester'|'annual'
  dueDate: Date,             // Payment due date
  gracePeriodDays: Number,   // Days after which overdue (default: 15)
  penaltyPerDay: Number,     // Penalty amount per day (default: 0)
  isActive: Boolean,         // Default: true
  academicYear: String,      // e.g., "2024-2025"
  createdAt: Date,
  updatedAt: Date
}
```

**Example:**
```json
{
  "course": "ObjectId(course_id)",
  "class": "ObjectId(class_id)",
  "feeComponents": [
    { "feeType": "ObjectId(tuition)", "amount": 40000 },
    { "feeType": "ObjectId(lab)", "amount": 5000 },
    { "feeType": "ObjectId(library)", "amount": 1000 }
  ],
  "totalFee": 46000,
  "paymentTerms": "semester",
  "dueDate": "2024-12-31",
  "gracePeriodDays": 15,
  "penaltyPerDay": 100,
  "academicYear": "2024-2025"
}
```

---

### 7. FeePayment Collection

**Purpose:** Track student fee payments

```javascript
{
  _id: ObjectId,
  student: ObjectId,         // Reference to Student (required)
  feeStructure: ObjectId,    // Reference to FeeStructure (required)
  totalAmount: Number,       // Total amount due
  amountPaid: Number,        // Total paid so far (default: 0)
  amountPending: Number,     // Pending amount
  dueDate: Date,             // Due date
  paymentStatus: String,     // 'pending'|'partial'|'paid'|'overdue'|'cancelled'
  payments: [{
    amount: Number,
    paymentDate: Date,       // Default: current date
    paymentMethod: String,   // 'cash'|'cheque'|'online'|'bank_transfer'
    transactionId: String,   // Optional: transaction reference
    receivedBy: ObjectId,    // Reference to User who received payment
    notes: String            // Optional notes
  }],
  penaltyCharges: Number,    // Default: 0
  discountAmount: Number,    // Default: 0
  discountReason: String,    // Optional
  approvedBy: ObjectId,      // Reference to User (if discount applied)
  notes: String,             // Additional notes
  isActive: Boolean,         // Default: true
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ student: 1 }`
- `{ paymentStatus: 1 }`
- `{ dueDate: 1 }`
- `{ student: 1, paymentStatus: 1 }`

**Payment Status Rules:**
- **pending**: amountPaid == 0
- **partial**: amountPaid > 0 && amountPaid < totalAmount
- **paid**: amountPaid >= totalAmount
- **overdue**: dueDate + gracePeriodDays < today && status != 'paid'
- **cancelled**: Manually set

---

### 8. RefundRequest Collection

**Purpose:** Manage refund requests and approvals

```javascript
{
  _id: ObjectId,
  student: ObjectId,         // Reference to Student (required)
  feePayment: ObjectId,      // Reference to FeePayment (required)
  amount: Number,            // Refund amount (required)
  reason: String,            // 'withdrawal'|'course_cancellation'
                             // |'overpayment'|'scholarship'|'other'
  description: String,       // Detailed description
  requestDate: Date,         // Default: current date
  status: String,            // 'pending'|'approved'|'rejected'|'processed'
  approvedBy: ObjectId,      // Reference to User (who approved)
  approvalDate: Date,        // When approved
  rejectionReason: String,   // If rejected
  refundMethod: String,      // 'bank_transfer'|'cheque'|'cash'
  bankDetails: {
    accountHolder: String,
    accountNumber: String,
    ifscCode: String
  },
  processedDate: Date,       // When refund was processed
  refundTransactionId: String, // Transaction ID after processing
  notes: String,             // Additional notes
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ student: 1 }`
- `{ status: 1 }`
- `{ requestDate: 1 }`

**Status Workflow:**
```
pending → approved → processed
             ↓
           rejected
```

---

## Relationships & Constraints

### Data Relationships
```
User (1) ──── (M) FeePayment (received payments)
        ──── (M) RefundRequest (approved refunds)

Student (1) ──── (M) FeePayment
         ──── (M) RefundRequest
         ── (1) Course
         ── (1) Class

Course (1) ──── (M) Class
       ──── (M) FeeStructure

Class (1) ──── (M) FeeStructure
      ──── (M) Student

FeeType (1) ──── (M) FeeStructure (in feeComponents)

FeeStructure (1) ──── (M) FeePayment

FeePayment (1) ──── (M) RefundRequest
```

### Data Validation Rules

1. **Student ID Uniqueness**: Must be unique across all students
2. **Email Uniqueness**: Must be unique for User and optional for Student
3. **Amount Validation**: All monetary amounts must be >= 0
4. **Payment Status**: Auto-calculated based on amountPaid vs totalAmount
5. **Refund Amount**: Cannot exceed amountPaid on FeePayment
6. **Penalty Calculation**: Calculated based on grace period and penalty rate

---

## Aggregation Pipeline Examples

### Get Total Fees Collected
```javascript
db.FeePayment.aggregate([
  { $match: { paymentStatus: 'paid' } },
  { $group: { _id: null, total: { $sum: '$amountPaid' } } }
])
```

### Get Pending Payments per Student
```javascript
db.FeePayment.aggregate([
  { $match: { paymentStatus: { $in: ['pending', 'partial'] } } },
  {
    $group: {
      _id: '$student',
      totalPending: { $sum: '$amountPending' },
      count: { $sum: 1 }
    }
  },
  { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 'student' } }
])
```

### Monthly Collection Stats
```javascript
db.FeePayment.aggregate([
  { $unwind: '$payments' },
  {
    $group: {
      _id: { $month: '$payments.paymentDate' },
      total: { $sum: '$payments.amount' },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
])
```

---

## Sample Queries

### Find overdue payments
```javascript
db.FeePayment.find({
  dueDate: { $lt: new Date('2024-04-14') },
  paymentStatus: { $ne: 'paid' }
})
```

### Get students by city
```javascript
db.Student.find({ 'address.city': 'Mumbai' })
```

### Find pending refund requests
```javascript
db.RefundRequest.find({ status: 'pending' })
  .populate('student')
  .populate('feePayment')
```

---

## Database Optimization Tips

1. **Indexing**: Already configured on frequently queried fields
2. **TTL Indexes**: RefreshTokens auto-expire after 30 days
3. **Aggregation**: Use aggregation pipeline for complex queries
4. **Pagination**: Always paginate list endpoints
5. **Caching**: Consider caching dashboard stats
6. **Connection Pooling**: Managed by Mongoose (default: 5 connections)

---

## Backup & Recovery

### MongoDB Backup
```bash
mongodump --uri "mongodb://admin:password@localhost:27017/fee-management?authSource=admin" --out ./backup

# With Docker
docker-compose exec mongodb mongodump --uri "mongodb://admin:password@localhost:27017/fee-management?authSource=admin" --out /data/backup
```

### MongoDB Restore
```bash
mongorestore --uri "mongodb://admin:password@localhost:27017/fee-management?authSource=admin" ./backup/fee-management

# With Docker
docker-compose exec mongodb mongorestore --uri "mongodb://admin:password@localhost:27017/fee-management?authSource=admin" /data/backup/fee-management
```
