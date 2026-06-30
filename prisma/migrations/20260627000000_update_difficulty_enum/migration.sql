-- Rename old enum
ALTER TYPE "Difficulty" RENAME TO "Difficulty_old";

-- Create new enum with updated values
CREATE TYPE "Difficulty" AS ENUM ('easy', 'easy_medium', 'medium', 'medium_hard', 'hard');

-- Migrate existing data: map old values to closest new ones
ALTER TABLE "Hike" ALTER COLUMN "difficulty" DROP DEFAULT;
ALTER TABLE "Hike"
  ALTER COLUMN "difficulty" TYPE "Difficulty"
  USING (
    CASE "difficulty"::text
      WHEN 'easy'     THEN 'easy'::"Difficulty"
      WHEN 'moderate' THEN 'medium'::"Difficulty"
      WHEN 'hard'     THEN 'hard'::"Difficulty"
      WHEN 'expert'   THEN 'hard'::"Difficulty"
      ELSE NULL
    END
  );

-- Drop old enum
DROP TYPE "Difficulty_old";
