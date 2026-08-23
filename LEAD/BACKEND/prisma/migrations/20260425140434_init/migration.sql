/*
  Warnings:

  - A unique constraint covering the columns `[category]` on the table `Settings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Settings_category_key" ON "Settings"("category");
