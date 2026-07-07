/*
  Warnings:

  - You are about to drop the column `revolutHandle` on the `BankAccount` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "PaymentMethodType" ADD VALUE 'btpay';

-- AlterTable
ALTER TABLE "BankAccount" DROP COLUMN "revolutHandle",
ADD COLUMN     "paymentHandle" TEXT;
