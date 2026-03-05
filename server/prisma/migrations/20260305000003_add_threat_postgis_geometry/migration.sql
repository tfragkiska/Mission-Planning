-- Add PostGIS geometry column for threats
ALTER TABLE threats ADD COLUMN geom geometry(Point, 4326);
CREATE INDEX idx_threats_geom ON threats USING GIST(geom);

-- Trigger to auto-populate geom from lat/lon
CREATE OR REPLACE FUNCTION update_threat_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lon, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_threat_geom
  BEFORE INSERT OR UPDATE OF lat, lon ON threats
  FOR EACH ROW
  EXECUTE FUNCTION update_threat_geom();

-- Threat range circle function for spatial queries
CREATE OR REPLACE FUNCTION threat_envelope(threat_lon float, threat_lat float, range_nm float)
RETURNS geometry AS $$
BEGIN
  RETURN ST_Buffer(
    ST_SetSRID(ST_MakePoint(threat_lon, threat_lat), 4326)::geography,
    range_nm * 1852  -- convert nautical miles to meters
  )::geometry;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
