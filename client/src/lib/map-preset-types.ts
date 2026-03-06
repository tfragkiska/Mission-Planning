export interface MapLayerVisibility {
  terrain: boolean;
  threatRings: boolean;
  routeCorridor: boolean;
  routeLabels: boolean;
  airspaces: boolean;
  hillshade: boolean;
  satellite: boolean;
}

export type MapStyleId = "dark" | "satellite" | "topographic";

export interface MapLayerPreset {
  id: string;
  name: string;
  description: string;
  layers: MapLayerVisibility;
  mapStyle: MapStyleId;
  zoom?: number;
  center?: [number, number];
  isBuiltIn: boolean;
}

export const BUILT_IN_PRESETS: MapLayerPreset[] = [
  {
    id: "tactical-overview",
    name: "Tactical Overview",
    description: "All layers enabled with dark basemap for full situational awareness",
    layers: {
      terrain: true,
      threatRings: true,
      routeCorridor: true,
      routeLabels: true,
      airspaces: true,
      hillshade: true,
      satellite: false,
    },
    mapStyle: "dark",
    isBuiltIn: true,
  },
  {
    id: "route-planning",
    name: "Route Planning",
    description: "Route corridor, labels, and waypoints. Threats hidden for clean planning",
    layers: {
      terrain: false,
      threatRings: false,
      routeCorridor: true,
      routeLabels: true,
      airspaces: true,
      hillshade: false,
      satellite: false,
    },
    mapStyle: "dark",
    isBuiltIn: true,
  },
  {
    id: "threat-assessment",
    name: "Threat Assessment",
    description: "Threat rings, airspaces, and route overlay. No terrain distractions",
    layers: {
      terrain: false,
      threatRings: true,
      routeCorridor: true,
      routeLabels: true,
      airspaces: true,
      hillshade: false,
      satellite: false,
    },
    mapStyle: "dark",
    isBuiltIn: true,
  },
  {
    id: "terrain-analysis",
    name: "Terrain Analysis",
    description: "Terrain and hillshade enabled with minimal overlays for elevation study",
    layers: {
      terrain: true,
      threatRings: false,
      routeCorridor: false,
      routeLabels: false,
      airspaces: false,
      hillshade: true,
      satellite: false,
    },
    mapStyle: "topographic",
    isBuiltIn: true,
  },
  {
    id: "clean-view",
    name: "Clean View",
    description: "Minimal view with just route and waypoints for briefing screenshots",
    layers: {
      terrain: false,
      threatRings: false,
      routeCorridor: false,
      routeLabels: false,
      airspaces: false,
      hillshade: false,
      satellite: false,
    },
    mapStyle: "dark",
    isBuiltIn: true,
  },
  {
    id: "satellite-view",
    name: "Satellite",
    description: "Satellite imagery basemap with all overlay layers enabled",
    layers: {
      terrain: true,
      threatRings: true,
      routeCorridor: true,
      routeLabels: true,
      airspaces: true,
      hillshade: false,
      satellite: true,
    },
    mapStyle: "satellite",
    isBuiltIn: true,
  },
];
