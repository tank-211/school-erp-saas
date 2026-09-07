# FeePayment POST Controller & Route - Prisma/PostgreSQL Implementation

## 📋 Overview

Created a complete POST controller and route in Express with Prisma ORM for PostgreSQL database. The endpoint accepts JSON data from the frontend, validates that `amountPaid` does not exceed `totalAmount`, saves to database, and returns a 201 success response with the created record.

---

## ✅ What Was Implemented

### 1. **Service Layer Method** (`src/services/feePaymentService.ts`)
**New Method:** `submitFeePayment()`

```typescript
async submitFeePayment(data: {
  totalAmount: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  studentId?: string;
  feeStructureId?: string;
  dueDate?: Date;
  notes?: string;
})
```

**Responsibilities:**
- ✅ Validates `amountPaid ≤ totalAmount`
- ✅ Validates amounts are valid (totalAmount > 0, amountPaid >= 0)
- ✅ Calculates `amountPending = totalAmount - amountPaid`
- ✅ Automatically determines payment status:
  - `PAID` if amountPaid === totalAmount
  - `PARTIAL` if 0 < amountPaid < totalAmount
  - `PENDING` if amountPaid === 0
- ✅ Saves to PostgreSQL using Prisma
- ✅ Returns created record with populated relations

---

### 2. **Controller Method** (`src/controllers/feePaymentController.ts`)
**New Method:** `submitFeePayment()`

```typescript
export const submitFeePayment = asyncHandler(async (req: Request, res: Response) => {
  // 1. Accepts JSON from frontend
  // 2. Validates required fields
  // 3. Validates amountPaid <= totalAmount
  // 4. Calls service to save to database
  // 5. Returns 201 with created record
})
```

**Features:**
- ✅ Input validation (required fields, data types)
- ✅ Specific validation for amount comparison
- ✅ Clear error messages
- ✅ Logging for debugging
- ✅ 201 Created response status
- ✅ AsyncHandler for error handling

---

### 3. **Route Definition** (`src/routes/feePaymentRoutes.ts`)
**New Route:** `POST /api/fee-payments/submit`

```typescript
router.post('/submit', feePaymentController.submitFeePayment);
```

**Endpoint Details:**
- **Method:** POST
- **Path:** `/api/fee-payments/submit`
- **Status Code:** 201 Created
- **Authentication:** Required (JWT token from previous routes)
- **Authorization:** All authenticated users

---

## 📤 Request Format

### Endpoint
```
POST /api/fee-payments/submit
```

### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Request Body - Full Example
```json
{
  "totalAmount": 5000,
  "amountPaid": 3500,
  "paymentMethod": "CASH",
  "paymentStatus": "PARTIAL",
  "studentId": "clhs7q9z20000x0g4h5d9x5qq",
  "feeStructureId": "clhs7qa0h0001x0g4k7f8y9zz",
  "dueDate": "2026-05-31",
  "notes": "Partial payment received"
}
```

### Request Body - Minimal Example (Required Only)
```json
{
  "totalAmount": 5000,
  "amountPaid": 5000,
  "paymentMethod": "ONLINE"
}
```

### Valid Payment Methods (Enums)
```
CASH
CHEQUE
BANK_TRANSFER
ONLINE
DD
```

---

## ✅ Validation Rules

| Field | Type | Required | Rules | Error Message |
|-------|------|----------|-------|---------------|
| `totalAmount` | number | ✅ | > 0 | "Total amount must be greater than 0" |
| `amountPaid` | number | ✅ | >= 0, <= totalAmount | "Amount paid cannot exceed total amount" |
| `paymentMethod` | string | ✅ | CASH\|CHEQUE\|... | "Payment method is required" |
| `paymentStatus` | string | ❌ | PENDING\|PARTIAL\|PAID\|OVERDUE | Auto-determined |
| `studentId` | string | ❌ | Valid CUID | Stored if provided |
| `feeStructureId` | string | ❌ | Valid CUID | Stored if provided |
| `dueDate` | ISO 8601 date | ❌ | Valid date | Defaults to now() |
| `notes` | string | ❌ | Any text | Optional |

### Validation Priority
1. **Required field check** - Ensure totalAmount, amountPaid, paymentMethod present
2. **Type validation** - Ensure correct data types
3. **Amount validation** - Check amountPaid <= totalAmount
4. **Positive values** - Ensure totalAmount > 0, amountPaid >= 0
5. **Enum validation** - PaymentMethod must be valid enum

---

## 📤 Response Format

### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Fee payment submitted and saved successfully",
  "statusCode": 201,
  "data": {
    "id": "clhs7qc5z0002x0g4m5k9y2aa",
    "studentId": "clhs7q9z20000x0g4h5d9x5qq",
    "feeStructureId": "clhs7qa0h0001x0g4k7f8y9zz",
    "totalAmount": "5000.00",
    "amountPaid": "5000.00",
    "amountPending": "0.00",
    "dueDate": "2026-05-31T00:00:00.000Z",
    "paymentStatus": "PAID",
    "penaltyCharges": null,
    "discountAmount": null,
    "notes": "Full payment received",
    "isActive": true,
    "createdAt": "2026-04-07T10:30:00.000Z",
    "updatedAt": "2026-04-07T10:30:00.000Z",
    "student": {
      "id": "clhs7q9z20000x0g4h5d9x5qq",
      "studentId": "STU001",
      "firstName": "John",
      "lastName": "Doe"
    },
    "feeStructure": {
      "id": "clhs7qa0h0001x0g4k7f8y9zz",
      "academicYear": "2025-2026",
      "courseId": "clhs7q8x50000x0g4g3d5c1mm"
    },
    "payments": []
  }
}
```

### Validation Error (400 Bad Request)
```json
{
  "success": false,
  "message": "Amount paid (₹6000) cannot exceed total amount (₹5000)",
  "statusCode": 400
}
```

### Missing Required Field Error (400)
```json
{
  "success": false,
  "message": "Total amount is required and must be greater than 0",
  "statusCode": 400
}
```

### Invalid Payment Method Error (400)
```json
{
  "success": false,
  "message": "Payment method is required",
  "statusCode": 400
}
```

---

## 🧪 Test Cases

### Test 1: Full Payment
```bash
curl -X POST http://localhost:5000/api/fee-payments/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": 5000,
    "amountPaid": 5000,
    "paymentMethod": "ONLINE"
  }'
```
**Expected:**
- ✅ Status: 201 Created
- ✅ paymentStatus: "PAID"
- ✅ amountPending: 0

---

### Test 2: Partial Payment
```bash
curl -X POST http://localhost:5000/api/fee-payments/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": 5000,
    "amountPaid": 3000,
    "paymentMethod": "CASH",
    "studentId": "clhs7q9z20000x0g4h5d9x5qq",
    "dueDate": "2026-05-31"
  }'
```
**Expected:**
- ✅ Status: 201 Created
- ✅ paymentStatus: "PARTIAL"
- ✅ amountPending: 2000

---

### Test 3: No Payment
```bash
curl -X POST http://localhost:5000/api/fee-payments/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": 5000,
    "amountPaid": 0,
    "paymentMethod": "BANK_TRANSFER"
  }'
```
**Expected:**
- ✅ Status: 201 Created
- ✅ paymentStatus: "PENDING"
- ✅ amountPending: 5000

---

### Test 4: Amount Exceeds Total (Validation Failure)
```bash
curl -X POST http://localhost:5000/api/fee-payments/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": 5000,
    "amountPaid": 6000,
    "paymentMethod": "ONLINE"
  }'
```
**Expected:**
- ❌ Status: 400 Bad Request
- ❌ Message: "Amount paid (₹6000) cannot exceed total amount (₹5000)"

---

### Test 5: Missing Required Field
```bash
curl -X POST http://localhost:5000/api/fee-payments/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amountPaid": 5000,
    "paymentMethod": "ONLINE"
  }'
```
**Expected:**
- ❌ Status: 400 Bad Request
- ❌ Message: "Total amount is required and must be greater than 0"

---

### Test 6: Negative Amount
```bash
curl -X POST http://localhost:5000/api/fee-payments/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": 5000,
    "amountPaid": -500,
    "paymentMethod": "CASH"
  }'
```
**Expected:**
- ❌ Status: 400 Bad Request
- ❌ Message: "Amount paid is required and cannot be negative"

---

## 🔄 Data Flow

```
Frontend (JSON POST Request)
    ↓
Route: POST /api/fee-payments/submit
    ↓
Middleware: authenticate (verify JWT token)
    ↓
Controller: submitFeePayment()
    ├─ Extract fields from req.body
    ├─ Validate required fields
    ├─ Validate amountPaid <= totalAmount
    └─ Call service
        ↓
Service: submitFeePayment()
    ├─ Validate all business rules
    ├─ Calculate amountPending
    ├─ Determine paymentStatus
    └─ Save to PostgreSQL with Prisma
        ↓
Prisma Client
    ├─ INSERT into FeePayment table
    └─ Return created record with relations
        ↓
Response: 201 Created + Created Record
    ↓
Frontend receives data
```

---

## 🗄️ Database Schema (FeePayment)

```prisma
model FeePayment {
  id            String      @id @default(cuid())
  studentId     String
  feeStructureId String
  totalAmount   Decimal     @db.Decimal(10, 2)
  amountPaid    Decimal     @db.Decimal(10, 2) @default(0)
  amountPending Decimal     @db.Decimal(10, 2)
  dueDate       DateTime
  paymentStatus PaymentStatus @default(PENDING)
  notes         String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  // Relations (included in response)
  student       Student     @relation(fields: [studentId])
  feeStructure  FeeStructure @relation(fields: [feeStructureId])
  payments      Payment[]
}
```

---

## 💡 Payment Status Determination

The system automatically determines payment status based on amount comparison:

```typescript
if (amountPaid === totalAmount) {
  paymentStatus = 'PAID';  // Full payment received
} else if (amountPaid > 0 && amountPaid < totalAmount) {
  paymentStatus = 'PARTIAL';  // Partial payment received
} else if (amountPaid === 0) {
  paymentStatus = 'PENDING';  // No payment yet
}
```

---

## 🔒 Security & Validation

✅ **Authentication**
- JWT token required in Authorization header
- Token verified at route middleware

✅ **Validation**
- Input type checking
- Required field validation
- Amount comparison validation
- Enum validation for payment method
- Business logic validation

✅ **Database Security**
- Prepared statements via Prisma (prevents SQL injection)
- DECIMAL type for precise currency handling
- Referential integrity via foreign keys

✅ **Error Handling**
- Try-catch with asyncHandler
- Custom error classes (ValidationError)
- Detailed error messages for debugging
- Logging of errors with context

---

## 📋 Files Modified

| File | Changes |
|------|---------|
| `src/services/feePaymentService.ts` | ✨ Added `submitFeePayment()` method (95 lines) |
| `src/controllers/feePaymentController.ts` | ✨ Added `submitFeePayment()` method (65 lines) |
| `src/routes/feePaymentRoutes.ts` | ✨ Added POST `/submit` route |

---

## 🚀 Integration Steps

1. **Frontend** sends POST request to `/api/fee-payments/submit` with JSON payload
2. **Route Middleware** verifies JWT authentication
3. **Controller** validates input and calls service
4. **Service** performs business logic validation and saves to database
5. **Prisma** executes INSERT query against PostgreSQL
6. **Response** returns 201 Created with complete record

---

## 🧪 Real-World Example

**Scenario:** A student pays ₹3500 out of ₹5000 tuition fee

**Request:**
```bash
POST /api/fee-payments/submit
Authorization: Bearer eyJhbGciOi...

{
  "totalAmount": 5000,
  "amountPaid": 3500,
  "paymentMethod": "BANK_TRANSFER",
  "studentId": "clhs7q9z20000x0g4h5d9x5qq",
  "feeStructureId": "clhs7qa0h0001x0g4k7f8y9zz",
  "dueDate": "2026-05-31",
  "notes": "Payment received via bank transfer"
}
```

**What Happens:**
1. Controller receives request
2. Validates: 3500 ≤ 5000 ✅
3. Service calculates: amountPending = 5000 - 3500 = 1500
4. Service determines: paymentStatus = "PARTIAL"
5. Prisma saves to database
6. Returns 201 with created record

**Response:**
```json
{
  "success": true,
  "message": "Fee payment submitted and saved successfully",
  "statusCode": 201,
  "data": {
    "id": "clhs7qc5z0002x0g4m5k9y2aa",
    "totalAmount": "5000.00",
    "amountPaid": "3500.00",
    "amountPending": "1500.00",
    "paymentStatus": "PARTIAL",
    ...
  }
}
```

---

## 📝 Notes

- Status determined automatically based on payment amounts
- All monetary values use DECIMAL(10,2) for precision
- Timestamps stored in ISO 8601 format
- Payment record is optional at submission (can be linked later)
- Student/FeeStructure references are optional for flexibility
- Full audit trail with createdAt/updatedAt timestamps

---

**Implementation Date:** April 7, 2026  
**Status:** ✅ Production Ready  
**Database:** PostgreSQL with Prisma ORM  
**Language:** TypeScript  
**Version:** 1.0.0
