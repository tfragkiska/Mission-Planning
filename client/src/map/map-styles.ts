import maplibregl from "maplibre-gl";
import type { MapStyleId } from "../lib/map-preset-types";

export interface BasemapStyle {
  id: MapStyleId;
  name: string;
  icon: string;
  style: maplibregl.StyleSpecification;
}

const darkStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "&copy; CARTO &copy; OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "carto-dark",
      type: "raster",
      source: "carto-dark",
    },
  ],
};

const satelliteStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "esri-satellite": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "&copy; Esri, Maxar, Earthstar Geographics",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "esri-satellite",
      type: "raster",
      source: "esri-satellite",
    },
  ],
};

const topographicStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "otm-topo": {
      type: "raster",
      tiles: [
        "https://tile.opentopomap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenTopoMap &copy; OpenStreetMap contributors",
      maxzoom: 17,
    },
  },
  layers: [
    {
      id: "otm-topo",
      type: "raster",
      source: "otm-topo",
    },
  ],
};

export const BASEMAP_STYLES: BasemapStyle[] = [
  { id: "dark", name: "Dark", icon: "moon", style: darkStyle },
  { id: "satellite", name: "Satellite", icon: "satellite", style: satelliteStyle },
  { id: "topographic", name: "Topo", icon: "mountain", style: topographicStyle },
];

export function getBasemapStyle(id: MapStyleId): maplibregl.StyleSpecification {
  const found = BASEMAP_STYLES.find((s) => s.id === id);
  return found ? found.style : darkStyle;
}

/**
 * Switch the basemap style on a live map instance.
 * Preserves the current center and zoom after style swap.
 */
export function switchBasemapStyle(
  map: maplibregl.Map,
  styleId: MapStyleId,
  onStyleLoaded?: () => void,
): void {
  const center = map.getCenter();
  const zoom = map.getZoom();
  const bearing = map.getBearing();
  const pitch = map.getPitch();
  const style = getBasemapStyle(styleId);

  map.setStyle(style);

  map.once("styledata", () => {
    map.setCenter(center);
    map.setZoom(zoom);
    map.setBearing(bearing);
    map.setPitch(pitch);
    onStyleLoaded?.();
  });
}
