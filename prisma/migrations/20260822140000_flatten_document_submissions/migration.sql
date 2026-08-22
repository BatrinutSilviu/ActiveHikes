-- Drop old per-document submission FK/uniques
ALTER TABLE "HikeDocumentSubmission" DROP CONSTRAINT "HikeDocumentSubmission_documentId_fkey";
DROP INDEX "HikeDocumentSubmission_documentId_participantId_key";
DROP INDEX "HikeDocumentSubmission_documentId_previewAdminId_key";

-- Submissions now belong directly to a hike, not a specific document
ALTER TABLE "HikeDocumentSubmission" ADD COLUMN "hikeId" TEXT;
UPDATE "HikeDocumentSubmission" s SET "hikeId" = d."hikeId" FROM "HikeDocument" d WHERE d.id = s."documentId";
ALTER TABLE "HikeDocumentSubmission" ALTER COLUMN "hikeId" SET NOT NULL;
ALTER TABLE "HikeDocumentSubmission" ADD CONSTRAINT "HikeDocumentSubmission_hikeId_fkey" FOREIGN KEY ("hikeId") REFERENCES "Hike"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HikeDocumentSubmission" ADD COLUMN "fileName" TEXT;
UPDATE "HikeDocumentSubmission" SET "fileName" = 'document' WHERE "fileName" IS NULL;
ALTER TABLE "HikeDocumentSubmission" ALTER COLUMN "fileName" SET NOT NULL;

ALTER TABLE "HikeDocumentSubmission" DROP COLUMN "documentId";
