-- Admins tick off each participant once they've paid their share of the gas money.
ALTER TABLE "HikeParticipant" ADD COLUMN "gasPaidAt" TIMESTAMP(3);
