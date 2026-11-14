-- Sign-ups with a password now have to confirm their email. Everyone who already has an account
-- (with a password or a Google login) is treated as confirmed, so nobody gets locked out.
UPDATE "User" SET "emailVerified" = "createdAt"
WHERE "emailVerified" IS NULL
  AND ("password" IS NOT NULL OR EXISTS (SELECT 1 FROM "Account" WHERE "Account"."userId" = "User"."id"));
