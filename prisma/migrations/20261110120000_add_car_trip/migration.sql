-- CreateEnum
CREATE TYPE "CarTrip" AS ENUM ('both', 'there', 'back');

-- AlterTable
ALTER TABLE "HikeParticipant" ADD COLUMN "carTrip" "CarTrip" NOT NULL DEFAULT 'both';
