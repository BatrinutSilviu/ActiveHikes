-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('double', 'triple', 'quadruple');

-- AlterTable
ALTER TABLE "Hike" ADD COLUMN     "doubleRoomCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quadrupleRoomCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tripleRoomCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "HikeParticipant" ADD COLUMN     "roomId" TEXT;

-- CreateTable
CREATE TABLE "HikeRoom" (
    "id" TEXT NOT NULL,
    "hikeId" TEXT NOT NULL,
    "type" "RoomType" NOT NULL,
    "label" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HikeRoom_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HikeParticipant" ADD CONSTRAINT "HikeParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HikeRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikeRoom" ADD CONSTRAINT "HikeRoom_hikeId_fkey" FOREIGN KEY ("hikeId") REFERENCES "Hike"("id") ON DELETE CASCADE ON UPDATE CASCADE;
