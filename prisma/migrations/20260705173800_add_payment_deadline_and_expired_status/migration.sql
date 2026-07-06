-- AlterEnum
ALTER TYPE "ParticipantStatus" ADD VALUE 'expired';

-- AlterTable
ALTER TABLE "HikeParticipant" ADD COLUMN     "paymentDeadline" TIMESTAMP(3);
