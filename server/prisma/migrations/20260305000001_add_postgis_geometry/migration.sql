ALTER TABLE waypoints ADD COLUMN geom geometry(Point, 4326);
CREATE INDEX idx_waypoints_geom ON waypoints USING GIST(geom);

CREATE OR REPLACE FUNCTION update_waypoint_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lon, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_waypoint_geom
  BEFORE INSERT OR UPDATE OF lat, lon ON waypoints
  FOR EACH ROW
  EXECUTE FUNCTION update_waypoint_geom();
