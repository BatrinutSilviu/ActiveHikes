-- AlterTable
ALTER TABLE "Hike" ADD COLUMN     "carsNeeded" INTEGER,
ADD COLUMN     "peoplePerCar" INTEGER NOT NULL DEFAULT 5;
