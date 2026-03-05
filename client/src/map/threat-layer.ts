import maplibregl from "maplibre-gl";
import type { Threat, ThreatLethality } from "../lib/types";

const THREAT_RINGS_SOURCE = "threat-rings";
const THREAT_RINGS_FILL_LAYER = "threat-rings-fill";
const THREAT_RINGS_LINE_LAYER = "threat-rings-line";
const THREAT_LABELS_LAYER = "threat-labels";

const LETHALITY_COLORS: Record<ThreatLethality, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#ea580c",
  MEDIUM: "#ca8a04",
  LOW: "#2563eb",
};

/**
 * Generate a GeoJSON polygon circle approximation.
 * @param center [lon, lat]
 * @param radiusNm radius in nautical miles
 * @param points number of polygon vertices
 */
function createCirclePolygon(
  center: [number, number],
  radiusNm: number,
  points: number = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const radiusKm = radiusNm * 1.852;
  const coords: [number, number][] = [];
  const [lon, lat] = center;

  for (let i = 0; i <= points; i++) {
    const angle = (i * 360) / points;
    const rad = (angle * Math.PI) / 180;

    // Approximate offset in degrees
    const dLat = (radiusKm / 111.32) * Math.cos(rad);
    const dLon =
      (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(rad);

    coords.push([lon + dLon, lat + dLat]);
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  };
}

export function updateThreatLayers(
  map: maplibregl.Map,
  threats: Threat[],
): void {
  const features: GeoJSON.Feature[] = threats
    .filter((t) => t.active)
    .map((t) => {
      const circle = createCirclePolygon([t.lon, t.lat], t.rangeNm);
      return {
        ...circle,
        properties: {
          id: t.id,
          name: t.name,
          category: t.category,
          lethality: t.lethality,
          rangeNm: t.rangeNm,
          color: LETHALITY_COLORS[t.lethality] || "#666",
        },
      };
    });

  // Also add center point features for labels
  const labelFeatures: GeoJSON.Feature[] = threats
    .filter((t) => t.active)
    .map((t) => ({
      type: "Feature" as const,
      properties: {
        name: t.name,
        category: t.category,
        rangeNm: t.rangeNm,
        lethality: t.lethality,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [t.lon, t.lat],
      },
    }));

  const ringCollection: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  const labelCollection: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: labelFeatures,
  };

  // Update or create ring layers
  if (map.getSource(THREAT_RINGS_SOURCE)) {
    (map.getSource(THREAT_RINGS_SOURCE) as maplibregl.GeoJSONSource).setData(
      ringCollection,
    );
  } else {
    map.addSource(THREAT_RINGS_SOURCE, {
      type: "geojson",
      data: ringCollection,
    });

    map.addLayer({
      id: THREAT_RINGS_FILL_LAYER,
      type: "fill",
      source: THREAT_RINGS_SOURCE,
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": 0.12,
      },
    });

    map.addLayer({
      id: THREAT_RINGS_LINE_LAYER,
      type: "line",
      source: THREAT_RINGS_SOURCE,
      paint: {
        "line-color": ["get", "color"],
        "line-width": 2,
        "line-opacity": 0.8,
      },
    });
  }

  // Update or create label layer
  const labelSourceId = "threat-label-points";
  if (map.getSource(labelSourceId)) {
    (map.getSource(labelSourceId) as maplibregl.GeoJSONSource).setData(
      labelCollection,
    );
  } else {
    map.addSource(labelSourceId, {
      type: "geojson",
      data: labelCollection,
    });

    map.addLayer({
      id: THREAT_LABELS_LAYER,
      type: "symbol",
      source: labelSourceId,
      layout: {
        "text-field": [
          "concat",
          ["get", "name"],
          "\n",
          ["get", "category"],
          " - ",
          ["to-string", ["get", "rangeNm"]],
          " NM",
        ],
        "text-size": 11,
        "text-anchor": "center",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "#000000",
        "text-halo-width": 1.5,
      },
    });
  }
}

export function removeThreatLayers(map: maplibregl.Map): void {
  const layers = [THREAT_LABELS_LAYER, THREAT_RINGS_LINE_LAYER, THREAT_RINGS_FILL_LAYER];
  const sources = ["threat-label-points", THREAT_RINGS_SOURCE];

  layers.forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  sources.forEach((id) => {
    if (map.getSource(id)) map.removeSource(id);
  });
}

/**
 * Returns the circle polygon features for all threats (used by route-corridor
 * to detect intersections).
 */
export function getThreatCircleFeatures(
  threats: Threat[],
): GeoJSON.Feature<GeoJSON.Polygon>[] {
  return threats
    .filter((t) => t.active)
    .map((t) => {
      const circle = createCirclePolygon([t.lon, t.lat], t.rangeNm);
      return {
        ...circle,
        properties: {
          id: t.id,
          name: t.name,
          lethality: t.lethality,
          color: LETHALITY_COLORS[t.lethality] || "#666",
        },
      } as GeoJSON.Feature<GeoJSON.Polygon>;
    });
}
