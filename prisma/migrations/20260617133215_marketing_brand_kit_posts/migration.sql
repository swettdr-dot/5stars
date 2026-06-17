-- CreateTable
CREATE TABLE "BrandKit" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "primary" TEXT NOT NULL DEFAULT '#D97706',
    "accent" TEXT NOT NULL DEFAULT '#16A34A',
    "background" TEXT NOT NULL DEFAULT '#FFFFFF',
    "text" TEXT NOT NULL DEFAULT '#1A1A1E',
    "colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "headingFont" TEXT NOT NULL DEFAULT 'Playfair Display',
    "bodyFont" TEXT NOT NULL DEFAULT 'Inter',
    "backgrounds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "toneOfVoice" TEXT,
    "logoOverrideUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingPost" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "reviewId" TEXT,
    "templateKey" TEXT NOT NULL,
    "quoteText" TEXT NOT NULL,
    "starRating" INTEGER NOT NULL,
    "attribution" TEXT,
    "imageSquareUrl" TEXT,
    "imageStoryUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandKit_businessId_key" ON "BrandKit"("businessId");

-- CreateIndex
CREATE INDEX "MarketingPost_businessId_createdAt_idx" ON "MarketingPost"("businessId", "createdAt");

-- AddForeignKey
ALTER TABLE "BrandKit" ADD CONSTRAINT "BrandKit_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingPost" ADD CONSTRAINT "MarketingPost_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingPost" ADD CONSTRAINT "MarketingPost_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;
