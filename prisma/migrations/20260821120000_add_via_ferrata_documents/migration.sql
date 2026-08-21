-- CreateTable
CREATE TABLE "ViaFerrataDocument" (
    "id" TEXT NOT NULL,
    "viaFerrataId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViaFerrataDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ViaFerrataDocument" ADD CONSTRAINT "ViaFerrataDocument_viaFerrataId_fkey" FOREIGN KEY ("viaFerrataId") REFERENCES "ViaFerrata"("id") ON DELETE CASCADE ON UPDATE CASCADE;
