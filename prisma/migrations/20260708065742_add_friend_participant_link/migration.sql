-- Rename guestName -> friendName (preserves existing data for the backfill migration that follows)
ALTER TABLE "HikeParticipant" RENAME COLUMN "guestName" TO "friendName";

-- Allow participant rows with no linked User account (friend rows)
ALTER TABLE "HikeParticipant" ALTER COLUMN "userId" DROP NOT NULL;

-- Terms & conditions acknowledgment timestamp
ALTER TABLE "HikeParticipant" ADD COLUMN "agreedToTermsAt" TIMESTAMP(3);

-- Link a friend row back to the host row that invited them (1:1 via unique index)
ALTER TABLE "HikeParticipant" ADD COLUMN "hostParticipantId" TEXT;

CREATE UNIQUE INDEX "HikeParticipant_hostParticipantId_key" ON "HikeParticipant"("hostParticipantId");

ALTER TABLE "HikeParticipant" ADD CONSTRAINT "HikeParticipant_hostParticipantId_fkey" FOREIGN KEY ("hostParticipantId") REFERENCES "HikeParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
