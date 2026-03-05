import maplibregl from "maplibre-gl";

const TERRAIN_SOURCE_ID = "terrain-dem";
const HILLSHADE_SOURCE_ID = "terrain-hillshade";
const HILLSHADE_LAYER_ID = "terrain-hillshade-layer";

let terrainEnabled = false;

export function addTerrainLayer(map: maplibregl.Map): void {
  if (map.getSource(TERRAIN_SOURCE_ID)) return;

  // Add terrain raster-dem source using MapTiler/Terrarium terrain tiles
  map.addSource(TERRAIN_SOURCE_ID, {
    type: "raster-dem",
    tiles: [
      "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
    ],
    tileSize: 256,
    encoding: "terrarium",
    maxzoom: 15,
  });

  // Add a separate hillshade source (same tiles, separate source for hillshade layer)
  map.addSource(HILLSHADE_SOURCE_ID, {
    type: "raster-dem",
    tiles: [
      "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
    ],
    tileSize: 256,
    encoding: "terrarium",
    maxzoom: 15,
  });

  // Add hillshade layer for 3D terrain visualization
  map.addLayer({
    id: HILLSHADE_LAYER_ID,
    type: "hillshade",
    source: HILLSHADE_SOURCE_ID,
    paint: {
      "hillshade-exaggeration": 0.6,
      "hillshade-shadow-color": "#000000",
      "hillshade-highlight-color": "#ffffff",
      "hillshade-illumination-direction": 315,
      "hillshade-illumination-anchor": "viewport",
    },
  });

  // Set terrain for 3D exaggeration
  map.setTerrain({
    source: TERRAIN_SOURCE_ID,
    exaggeration: 1.5,
  });

  terrainEnabled = true;
}

export function removeTerrainLayer(map: maplibregl.Map): void {
  if (map.getTerrain()) {
    map.setTerrain(null as any);
  }
  if (map.getLayer(HILLSHADE_LAYER_ID)) {
    map.removeLayer(HILLSHADE_LAYER_ID);
  }
  if (map.getSource(HILLSHADE_SOURCE_ID)) {
    map.removeSource(HILLSHADE_SOURCE_ID);
  }
  if (map.getSource(TERRAIN_SOURCE_ID)) {
    map.removeSource(TERRAIN_SOURCE_ID);
  }
  terrainEnabled = false;
}

export function toggleTerrainLayer(map: maplibregl.Map): boolean {
  if (terrainEnabled) {
    removeTerrainLayer(map);
    return false;
  } else {
    addTerrainLayer(map);
    return true;
  }
}

export function isTerrainEnabled(): boolean {
  return terrainEnabled;
}
