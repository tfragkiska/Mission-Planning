-- CreateTable
CREATE TABLE "mission_versions" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changed_by" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mission_versions_mission_id_version_key" ON "mission_versions"("mission_id", "version");

-- AddForeignKey
ALTER TABLE "mission_versions" ADD CONSTRAINT "mission_versions_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
