-- Rename to match the switch from GoCardless to Enable Banking, whose
-- authorization flow returns a session id (not a requisition id).
ALTER TABLE "BankConnection" RENAME COLUMN "requisitionId" TO "sessionId";
ALTER TABLE "BankConnection" ALTER COLUMN "provider" SET DEFAULT 'enablebanking';
