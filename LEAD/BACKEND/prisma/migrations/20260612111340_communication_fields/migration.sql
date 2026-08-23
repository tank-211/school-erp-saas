-- AlterTable
ALTER TABLE "Communication" ADD COLUMN     "subject" TEXT,
ALTER COLUMN "content" DROP NOT NULL,
ALTER COLUMN "status" DROP NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;
