-- AlterTable
ALTER TABLE "HikeDocumentSubmission" ALTER COLUMN "participantId" DROP NOT NULL;
ALTER TABLE "HikeDocumentSubmission" ADD COLUMN "previewAdminId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "HikeDocumentSubmission_documentId_previewAdminId_key" ON "HikeDocumentSubmission"("documentId", "previewAdminId");

-- AddForeignKey
ALTER TABLE "HikeDocumentSubmission" ADD CONSTRAINT "HikeDocumentSubmission_previewAdminId_fkey" FOREIGN KEY ("previewAdminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
