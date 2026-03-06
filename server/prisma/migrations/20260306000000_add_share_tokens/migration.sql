-- AlterTable
ALTER TABLE "missions" ADD COLUMN "share_token" TEXT,
ADD COLUMN "share_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "missions_share_token_key" ON "missions"("share_token");
