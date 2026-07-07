/*
  Warnings:

  - Added the required column `content` to the `Communication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Communication" ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'sent';
