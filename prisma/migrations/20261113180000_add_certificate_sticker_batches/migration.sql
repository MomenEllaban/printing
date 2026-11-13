-- CreateTable
CREATE TABLE "CertificateStickerBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "fileName" TEXT,
    "driveFileId" TEXT,
    "driveFolderId" TEXT,
    "batchType" TEXT NOT NULL DEFAULT 'uploaded',
    "sourceKey" TEXT,
    "studentsData" JSONB NOT NULL,
    "receiptsData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateStickerBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CertificateStickerBatch_userId_idx" ON "CertificateStickerBatch"("userId");

-- CreateIndex
CREATE INDEX "CertificateStickerBatch_driveFileId_idx" ON "CertificateStickerBatch"("driveFileId");

-- CreateIndex
CREATE INDEX "CertificateStickerBatch_sourceKey_idx" ON "CertificateStickerBatch"("sourceKey");

-- CreateIndex
CREATE INDEX "CertificateStickerBatch_batchType_idx" ON "CertificateStickerBatch"("batchType");
