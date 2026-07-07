-- CreateTable
CREATE TABLE "Application" (
    "id" SERIAL NOT NULL,
    "applicationNo" TEXT NOT NULL,
    "leadId" INTEGER NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "feeStatus" TEXT NOT NULL DEFAULT 'Not Paid',
    "feePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feeTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interviewDate" TIMESTAMP(3),
    "assignedTo" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "documentName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_applicationNo_key" ON "Application"("applicationNo");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
