import { create } from "zustand";
import type { MapLayerPreset, MapLayerVisibility, MapStyleId } from "../lib/map-preset-types";
import { BUILT_IN_PRESETS } from "../lib/map-preset-types";

const STORAGE_KEY = "mission-planner-custom-presets";

function loadCustomPresets(): MapLayerPreset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as MapLayerPreset[];
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

function saveCustomPresets(presets: MapLayerPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // ignore storage errors
  }
}

interface MapPresetState {
  presets: MapLayerPreset[];
  activePresetId: string | null;
  setActivePreset: (id: string) => MapLayerPreset | null;
  saveCustomPreset: (name: string, description: string, layers: MapLayerVisibility, mapStyle: MapStyleId) => MapLayerPreset;
  deleteCustomPreset: (id: string) => void;
  updatePreset: (id: string, updates: Partial<Pick<MapLayerPreset, "name" | "description" | "layers" | "mapStyle">>) => void;
  clearActivePreset: () => void;
}

export const useMapPresetStore = create<MapPresetState>((set, get) => ({
  presets: [...BUILT_IN_PRESETS, ...loadCustomPresets()],
  activePresetId: null,

  setActivePreset: (id: string) => {
    const preset = get().presets.find((p) => p.id === id) || null;
    if (preset) {
      set({ activePresetId: id });
    }
    return preset;
  },

  saveCustomPreset: (name, description, layers, mapStyle) => {
    const preset: MapLayerPreset = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      description,
      layers: { ...layers },
      mapStyle,
      isBuiltIn: false,
    };
    const updatedPresets = [...get().presets, preset];
    set({ presets: updatedPresets, activePresetId: preset.id });
    saveCustomPresets(updatedPresets.filter((p) => !p.isBuiltIn));
    return preset;
  },

  deleteCustomPreset: (id: string) => {
    const state = get();
    const preset = state.presets.find((p) => p.id === id);
    if (!preset || preset.isBuiltIn) return;
    const updatedPresets = state.presets.filter((p) => p.id !== id);
    set({
      presets: updatedPresets,
      activePresetId: state.activePresetId === id ? null : state.activePresetId,
    });
    saveCustomPresets(updatedPresets.filter((p) => !p.isBuiltIn));
  },

  updatePreset: (id, updates) => {
    const state = get();
    const preset = state.presets.find((p) => p.id === id);
    if (!preset || preset.isBuiltIn) return;
    const updatedPresets = state.presets.map((p) =>
      p.id === id ? { ...p, ...updates } : p,
    );
    set({ presets: updatedPresets });
    saveCustomPresets(updatedPresets.filter((p) => !p.isBuiltIn));
  },

  clearActivePreset: () => {
    set({ activePresetId: null });
  },
}));
