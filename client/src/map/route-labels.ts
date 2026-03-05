import maplibregl from "maplibre-gl";
import type { Waypoint } from "../lib/types";

const LABELS_SOURCE = "route-labels";
const LABELS_LAYER = "route-labels-layer";

/**
 * Compute haversine distance in nautical miles between two points.
 */
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

/**
 * Compute initial magnetic bearing from point A to point B.
 * Uses a rough magnetic declination approximation (simplified).
 */
function magneticBearing(
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
  const trueBearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

  // Simplified magnetic declination estimate (not accurate, placeholder)
  // In production, use a proper WMM or IGRF model
  const declination = 0;
  return (trueBearing - declination + 360) % 360;
}

/**
 * Compute the rotation angle for a label along a segment, in degrees.
 * Ensures text is always readable (not upside down).
 */
function labelRotation(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLon = lon2 - lon1;
  const dLat = lat2 - lat1;
  let angle = (Math.atan2(dLon, dLat) * 180) / Math.PI;
  // Flip if label would be upside down
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  return -angle; // MapLibre uses clockwise rotation
}

export function updateRouteLabels(
  map: maplibregl.Map,
  waypoints: Waypoint[],
): void {
  if (waypoints.length < 2) {
    // Clear labels if fewer than 2 waypoints
    const emptyCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    if (map.getSource(LABELS_SOURCE)) {
      (map.getSource(LABELS_SOURCE) as maplibregl.GeoJSONSource).setData(
        emptyCollection,
      );
    }
    return;
  }

  const features: GeoJSON.Feature[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const wp1 = waypoints[i];
    const wp2 = waypoints[i + 1];

    const distNm = haversineDistanceNm(wp1.lat, wp1.lon, wp2.lat, wp2.lon);
    const magBrg = magneticBearing(wp1.lat, wp1.lon, wp2.lat, wp2.lon);
    const rotation = labelRotation(wp1.lat, wp1.lon, wp2.lat, wp2.lon);

    // Place label at midpoint of segment
    const midLon = (wp1.lon + wp2.lon) / 2;
    const midLat = (wp1.lat + wp2.lat) / 2;

    features.push({
      type: "Feature",
      properties: {
        label: `${distNm.toFixed(1)} NM / ${Math.round(magBrg)}M`,
        rotation,
      },
      geometry: {
        type: "Point",
        coordinates: [midLon, midLat],
      },
    });
  }

  const geojson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  if (map.getSource(LABELS_SOURCE)) {
    (map.getSource(LABELS_SOURCE) as maplibregl.GeoJSONSource).setData(geojson);
  } else {
    map.addSource(LABELS_SOURCE, {
      type: "geojson",
      data: geojson,
    });

    map.addLayer({
      id: LABELS_LAYER,
      type: "symbol",
      source: LABELS_SOURCE,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 12,
        "text-anchor": "center",
        "text-offset": [0, -1.2],
        "text-rotate": ["get", "rotation"],
        "text-rotation-alignment": "map",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#e2e8f0",
        "text-halo-color": "#0f172a",
        "text-halo-width": 2,
      },
    });
  }
}

export function removeRouteLabels(map: maplibregl.Map): void {
  if (map.getLayer(LABELS_LAYER)) map.removeLayer(LABELS_LAYER);
  if (map.getSource(LABELS_SOURCE)) map.removeSource(LABELS_SOURCE);
}
