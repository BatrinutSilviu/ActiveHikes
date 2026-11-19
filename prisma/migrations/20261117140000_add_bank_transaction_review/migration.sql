-- Incoming payments the Revolut sync couldn't confidently match, queued for
-- the admin to assign to a participant or dismiss.
CREATE TYPE "BankTransactionReviewStatus" AS ENUM ('open', 'resolved', 'dismissed');

CREATE TABLE "BankTransactionReview" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "senderName" TEXT,
    "bookedAt" TIMESTAMP(3),
    "status" "BankTransactionReviewStatus" NOT NULL DEFAULT 'open',
    "hikeParticipantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "BankTransactionReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankTransactionReview_transactionId_key" ON "BankTransactionReview"("transactionId");
