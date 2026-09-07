-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ACCOUNTANT', 'STAFF');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'GRADUATED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CHEQUE', 'BANK_TRANSFER', 'ONLINE', 'DD');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('BANK_TRANSFER', 'CHEQUE', 'CASH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "departmentName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "relationship" TEXT,
    "occupation" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "courseId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "enrollmentDate" TIMESTAMP(3) NOT NULL,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "durationValue" INTEGER,
    "durationUnit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "semester" INTEGER,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeStructure" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "totalFee" DECIMAL(10,2) NOT NULL,
    "paymentTerms" TEXT,
    "dueDate" TIMESTAMP(3),
    "gracePeriodDays" INTEGER DEFAULT 15,
    "penaltyPerDay" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeStructureComponent" (
    "id" TEXT NOT NULL,
    "feeStructureId" TEXT NOT NULL,
    "feeTypeId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeStructureComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePayment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "feeStructureId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountPending" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "penaltyCharges" DECIMAL(10,2) DEFAULT 0,
    "discountAmount" DECIMAL(10,2) DEFAULT 0,
    "discountReason" TEXT,
    "approvedBy" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "feePaymentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "transactionId" TEXT,
    "receivedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "feePaymentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvalDate" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "refundMethod" "RefundMethod",
    "bankAccountHolder" TEXT,
    "bankAccountNumber" TEXT,
    "ifscCode" TEXT,
    "processedDate" TIMESTAMP(3),
    "refundTransactionId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkUploadLog" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalRecords" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "failureCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "errorDetails" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkUploadLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_email_key" ON "Parent"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_phone_key" ON "Parent"("phone");

-- CreateIndex
CREATE INDEX "Parent_phone_idx" ON "Parent"("phone");

-- CreateIndex
CREATE INDEX "Parent_email_idx" ON "Parent"("email");

-- CreateIndex
CREATE INDEX "Parent_city_idx" ON "Parent"("city");

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentId_key" ON "Student"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE INDEX "Student_studentId_idx" ON "Student"("studentId");

-- CreateIndex
CREATE INDEX "Student_email_idx" ON "Student"("email");

-- CreateIndex
CREATE INDEX "Student_city_idx" ON "Student"("city");

-- CreateIndex
CREATE INDEX "Student_status_idx" ON "Student"("status");

-- CreateIndex
CREATE INDEX "Student_courseId_idx" ON "Student"("courseId");

-- CreateIndex
CREATE INDEX "Student_classId_idx" ON "Student"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_name_key" ON "Course"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");

-- CreateIndex
CREATE INDEX "Course_code_idx" ON "Course"("code");

-- CreateIndex
CREATE INDEX "Course_isActive_idx" ON "Course"("isActive");

-- CreateIndex
CREATE INDEX "Class_courseId_idx" ON "Class"("courseId");

-- CreateIndex
CREATE INDEX "Class_isActive_idx" ON "Class"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Class_code_courseId_key" ON "Class"("code", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeType_name_key" ON "FeeType"("name");

-- CreateIndex
CREATE INDEX "FeeType_isActive_idx" ON "FeeType"("isActive");

-- CreateIndex
CREATE INDEX "FeeStructure_courseId_idx" ON "FeeStructure"("courseId");

-- CreateIndex
CREATE INDEX "FeeStructure_classId_idx" ON "FeeStructure"("classId");

-- CreateIndex
CREATE INDEX "FeeStructure_isActive_idx" ON "FeeStructure"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FeeStructure_courseId_classId_academicYear_key" ON "FeeStructure"("courseId", "classId", "academicYear");

-- CreateIndex
CREATE INDEX "FeeStructureComponent_feeStructureId_idx" ON "FeeStructureComponent"("feeStructureId");

-- CreateIndex
CREATE INDEX "FeeStructureComponent_feeTypeId_idx" ON "FeeStructureComponent"("feeTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeStructureComponent_feeStructureId_feeTypeId_key" ON "FeeStructureComponent"("feeStructureId", "feeTypeId");

-- CreateIndex
CREATE INDEX "FeePayment_studentId_idx" ON "FeePayment"("studentId");

-- CreateIndex
CREATE INDEX "FeePayment_feeStructureId_idx" ON "FeePayment"("feeStructureId");

-- CreateIndex
CREATE INDEX "FeePayment_paymentStatus_idx" ON "FeePayment"("paymentStatus");

-- CreateIndex
CREATE INDEX "FeePayment_dueDate_idx" ON "FeePayment"("dueDate");

-- CreateIndex
CREATE INDEX "FeePayment_createdAt_idx" ON "FeePayment"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_feePaymentId_idx" ON "Payment"("feePaymentId");

-- CreateIndex
CREATE INDEX "Payment_paymentMethod_idx" ON "Payment"("paymentMethod");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "RefundRequest_studentId_idx" ON "RefundRequest"("studentId");

-- CreateIndex
CREATE INDEX "RefundRequest_feePaymentId_idx" ON "RefundRequest"("feePaymentId");

-- CreateIndex
CREATE INDEX "RefundRequest_status_idx" ON "RefundRequest"("status");

-- CreateIndex
CREATE INDEX "RefundRequest_requestDate_idx" ON "RefundRequest"("requestDate");

-- CreateIndex
CREATE INDEX "BulkUploadLog_status_idx" ON "BulkUploadLog"("status");

-- CreateIndex
CREATE INDEX "BulkUploadLog_createdAt_idx" ON "BulkUploadLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructureComponent" ADD CONSTRAINT "FeeStructureComponent_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructureComponent" ADD CONSTRAINT "FeeStructureComponent_feeTypeId_fkey" FOREIGN KEY ("feeTypeId") REFERENCES "FeeType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_feePaymentId_fkey" FOREIGN KEY ("feePaymentId") REFERENCES "FeePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_feePaymentId_fkey" FOREIGN KEY ("feePaymentId") REFERENCES "FeePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
