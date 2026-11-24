-- Participants who don't pay for gas (left out of the gas split and the paid count).
ALTER TABLE "HikeParticipant" ADD COLUMN "gasExempt" BOOLEAN NOT NULL DEFAULT false;
