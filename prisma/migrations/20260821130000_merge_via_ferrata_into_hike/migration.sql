-- Merge ViaFerrata/ViaFerrataParticipant into Hike/HikeParticipant, and
-- ViaFerrataDocument into a generic HikeDocument, so both event types share
-- one data model (registration, waitlist, friend-linking, car allocation).

-- CreateEnum
CREATE TYPE "HikeType" AS ENUM ('hike', 'via_ferrata');

-- AlterTable: existing hikes default to type 'hike'
ALTER TABLE "Hike" ADD COLUMN "type" "HikeType" NOT NULL DEFAULT 'hike';

-- Copy ViaFerrata rows into Hike as type 'via_ferrata'.
-- location -> destination, price -> entryFee, routes -> essentials.
-- Every other Hike-only column (camping/accommodation/rooms/difficulty/GPX/etc.)
-- is left at its column default (NULL / false / 0), since Via Ferrata never used them.
INSERT INTO "Hike" (
  "id", "type", "title", "destination", "description", "date",
  "entryFee", "maxParticipants", "durationHours", "status", "essentials",
  "createdById", "createdAt"
)
SELECT
  "id", 'via_ferrata'::"HikeType", "title", "location", "description", "date",
  "price", "maxParticipants", "durationHours", "status"::text::"HikeStatus", "routes",
  "createdById", "createdAt"
FROM "ViaFerrata";

-- Copy ViaFerrataParticipant rows into HikeParticipant, same id preserved.
-- hostParticipantId is backfilled afterwards to avoid any self-referential
-- FK ordering concern within a single multi-row INSERT.
INSERT INTO "HikeParticipant" (
  "id", "hikeId", "userId", "status", "joinedAt", "confirmedAt",
  "paymentDeadline", "agreedToTermsAt", "adminNotes", "friendName"
)
SELECT
  "id", "viaFerrataId", "userId", "status", "joinedAt", "confirmedAt",
  "paymentDeadline", "agreedToTermsAt", "adminNotes", "friendName"
FROM "ViaFerrataParticipant";

UPDATE "HikeParticipant" hp
SET "hostParticipantId" = vfp."hostParticipantId"
FROM "ViaFerrataParticipant" vfp
WHERE hp."id" = vfp."id" AND vfp."hostParticipantId" IS NOT NULL;

-- Turn ViaFerrataDocument into the generic HikeDocument (repoint at Hike instead of ViaFerrata).
ALTER TABLE "ViaFerrataDocument" DROP CONSTRAINT "ViaFerrataDocument_viaFerrataId_fkey";
ALTER TABLE "ViaFerrataDocument" RENAME COLUMN "viaFerrataId" TO "hikeId";
ALTER TABLE "ViaFerrataDocument" RENAME TO "HikeDocument";
ALTER TABLE "HikeDocument" RENAME CONSTRAINT "ViaFerrataDocument_pkey" TO "HikeDocument_pkey";
ALTER TABLE "HikeDocument" ADD CONSTRAINT "HikeDocument_hikeId_fkey" FOREIGN KEY ("hikeId") REFERENCES "Hike"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop the now-migrated ViaFerrata tables and status enum.
DROP TABLE "ViaFerrataParticipant";
DROP TABLE "ViaFerrata";
DROP TYPE "ViaFerrataStatus";
