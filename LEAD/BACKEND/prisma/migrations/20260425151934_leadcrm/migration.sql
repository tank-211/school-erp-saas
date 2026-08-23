/*
  Warnings:

  - You are about to drop the column `email` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the `Activity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `fatherName` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fatherPhone` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studentFirstName` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studentLastName` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_leadId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_userId_fkey";

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_assignedTo_fkey";

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "phone",
ADD COLUMN     "currentSchool" TEXT,
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "fatherEmail" TEXT,
ADD COLUMN     "fatherName" TEXT NOT NULL,
ADD COLUMN     "fatherPhone" TEXT NOT NULL,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "grade" TEXT,
ADD COLUMN     "motherEmail" TEXT,
ADD COLUMN     "motherName" TEXT,
ADD COLUMN     "motherPhone" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "studentFirstName" TEXT NOT NULL,
ADD COLUMN     "studentLastName" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'new';

-- DropTable
DROP TABLE "Activity";

-- DropTable
DROP TABLE "Settings";

-- DropTable
DROP TABLE "User";
