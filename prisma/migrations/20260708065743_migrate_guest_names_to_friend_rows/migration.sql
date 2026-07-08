-- Backfill: turn every existing decorative "friendName" label into a real linked
-- HikeParticipant row, so historical registrations look consistent with new ones
-- across rooms, cars, capacity, and admin views.
WITH source AS (
  SELECT * FROM "HikeParticipant"
  WHERE "friendName" IS NOT NULL AND "hostParticipantId" IS NULL
),
inserted AS (
  INSERT INTO "HikeParticipant" (
    id, "hikeId", "userId", status, "joinedAt", "confirmedAt", "paymentDeadline",
    "friendName", "bringsCar", "carSeats", "carDriverParticipantId",
    "pickupLat", "pickupLng", "roomId", "hostParticipantId"
  )
  SELECT
    'friend_' || s.id,
    s."hikeId", NULL, s.status, s."joinedAt", s."confirmedAt", s."paymentDeadline",
    s."friendName", false, NULL,
    CASE WHEN s."bringsCar" THEN s.id ELSE s."carDriverParticipantId" END,
    NULL, NULL,
    s."roomId", s.id
  FROM source s
  RETURNING "hostParticipantId"
)
UPDATE "HikeParticipant" SET "friendName" = NULL
WHERE id IN (SELECT "hostParticipantId" FROM inserted);
