-- CreateEnum
CREATE TYPE "ViaFerrataStatus" AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "ViaFerrata" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxParticipants" INTEGER NOT NULL,
    "durationHours" DECIMAL(4,1),
    "routes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ViaFerrataStatus" NOT NULL DEFAULT 'upcoming',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViaFerrata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViaFerrataParticipant" (
    "id" TEXT NOT NULL,
    "viaFerrataId" TEXT NOT NULL,
    "userId" TEXT,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'pending',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "paymentDeadline" TIMESTAMP(3),
    "agreedToTermsAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "friendName" TEXT,
    "hostParticipantId" TEXT,

    CONSTRAINT "ViaFerrataParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ViaFerrataParticipant_hostParticipantId_key" ON "ViaFerrataParticipant"("hostParticipantId");

-- CreateIndex
CREATE UNIQUE INDEX "ViaFerrataParticipant_viaFerrataId_userId_key" ON "ViaFerrataParticipant"("viaFerrataId", "userId");

-- AddForeignKey
ALTER TABLE "ViaFerrata" ADD CONSTRAINT "ViaFerrata_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaFerrataParticipant" ADD CONSTRAINT "ViaFerrataParticipant_viaFerrataId_fkey" FOREIGN KEY ("viaFerrataId") REFERENCES "ViaFerrata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaFerrataParticipant" ADD CONSTRAINT "ViaFerrataParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaFerrataParticipant" ADD CONSTRAINT "ViaFerrataParticipant_hostParticipantId_fkey" FOREIGN KEY ("hostParticipantId") REFERENCES "ViaFerrataParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
