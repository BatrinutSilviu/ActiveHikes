-- AlterTable
ALTER TABLE "Hike" ADD COLUMN     "essentials" TEXT[] DEFAULT ARRAY[]::TEXT[];
