-- CreateEnum
CREATE TYPE "AirspaceType" AS ENUM ('RESTRICTED', 'PROHIBITED', 'MOA', 'WARNING', 'ALERT', 'TFR');

-- CreateTable
CREATE TABLE "airspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AirspaceType" NOT NULL,
    "min_altitude" DOUBLE PRECISION,
    "max_altitude" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "coordinates" JSONB NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "airspaces_pkey" PRIMARY KEY ("id")
);

-- Add PostGIS geometry column
SELECT AddGeometryColumn('airspaces', 'geom', 4326, 'POLYGON', 2);
CREATE INDEX "airspaces_geom_idx" ON "airspaces" USING GIST ("geom");

-- Trigger to auto-update geometry from coordinates JSON
CREATE OR REPLACE FUNCTION update_airspace_geom() RETURNS trigger AS $$
BEGIN
  NEW.geom := ST_SetSRID(
    ST_MakePolygon(
      ST_MakeLine(
        (SELECT array_agg(ST_MakePoint((coord->0)::float, (coord->1)::float))
         FROM jsonb_array_elements(NEW.coordinates::jsonb) AS coord)
      )
    ),
    4326
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER airspace_geom_trigger
  BEFORE INSERT OR UPDATE OF coordinates ON airspaces
  FOR EACH ROW EXECUTE FUNCTION update_airspace_geom();
