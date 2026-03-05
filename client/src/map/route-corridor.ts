import maplibregl from "maplibre-gl";
import type { Waypoint, Threat } from "../lib/types";

const CORRIDOR_SOURCE = "route-corridor";
const CORRIDOR_FILL_LAYER = "route-corridor-fill";
const CORRIDOR_LINE_LAYER = "route-corridor-line";
const DANGER_SOURCE = "route-corridor-danger";
const DANGER_FILL_LAYER = "route-corridor-danger-fill";

const DEFAULT_CORRIDOR_WIDTH_NM = 2;

/**
 * Offset a point by a given distance and bearing.
 */
function offsetPoint(
  lon: number,
  lat: number,
  bearingDeg: number,
  distanceNm: number,
): [number, number] {
  const distKm = distanceNm * 1.852;
  const rad = (bearingDeg * Math.PI) / 180;
  const dLat = (distKm / 111.32) * Math.cos(rad);
  const dLon =
    (distKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(rad);
  return [lon + dLon, lat + dLat];
}

/**
 * Compute bearing from point A to point B in degrees.
 */
function bearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1R = (lat1 * Math.PI) / 180;
  const lat2R = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2R);
  const x =
    Math.cos(lat1R) * Math.sin(lat2R) -
    Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Build a corridor polygon around a series of waypoints.
 */
function buildCorridorPolygon(
  waypoints: Waypoint[],
  widthNm: number = DEFAULT_CORRIDOR_WIDTH_NM,
): [number, number][] {
  if (waypoints.length < 2) return [];

  const leftSide: [number, number][] = [];
  const rightSide: [number, number][] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const wp1 = waypoints[i];
    const wp2 = waypoints[i + 1];
    const brg = bearing(wp1.lat, wp1.lon, wp2.lat, wp2.lon);
    const perpLeft = (brg - 90 + 360) % 360;
    const perpRight = (brg + 90) % 360;

    // Offset start point
    leftSide.push(offsetPoint(wp1.lon, wp1.lat, perpLeft, widthNm));
    rightSide.push(offsetPoint(wp1.lon, wp1.lat, perpRight, widthNm));

    // Offset end point of this segment
    if (i === waypoints.length - 2) {
      leftSide.push(offsetPoint(wp2.lon, wp2.lat, perpLeft, widthNm));
      rightSide.push(offsetPoint(wp2.lon, wp2.lat, perpRight, widthNm));
    }
  }

  // Build polygon: left side forward, right side reversed
  const polygon = [...leftSide, ...rightSide.reverse()];
  // Close the ring
  polygon.push(polygon[0]);
  return polygon;
}

/**
 * Check if a route segment intersects with any threat circle.
 * Returns segments that are within threat range rings.
 */
function findDangerSegments(
  waypoints: Waypoint[],
  threats: Threat[],
  widthNm: number = DEFAULT_CORRIDOR_WIDTH_NM,
): GeoJSON.Feature<GeoJSON.Polygon>[] {
  if (waypoints.length < 2 || threats.length === 0) return [];

  const dangerFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const wp1 = waypoints[i];
    const wp2 = waypoints[i + 1];

    // Check midpoint and endpoints against each threat
    const midLat = (wp1.lat + wp2.lat) / 2;
    const midLon = (wp1.lon + wp2.lon) / 2;
    const checkPoints = [
      [wp1.lon, wp1.lat],
      [midLon, midLat],
      [wp2.lon, wp2.lat],
    ];

    let inDanger = false;
    for (const threat of threats) {
      if (!threat.active) continue;
      for (const [pLon, pLat] of checkPoints) {
        const distNm = haversineDistanceNm(pLat, pLon, threat.lat, threat.lon);
        if (distNm <= threat.rangeNm + widthNm) {
          inDanger = true;
          break;
        }
      }
      if (inDanger) break;
    }

    if (inDanger) {
      // Build a corridor polygon just for this segment
      const segmentWps = [waypoints[i], waypoints[i + 1]];
      const segCorridor = buildCorridorPolygon(segmentWps, widthNm);
      if (segCorridor.length > 0) {
        dangerFeatures.push({
          type: "Feature",
          properties: { segmentIndex: i },
          geometry: {
            type: "Polygon",
            coordinates: [segCorridor],
          },
        });
      }
    }
  }

  return dangerFeatures;
}

function haversineDistanceNm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3440.065;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function updateRouteCorridor(
  map: maplibregl.Map,
  waypoints: Waypoint[],
  threats: Threat[],
  widthNm: number = DEFAULT_CORRIDOR_WIDTH_NM,
): void {
  const corridorCoords = buildCorridorPolygon(waypoints, widthNm);

  const corridorGeoJson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features:
      corridorCoords.length > 0
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [corridorCoords],
              },
            },
          ]
        : [],
  };

  // Update or create corridor layers
  if (map.getSource(CORRIDOR_SOURCE)) {
    (map.getSource(CORRIDOR_SOURCE) as maplibregl.GeoJSONSource).setData(
      corridorGeoJson,
    );
  } else {
    map.addSource(CORRIDOR_SOURCE, {
      type: "geojson",
      data: corridorGeoJson,
    });

    map.addLayer(
      {
        id: CORRIDOR_FILL_LAYER,
        type: "fill",
        source: CORRIDOR_SOURCE,
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": 0.08,
        },
      },
    );

    map.addLayer(
      {
        id: CORRIDOR_LINE_LAYER,
        type: "line",
        source: CORRIDOR_SOURCE,
        paint: {
          "line-color": "#3b82f6",
          "line-width": 1,
          "line-opacity": 0.4,
          "line-dasharray": [4, 4],
        },
      },
    );
  }

  // Danger segments (corridor sections intersecting threats)
  const dangerFeatures = findDangerSegments(waypoints, threats, widthNm);
  const dangerGeoJson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: dangerFeatures,
  };

  if (map.getSource(DANGER_SOURCE)) {
    (map.getSource(DANGER_SOURCE) as maplibregl.GeoJSONSource).setData(
      dangerGeoJson,
    );
  } else {
    map.addSource(DANGER_SOURCE, {
      type: "geojson",
      data: dangerGeoJson,
    });

    map.addLayer(
      {
        id: DANGER_FILL_LAYER,
        type: "fill",
        source: DANGER_SOURCE,
        paint: {
          "fill-color": "#dc2626",
          "fill-opacity": 0.25,
        },
      },
    );
  }
}

export function removeRouteCorridor(map: maplibregl.Map): void {
  const layers = [DANGER_FILL_LAYER, CORRIDOR_LINE_LAYER, CORRIDOR_FILL_LAYER];
  const sources = [DANGER_SOURCE, CORRIDOR_SOURCE];

  layers.forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  sources.forEach((id) => {
    if (map.getSource(id)) map.removeSource(id);
  });
}
