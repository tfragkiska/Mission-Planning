import maplibregl from "maplibre-gl";

const MEASURE_SOURCE = "measurement-line";
const MEASURE_LINE_LAYER = "measurement-line-layer";
const MEASURE_POINTS_SOURCE = "measurement-points";
const MEASURE_POINTS_LAYER = "measurement-points-layer";
const MEASURE_LABELS_SOURCE = "measurement-labels";
const MEASURE_LABELS_LAYER = "measurement-labels-layer";

interface MeasurePoint {
  lon: number;
  lat: number;
}

let measureActive = false;
let measurePoints: MeasurePoint[] = [];
let clickHandler: ((e: maplibregl.MapMouseEvent) => void) | null = null;
let cursorBackup: string = "";

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

function computeBearing(
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

function updateMeasureLayers(map: maplibregl.Map): void {
  // Line
  const lineCoords = measurePoints.map((p) => [p.lon, p.lat]);
  const lineGeoJson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features:
      lineCoords.length >= 2
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: lineCoords },
            },
          ]
        : [],
  };

  // Points
  const pointFeatures: GeoJSON.Feature[] = measurePoints.map((p, i) => ({
    type: "Feature",
    properties: { index: i + 1 },
    geometry: { type: "Point", coordinates: [p.lon, p.lat] },
  }));

  const pointsGeoJson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: pointFeatures,
  };

  // Labels at segment midpoints
  const labelFeatures: GeoJSON.Feature[] = [];
  let cumulativeDist = 0;
  for (let i = 1; i < measurePoints.length; i++) {
    const p1 = measurePoints[i - 1];
    const p2 = measurePoints[i];
    const segDist = haversineDistanceNm(p1.lat, p1.lon, p2.lat, p2.lon);
    cumulativeDist += segDist;
    const brg = computeBearing(p1.lat, p1.lon, p2.lat, p2.lon);

    labelFeatures.push({
      type: "Feature",
      properties: {
        label: `${segDist.toFixed(1)} NM / ${Math.round(brg)}°\nTotal: ${cumulativeDist.toFixed(1)} NM`,
      },
      geometry: {
        type: "Point",
        coordinates: [(p1.lon + p2.lon) / 2, (p1.lat + p2.lat) / 2],
      },
    });
  }

  const labelsGeoJson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: labelFeatures,
  };

  // Update sources
  if (map.getSource(MEASURE_SOURCE)) {
    (map.getSource(MEASURE_SOURCE) as maplibregl.GeoJSONSource).setData(
      lineGeoJson,
    );
  }
  if (map.getSource(MEASURE_POINTS_SOURCE)) {
    (
      map.getSource(MEASURE_POINTS_SOURCE) as maplibregl.GeoJSONSource
    ).setData(pointsGeoJson);
  }
  if (map.getSource(MEASURE_LABELS_SOURCE)) {
    (
      map.getSource(MEASURE_LABELS_SOURCE) as maplibregl.GeoJSONSource
    ).setData(labelsGeoJson);
  }
}

function ensureLayers(map: maplibregl.Map): void {
  const emptyFc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [],
  };

  if (!map.getSource(MEASURE_SOURCE)) {
    map.addSource(MEASURE_SOURCE, { type: "geojson", data: emptyFc });
    map.addLayer({
      id: MEASURE_LINE_LAYER,
      type: "line",
      source: MEASURE_SOURCE,
      paint: {
        "line-color": "#f59e0b",
        "line-width": 2,
        "line-dasharray": [3, 2],
      },
    });
  }

  if (!map.getSource(MEASURE_POINTS_SOURCE)) {
    map.addSource(MEASURE_POINTS_SOURCE, { type: "geojson", data: emptyFc });
    map.addLayer({
      id: MEASURE_POINTS_LAYER,
      type: "circle",
      source: MEASURE_POINTS_SOURCE,
      paint: {
        "circle-radius": 5,
        "circle-color": "#f59e0b",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
  }

  if (!map.getSource(MEASURE_LABELS_SOURCE)) {
    map.addSource(MEASURE_LABELS_SOURCE, { type: "geojson", data: emptyFc });
    map.addLayer({
      id: MEASURE_LABELS_LAYER,
      type: "symbol",
      source: MEASURE_LABELS_SOURCE,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-anchor": "bottom",
        "text-offset": [0, -1],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#fbbf24",
        "text-halo-color": "#000000",
        "text-halo-width": 1.5,
      },
    });
  }
}

function removeLayers(map: maplibregl.Map): void {
  const layers = [MEASURE_LABELS_LAYER, MEASURE_POINTS_LAYER, MEASURE_LINE_LAYER];
  const sources = [MEASURE_LABELS_SOURCE, MEASURE_POINTS_SOURCE, MEASURE_SOURCE];

  layers.forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  sources.forEach((id) => {
    if (map.getSource(id)) map.removeSource(id);
  });
}

export function activateMeasurement(map: maplibregl.Map): void {
  if (measureActive) return;

  measureActive = true;
  measurePoints = [];
  cursorBackup = map.getCanvas().style.cursor;
  map.getCanvas().style.cursor = "crosshair";

  ensureLayers(map);

  clickHandler = (e: maplibregl.MapMouseEvent) => {
    e.preventDefault();
    measurePoints.push({ lon: e.lngLat.lng, lat: e.lngLat.lat });
    updateMeasureLayers(map);
  };

  map.on("click", clickHandler);
}

export function deactivateMeasurement(map: maplibregl.Map): void {
  if (!measureActive) return;

  measureActive = false;
  map.getCanvas().style.cursor = cursorBackup;

  if (clickHandler) {
    map.off("click", clickHandler);
    clickHandler = null;
  }

  // Clear measurement data
  measurePoints = [];
  removeLayers(map);
}

export function toggleMeasurement(map: maplibregl.Map): boolean {
  if (measureActive) {
    deactivateMeasurement(map);
    return false;
  } else {
    activateMeasurement(map);
    return true;
  }
}

export function isMeasurementActive(): boolean {
  return measureActive;
}

export function clearMeasurement(map: maplibregl.Map): void {
  measurePoints = [];
  if (map.getSource(MEASURE_SOURCE)) {
    updateMeasureLayers(map);
  }
}
