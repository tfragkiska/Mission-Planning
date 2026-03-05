-- CreateEnum
CREATE TYPE "ThreatCategory" AS ENUM ('SAM', 'AAA', 'MANPAD', 'RADAR', 'FIGHTER', 'OTHER');

-- CreateEnum
CREATE TYPE "Lethality" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ConflictType" AS ENUM ('AIRSPACE', 'TIMING', 'RESOURCE', 'RESTRICTED_AIRSPACE');

-- CreateEnum
CREATE TYPE "ConflictSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ConflictResolution" AS ENUM ('UNRESOLVED', 'RESOLVED', 'ACCEPTED');

-- CreateTable
CREATE TABLE "threats" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ThreatCategory" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "range_nm" DOUBLE PRECISION NOT NULL,
    "lethality" "Lethality" NOT NULL,
    "min_altitude" DOUBLE PRECISION,
    "max_altitude" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_threats" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "threat_id" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "mission_threats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_reports" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "raw_report" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION,
    "wind_speed" DOUBLE PRECISION,
    "wind_dir" DOUBLE PRECISION,
    "visibility" DOUBLE PRECISION,
    "ceiling" DOUBLE PRECISION,
    "conditions" TEXT,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deconfliction_results" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "conflict_type" "ConflictType" NOT NULL,
    "severity" "ConflictSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "resolution" "ConflictResolution" NOT NULL DEFAULT 'UNRESOLVED',
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deconfliction_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mission_threats_mission_id_threat_id_key" ON "mission_threats"("mission_id", "threat_id");

-- AddForeignKey
ALTER TABLE "mission_threats" ADD CONSTRAINT "mission_threats_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_threats" ADD CONSTRAINT "mission_threats_threat_id_fkey" FOREIGN KEY ("threat_id") REFERENCES "threats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_reports" ADD CONSTRAINT "weather_reports_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deconfliction_results" ADD CONSTRAINT "deconfliction_results_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
