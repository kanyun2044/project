/*
  Warnings:

  - Made the column `isDelete` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "isDelete" SET NOT NULL,
ALTER COLUMN "isDelete" SET DEFAULT false;
