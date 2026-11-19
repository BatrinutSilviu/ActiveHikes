-- Community members can create their own (free) general events; their creator manages them.
ALTER TABLE "Hike" ADD COLUMN "byMember" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Hike_createdById_idx" ON "Hike"("createdById");
