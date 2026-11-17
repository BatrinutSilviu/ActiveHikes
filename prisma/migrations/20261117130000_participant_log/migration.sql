-- CreateTable
CREATE TABLE "ParticipantLog" (
    "id" TEXT NOT NULL,
    "hikeId" TEXT NOT NULL,
    "participantId" TEXT,
    "userId" TEXT,
    "personName" TEXT NOT NULL,
    "friendOf" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" "ParticipantStatus",
    "toStatus" "ParticipantStatus",
    "actor" TEXT NOT NULL,
    "actorName" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParticipantLog_hikeId_createdAt_idx" ON "ParticipantLog"("hikeId", "createdAt");

-- AddForeignKey
ALTER TABLE "ParticipantLog" ADD CONSTRAINT "ParticipantLog_hikeId_fkey" FOREIGN KEY ("hikeId") REFERENCES "Hike"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- What we already know about the current sign-ups: when they joined and, for the confirmed ones, when
-- they were confirmed (from before this log existed, so marked as such; who did it isn't known).
INSERT INTO "ParticipantLog" ("id", "hikeId", "participantId", "userId", "personName", "friendOf", "action", "toStatus", "actor", "details", "createdAt")
SELECT 'bf_j_' || p."id", p."hikeId", p."id", p."userId",
       COALESCE(u."name", p."friendName", '?'), hu."name", 'joined', NULL, 'self', '{"backfilled": true}'::jsonb, p."joinedAt"
FROM "HikeParticipant" p
LEFT JOIN "User" u ON u."id" = p."userId"
LEFT JOIN "HikeParticipant" h ON h."id" = p."hostParticipantId"
LEFT JOIN "User" hu ON hu."id" = h."userId";

INSERT INTO "ParticipantLog" ("id", "hikeId", "participantId", "userId", "personName", "friendOf", "action", "toStatus", "actor", "details", "createdAt")
SELECT 'bf_c_' || p."id", p."hikeId", p."id", p."userId",
       COALESCE(u."name", p."friendName", '?'), hu."name", 'status', 'confirmed', 'system', '{"backfilled": true}'::jsonb, p."confirmedAt"
FROM "HikeParticipant" p
LEFT JOIN "User" u ON u."id" = p."userId"
LEFT JOIN "HikeParticipant" h ON h."id" = p."hostParticipantId"
LEFT JOIN "User" hu ON hu."id" = h."userId"
WHERE p."confirmedAt" IS NOT NULL;
