-- CreateEnum
CREATE TYPE "BankConnectionStatus" AS ENUM ('pending', 'linked', 'expired');

-- CreateTable
CREATE TABLE "BankConnection" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'gocardless',
    "institutionId" TEXT,
    "institutionName" TEXT,
    "requisitionId" TEXT,
    "accountId" TEXT,
    "reference" TEXT NOT NULL,
    "status" "BankConnectionStatus" NOT NULL DEFAULT 'pending',
    "linkedAt" TIMESTAMP(3),
    "consentExpiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastMatchedCount" INTEGER,
    "lastUnmatchedCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankConnection_reference_key" ON "BankConnection"("reference");

-- CreateTable
CREATE TABLE "ProcessedBankTransaction" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "hikeParticipantId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedBankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedBankTransaction_transactionId_key" ON "ProcessedBankTransaction"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedBankTransaction_hikeParticipantId_key" ON "ProcessedBankTransaction"("hikeParticipantId");

-- AddForeignKey
ALTER TABLE "ProcessedBankTransaction" ADD CONSTRAINT "ProcessedBankTransaction_hikeParticipantId_fkey" FOREIGN KEY ("hikeParticipantId") REFERENCES "HikeParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
