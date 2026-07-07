-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('bank', 'revolut');

-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "revolutHandle" TEXT,
ADD COLUMN     "type" "PaymentMethodType" NOT NULL DEFAULT 'bank',
ALTER COLUMN "bankName" DROP NOT NULL,
ALTER COLUMN "iban" DROP NOT NULL;
