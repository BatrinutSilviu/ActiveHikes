-- Unpaid registrations now drop to the waitlist instead of expiring
UPDATE "HikeParticipant" SET "status" = 'waitlist', "paymentDeadline" = NULL WHERE "status" = 'expired';

-- AlterEnum
BEGIN;
CREATE TYPE "ParticipantStatus_new" AS ENUM ('pending', 'confirmed', 'rejected', 'waitlist');
ALTER TABLE "HikeParticipant" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "HikeParticipant" ALTER COLUMN "status" TYPE "ParticipantStatus_new" USING ("status"::text::"ParticipantStatus_new");
ALTER TYPE "ParticipantStatus" RENAME TO "ParticipantStatus_old";
ALTER TYPE "ParticipantStatus_new" RENAME TO "ParticipantStatus";
DROP TYPE "ParticipantStatus_old";
ALTER TABLE "HikeParticipant" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;
