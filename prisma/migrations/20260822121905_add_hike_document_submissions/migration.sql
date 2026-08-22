-- CreateTable
CREATE TABLE "HikeDocumentSubmission" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HikeDocumentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HikeDocumentSubmission_documentId_participantId_key" ON "HikeDocumentSubmission"("documentId", "participantId");

-- AddForeignKey
ALTER TABLE "HikeDocumentSubmission" ADD CONSTRAINT "HikeDocumentSubmission_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "HikeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikeDocumentSubmission" ADD CONSTRAINT "HikeDocumentSubmission_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "HikeParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
