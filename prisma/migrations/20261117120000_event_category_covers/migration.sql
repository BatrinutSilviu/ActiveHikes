-- CreateTable
CREATE TABLE "EventCategoryCover" (
    "category" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCategoryCover_pkey" PRIMARY KEY ("category")
);
