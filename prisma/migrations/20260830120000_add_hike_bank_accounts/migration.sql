-- CreateTable
CREATE TABLE "_HikeBankAccounts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_HikeBankAccounts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_HikeBankAccounts_B_index" ON "_HikeBankAccounts"("B");

-- AddForeignKey
ALTER TABLE "_HikeBankAccounts" ADD CONSTRAINT "_HikeBankAccounts_A_fkey" FOREIGN KEY ("A") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HikeBankAccounts" ADD CONSTRAINT "_HikeBankAccounts_B_fkey" FOREIGN KEY ("B") REFERENCES "Hike"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every currently-active bank account was shown on every hike/via
-- ferrata page before this migration, so link them all to preserve that
-- behavior. Admins can then narrow it down per event.
INSERT INTO "_HikeBankAccounts" ("A", "B")
SELECT "BankAccount"."id", "Hike"."id"
FROM "BankAccount", "Hike"
WHERE "BankAccount"."isActive" = true;
