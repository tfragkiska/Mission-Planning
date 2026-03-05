import maplibregl from "maplibre-gl";
import type { Airspace } from "../lib/airspace-types";

const AIRSPACE_COLORS: Record<string, string> = {
  RESTRICTED: "#dc2626",
  PROHIBITED: "#7c2d12",
  MOA: "#ca8a04",
  WARNING: "#ea580c",
  ALERT: "#9333ea",
  TFR: "#e11d48",
};

const SOURCE_ID = "airspace-polygons";
const FILL_LAYER_ID = "airspace-fill";
const LINE_LAYER_ID = "airspace-outline";
const LABEL_LAYER_ID = "airspace-labels";

export function updateAirspaceLayers(map: maplibregl.Map, airspaces: Airspace[], visibleIds?: Set<string>) {
  const features = airspaces
    .filter((a) => !visibleIds || visibleIds.has(a.id))
    .map((a) => ({
      type: "Feature" as const,
      properties: {
        id: a.id,
        name: a.name,
        type: a.type,
        color: AIRSPACE_COLORS[a.type] || "#666",
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [a.coordinates],
      },
    }));

  const geojson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  if (map.getSource(SOURCE_ID)) {
    (map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource).setData(geojson);
  } else {
    map.addSource(SOURCE_ID, { type: "geojson", data: geojson });

    map.addLayer({
      id: FILL_LAYER_ID,
      type: "fill",
      source: SOURCE_ID,
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": 0.15,
      },
    });

    map.addLayer({
      id: LINE_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      paint: {
        "line-color": ["get", "color"],
        "line-width": 2,
        "line-dasharray": [4, 2],
      },
    });

    map.addLayer({
      id: LABEL_LAYER_ID,
      type: "symbol",
      source: SOURCE_ID,
      layout: {
        "text-field": ["concat", ["get", "name"], "\n", ["get", "type"]],
        "text-size": 11,
        "text-anchor": "center",
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "#000000",
        "text-halo-width": 1,
      },
    });
  }
}

export function removeAirspaceLayers(map: maplibregl.Map) {
  if (map.getLayer(LABEL_LAYER_ID)) map.removeLayer(LABEL_LAYER_ID);
  if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
  if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}
