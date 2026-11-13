-- General events (not hikes or via ferratas) with their own chat.
ALTER TYPE "HikeType" ADD VALUE 'event';

ALTER TABLE "Hike" ADD COLUMN "category" TEXT,
ADD COLUMN "endTime" TEXT,
ADD COLUMN "advanceFee" DECIMAL(10,2);

CREATE TABLE "EventChatMessage" (
    "id" TEXT NOT NULL,
    "hikeId" TEXT NOT NULL,
    "userId" TEXT,
    "fromAdmin" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventChatMessage_hikeId_createdAt_idx" ON "EventChatMessage"("hikeId", "createdAt");

ALTER TABLE "EventChatMessage" ADD CONSTRAINT "EventChatMessage_hikeId_fkey" FOREIGN KEY ("hikeId") REFERENCES "Hike"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventChatMessage" ADD CONSTRAINT "EventChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
