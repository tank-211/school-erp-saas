-- ================================================================
-- FEE MANAGEMENT SYSTEM - POSTGRESQL DASHBOARD QUERIES
-- ================================================================
-- These queries power the Fees & Payments Dashboard
-- Aligned with Prisma Schema (PostgreSQL)
-- ================================================================

-- ================================================================
-- 1. TOTAL METRICS QUERIES
-- ================================================================

-- Query 1.1: Total Fees Collected (Sum of all paid amounts)
SELECT 
    COALESCE(SUM(amount), 0) as total_fees_collected
FROM "Payment"
WHERE "createdAt" >= CURRENT_DATE - INTERVAL '1 year'
AND EXISTS (
    SELECT 1 FROM "FeePayment" fp 
    WHERE fp."id" = "Payment"."feePaymentId" 
    AND fp."paymentStatus" IN ('PAID', 'PARTIAL')
);

-- Query 1.2: Pending Payments (Total amount pending across all students)
SELECT 
    COALESCE(SUM("amountPending"), 0) as pending_payments
FROM "FeePayment"
WHERE "paymentStatus" IN ('PENDING', 'PARTIAL', 'OVERDUE')
AND "isActive" = true;

-- Query 1.3: Overdue Payments (Fees where due date has passed and not fully paid)
SELECT 
    COALESCE(SUM("amountPending"), 0) as overdue_payments
FROM "FeePayment"
WHERE "paymentStatus" IN ('OVERDUE', 'PARTIAL')
AND "dueDate" < CURRENT_DATE
AND "amountPending" > 0
AND "isActive" = true;

-- Query 1.4: Total Refund Requests (By status for dashboard card)
SELECT 
    COALESCE(SUM("amount"), 0) as total_refunds
FROM "RefundRequest"
WHERE "status" IN ('PENDING', 'APPROVED');

-- Query 1.5: All Dashboard Metrics in One Query (OPTIMIZED)
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

-- ================================================================
-- 2. MONTHLY TREND QUERIES
-- ================================================================

-- Query 2.1: Monthly Fee Collection Trend (Bar Chart Data)
SELECT 
    DATE_TRUNC('month', "Payment"."createdAt")::DATE as collection_month,
    TO_CHAR(DATE_TRUNC('month', "Payment"."createdAt"), 'Mon') as month_name,
    COALESCE(SUM("Payment"."amount"), 0) as collected_amount,
    COUNT("Payment"."id") as transaction_count
FROM "Payment"
WHERE EXTRACT(YEAR FROM "Payment"."createdAt") = EXTRACT(YEAR FROM CURRENT_DATE)
    AND "Payment"."createdAt" >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', "Payment"."createdAt")
ORDER BY DATE_TRUNC('month', "Payment"."createdAt") ASC;

-- Query 2.2: Monthly Collection with Previous Year Comparison
SELECT 
    TO_CHAR(DATE_TRUNC('month', "Payment"."createdAt"), 'Mon') as month_name,
    EXTRACT(YEAR FROM "Payment"."createdAt")::INT as year,
    COALESCE(SUM("Payment"."amount"), 0) as collected_amount
FROM "Payment"
WHERE EXTRACT(YEAR FROM "Payment"."createdAt") IN (
    EXTRACT(YEAR FROM CURRENT_DATE),
    EXTRACT(YEAR FROM CURRENT_DATE) - 1
)
GROUP BY 
    DATE_TRUNC('month', "Payment"."createdAt"),
    EXTRACT(YEAR FROM "Payment"."createdAt")
ORDER BY 
    EXTRACT(YEAR FROM "Payment"."createdAt") DESC,
    DATE_TRUNC('month', "Payment"."createdAt") ASC;

-- Query 2.3: Monthly Breakdown by Payment Method
SELECT 
    DATE_TRUNC('month', "Payment"."createdAt")::DATE as collection_month,
    TO_CHAR(DATE_TRUNC('month', "Payment"."createdAt"), 'Mon') as month_name,
    "Payment"."paymentMethod",
    COALESCE(SUM("Payment"."amount"), 0) as collected_amount,
    COUNT("Payment"."id") as transaction_count
FROM "Payment"
WHERE EXTRACT(YEAR FROM "Payment"."createdAt") = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY 
    DATE_TRUNC('month', "Payment"."createdAt"),
    "Payment"."paymentMethod"
ORDER BY 
    DATE_TRUNC('month', "Payment"."createdAt") ASC,
    "Payment"."paymentMethod";

-- ================================================================
-- 3. PAYMENT METHOD DISTRIBUTION QUERIES
-- ================================================================

-- Query 3.1: Payment Method Distribution (Donut Chart Data)
SELECT 
    "Payment"."paymentMethod" as payment_method,
    COALESCE(SUM("Payment"."amount"), 0) as total_amount,
    COUNT("Payment"."id") as transaction_count,
    ROUND(
        (SUM("Payment"."amount") / 
         (SELECT SUM(amount) FROM "Payment" WHERE "createdAt" >= CURRENT_DATE - INTERVAL '1 year') 
        ) * 100, 2
    ) as percentage
FROM "Payment"
WHERE "createdAt" >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY "Payment"."paymentMethod"
ORDER BY total_amount DESC;

-- Query 3.2: Payment Status Distribution
SELECT 
    "FeePayment"."paymentStatus" as payment_status,
    COUNT("FeePayment"."id") as count,
    COALESCE(SUM("FeePayment"."totalAmount"), 0) as total_amount
FROM "FeePayment"
WHERE "isActive" = true
GROUP BY "FeePayment"."paymentStatus"
ORDER BY count DESC;

-- Query 3.3: Payment Method with Status Breakdown
SELECT 
    "Payment"."paymentMethod",
    "FeePayment"."paymentStatus",
    COUNT("Payment"."id") as transaction_count,
    COALESCE(SUM("Payment"."amount"), 0) as total_amount
FROM "Payment"
JOIN "FeePayment" ON "Payment"."feePaymentId" = "FeePayment"."id"
WHERE "Payment"."createdAt" >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY 
    "Payment"."paymentMethod",
    "FeePayment"."paymentStatus"
ORDER BY 
    "Payment"."paymentMethod",
    "FeePayment"."paymentStatus";

-- ================================================================
-- 4. RECENT TRANSACTIONS QUERIES
-- ================================================================

-- Query 4.1: Recent Transactions (Last 10 - for dashboard table)
SELECT 
    s."firstName" || ' ' || s."lastName" as student_name,
    s."studentId" as student_id,
    fp."id" as invoice_id,
    c."name" as class_name,
    p."amount" as amount,
    p."paymentMethod" as payment_method,
    fp."paymentStatus" as status,
    p."createdAt" as transaction_date,
    p."transactionId" as transaction_id
FROM "Payment" p
JOIN "FeePayment" fp ON p."feePaymentId" = fp."id"
JOIN "Student" s ON fp."studentId" = s."id"
JOIN "Class" c ON s."classId" = c."id"
ORDER BY p."createdAt" DESC
LIMIT 10;

-- Query 4.2: Recent Transactions with Student Phone (Enhanced)
SELECT 
    s."firstName" || ' ' || s."lastName" as student_name,
    s."studentId",
    s."phone",
    fp."id" as invoice_id,
    c."name" as class_name,
    p."amount",
    p."paymentMethod",
    fp."paymentStatus",
    p."createdAt" as transaction_date,
    CASE 
        WHEN fp."paymentStatus" = 'PAID' THEN 'Completed'
        WHEN fp."paymentStatus" = 'PENDING' THEN 'Not Started'
        WHEN fp."paymentStatus" = 'PARTIAL' THEN 'In Progress'
        WHEN fp."paymentStatus" = 'OVERDUE' THEN 'Overdue'
    END as status_label
FROM "Payment" p
JOIN "FeePayment" fp ON p."feePaymentId" = fp."id"
JOIN "Student" s ON fp."studentId" = s."id"
JOIN "Class" c ON s."classId" = c."id"
ORDER BY p."createdAt" DESC
LIMIT 10;

-- Query 4.3: Recent Transactions by Class (Group by Class)
SELECT 
    c."name" as class_name,
    COUNT(p."id") as transaction_count,
    COALESCE(SUM(p."amount"), 0) as total_collected,
    MAX(p."createdAt") as last_transaction_date
FROM "Payment" p
JOIN "FeePayment" fp ON p."feePaymentId" = fp."id"
JOIN "Student" s ON fp."studentId" = s."id"
JOIN "Class" c ON s."classId" = c."id"
WHERE p."createdAt" >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c."id", c."name"
ORDER BY total_collected DESC;

-- ================================================================
-- 5. STUDENT-SPECIFIC QUERIES
-- ================================================================

-- Query 5.1: Outstanding Balance by Student
SELECT 
    s."firstName" || ' ' || s."lastName" as student_name,
    s."studentId",
    c."name" as class_name,
    COALESCE(SUM(fp."amountPending"), 0) as pending_amount,
    COALESCE(SUM(fp."totalAmount"), 0) as total_fees,
    COALESCE(SUM(fp."amountPaid"), 0) as paid_amount,
    COUNT(fp."id") as invoice_count
FROM "Student" s
LEFT JOIN "FeePayment" fp ON s."id" = fp."studentId"
LEFT JOIN "Class" c ON s."classId" = c."id"
WHERE s."status" = 'ACTIVE'
    AND fp."isActive" = true
GROUP BY s."id", c."id"
HAVING COALESCE(SUM(fp."amountPending"), 0) > 0
ORDER BY pending_amount DESC
LIMIT 20;

-- Query 5.2: Students with No Recent Payments (More than 30 days)
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

-- ================================================================
-- 6. INVOICE/FEE PAYMENT QUERIES
-- ================================================================

-- Query 6.1: Outstanding Invoices (Not fully paid)
SELECT 
    fp."id" as invoice_id,
    s."firstName" || ' ' || s."lastName" as student_name,
    s."studentId",
    c."name" as class_name,
    fs."name" as fee_type,
    fp."totalAmount",
    fp."amountPaid",
    fp."amountPending",
    fp."dueDate",
    fp."paymentStatus",
    CASE 
        WHEN fp."dueDate" < CURRENT_DATE AND fp."paymentStatus" != 'PAID' THEN 'OVERDUE'
        ELSE 'DUE'
    END as urgency
FROM "FeePayment" fp
JOIN "Student" s ON fp."studentId" = s."id"
JOIN "Class" c ON s."classId" = c."id"
JOIN "FeeStructure" fs ON fp."feeStructureId" = fs."id"
WHERE fp."paymentStatus" IN ('PENDING', 'PARTIAL', 'OVERDUE')
    AND fp."isActive" = true
ORDER BY 
    CASE 
        WHEN fp."dueDate" < CURRENT_DATE THEN 0
        ELSE 1
    END,
    fp."dueDate" ASC;

-- Query 6.2: Invoices Due This Month
SELECT 
    fp."id",
    s."firstName" || ' ' || s."lastName" as student_name,
    s."studentId",
    fp."totalAmount",
    fp."amountPending",
    fp."dueDate",
    EXTRACT(DAY FROM fp."dueDate" - CURRENT_DATE) as days_until_due
FROM "FeePayment" fp
JOIN "Student" s ON fp."studentId" = s."id"
WHERE EXTRACT(MONTH FROM fp."dueDate") = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM fp."dueDate") = EXTRACT(YEAR FROM CURRENT_DATE)
    AND fp."paymentStatus" IN ('PENDING', 'PARTIAL')
    AND fp."isActive" = true
ORDER BY fp."dueDate" ASC;

-- ================================================================
-- 7. REFUND QUERIES
-- ================================================================

-- Query 7.1: Pending Refunds
SELECT 
    rr."id" as refund_id,
    s."firstName" || ' ' || s."lastName" as student_name,
    s."studentId",
    rr."amount",
    rr."reason",
    rr."status",
    rr."requestDate",
    rr."refundMethod"
FROM "RefundRequest" rr
JOIN "Student" s ON rr."studentId" = s."id"
WHERE rr."status" IN ('PENDING', 'APPROVED')
ORDER BY rr."requestDate" DESC;

-- Query 7.2: Refund Statistics
SELECT 
    "status",
    COUNT(*) as refund_count,
    COALESCE(SUM("amount"), 0) as total_amount,
    AVG("amount") as avg_amount
FROM "RefundRequest"
GROUP BY "status"
ORDER BY total_amount DESC;

-- ================================================================
-- 8. ANALYTICAL QUERIES
-- ================================================================

-- Query 8.1: Collection Rate by Class
SELECT 
    c."name" as class_name,
    COUNT(DISTINCT s."id") as student_count,
    COALESCE(SUM(fp."totalAmount"), 0) as total_fees_due,
    COALESCE(SUM(fp."amountPaid"), 0) as total_collected,
    COALESCE(SUM(fp."amountPending"), 0) as total_pending,
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
WHERE s."status" = 'ACTIVE' AND fp."isActive" = true
GROUP BY c."id", c."name"
ORDER BY collection_percentage DESC;

-- Query 8.2: Collection Trend - Daily Average
SELECT 
    DATE(p."createdAt") as transaction_date,
    COUNT(p."id") as transaction_count,
    COALESCE(SUM(p."amount"), 0) as daily_collection,
    COALESCE(AVG(p."amount"), 0) as avg_transaction_amount
FROM "Payment" p
WHERE p."createdAt" >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(p."createdAt")
ORDER BY DATE(p."createdAt") DESC;

-- Query 8.3: Fee Collection vs Due Analysis
SELECT 
    fp."paymentStatus",
    COUNT(*) as invoice_count,
    COALESCE(SUM(fp."totalAmount"), 0) as total_due,
    COALESCE(SUM(fp."amountPaid"), 0) as amount_collected,
    COALESCE(SUM(fp."amountPending"), 0) as amount_pending,
    COALESCE(AVG(fp."totalAmount"), 0) as avg_fee_amount
FROM "FeePayment" fp
WHERE fp."isActive" = true
GROUP BY fp."paymentStatus"
ORDER BY invoice_count DESC;

-- Query 8.4: Payment Processing Efficiency
SELECT 
    p."paymentMethod",
    COUNT(p."id") as transaction_count,
    COALESCE(SUM(p."amount"), 0) as total_amount,
    COALESCE(AVG(p."amount"), 0) as avg_amount,
    COALESCE(MIN(p."amount"), 0) as min_amount,
    COALESCE(MAX(p."amount"), 0) as max_amount
FROM "Payment" p
WHERE p."createdAt" >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY p."paymentMethod"
ORDER BY total_amount DESC;

-- ================================================================
-- 9. VIEWS FOR DASHBOARD (OPTIONAL - For performance)
-- ================================================================

-- View 9.1: Dashboard Summary View
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT 
    (SELECT COALESCE(SUM(amount), 0) FROM "Payment" WHERE "createdAt" >= CURRENT_DATE - INTERVAL '1 year') as total_collected,
    (SELECT COALESCE(SUM("amountPending"), 0) FROM "FeePayment" WHERE "paymentStatus" IN ('PENDING', 'PARTIAL', 'OVERDUE') AND "isActive" = true) as pending_payments,
    (SELECT COALESCE(SUM("amountPending"), 0) FROM "FeePayment" WHERE "paymentStatus" IN ('OVERDUE', 'PARTIAL') AND "dueDate" < CURRENT_DATE AND "amountPending" > 0) as overdue_amount,
    (SELECT COALESCE(SUM("amount"), 0) FROM "RefundRequest" WHERE "status" IN ('PENDING', 'APPROVED')) as refund_requests;

-- View 9.2: Recent Transactions View
CREATE OR REPLACE VIEW v_recent_transactions AS
SELECT 
    s."firstName" || ' ' || s."lastName" as student_name,
    s."studentId",
    fp."id" as invoice_id,
    c."name" as class_name,
    p."amount",
    p."paymentMethod",
    fp."paymentStatus",
    p."createdAt" as transaction_date
FROM "Payment" p
JOIN "FeePayment" fp ON p."feePaymentId" = fp."id"
JOIN "Student" s ON fp."studentId" = s."id"
JOIN "Class" c ON s."classId" = c."id"
ORDER BY p."createdAt" DESC;

-- ================================================================
-- 10. INDEXES FOR PERFORMANCE
-- ================================================================

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_created ON "Payment"("createdAt");
CREATE INDEX IF NOT EXISTS idx_payment_method ON "Payment"("paymentMethod");
CREATE INDEX IF NOT EXISTS idx_feepayment_status ON "FeePayment"("paymentStatus");
CREATE INDEX IF NOT EXISTS idx_feepayment_duedate ON "FeePayment"("dueDate");
CREATE INDEX IF NOT EXISTS idx_student_status ON "Student"("status");
CREATE INDEX IF NOT EXISTS idx_refund_status ON "RefundRequest"("status");
CREATE INDEX IF NOT EXISTS idx_refund_date ON "RefundRequest"("requestDate");
