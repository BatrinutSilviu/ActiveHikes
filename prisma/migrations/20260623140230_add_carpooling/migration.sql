-- AlterTable
ALTER TABLE "HikeParticipant" ADD COLUMN     "carDriverParticipantId" TEXT,
ADD COLUMN     "carSeats" INTEGER;

-- AddForeignKey
ALTER TABLE "HikeParticipant" ADD CONSTRAINT "HikeParticipant_carDriverParticipantId_fkey" FOREIGN KEY ("carDriverParticipantId") REFERENCES "HikeParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
