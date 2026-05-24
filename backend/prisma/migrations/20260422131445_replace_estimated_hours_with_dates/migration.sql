/*
  Warnings:

  - You are about to drop the column `estimated_hours` on the `Curso` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Curso" DROP COLUMN "estimated_hours",
ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "start_date" TIMESTAMP(3);
