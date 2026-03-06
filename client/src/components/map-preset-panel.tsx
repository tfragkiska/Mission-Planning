import { useState } from "react";
import type { MapLayerPreset, MapLayerVisibility, MapStyleId } from "../lib/map-preset-types";
import { useMapPresetStore } from "../stores/map-preset-store";

interface Props {
  currentLayers: MapLayerVisibility;
  currentMapStyle: MapStyleId;
  onApplyPreset: (preset: MapLayerPreset) => void;
}

const LAYER_ICONS: Record<keyof MapLayerVisibility, { label: string; color: string }> = {
  terrain: { label: "TER", color: "text-green-400" },
  threatRings: { label: "THR", color: "text-danger-500" },
  routeCorridor: { label: "COR", color: "text-command-400" },
  routeLabels: { label: "LBL", color: "text-tactical-500" },
  airspaces: { label: "ASP", color: "text-accent-400" },
  hillshade: { label: "HIL", color: "text-emerald-400" },
  satellite: { label: "SAT", color: "text-blue-300" },
};

export default function MapPresetPanel({ currentLayers, currentMapStyle, onApplyPreset }: Props) {
  const { presets, activePresetId, setActivePreset, saveCustomPreset, deleteCustomPreset } =
    useMapPresetStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");

  const handleApply = (preset: MapLayerPreset) => {
    setActivePreset(preset.id);
    onApplyPreset(preset);
    setIsOpen(false);
  };

  const handleSave = () => {
    if (!saveName.trim()) return;
    const preset = saveCustomPreset(
      saveName.trim(),
      saveDescription.trim(),
      currentLayers,
      currentMapStyle,
    );
    onApplyPreset(preset);
    setSaveName("");
    setSaveDescription("");
    setShowSaveForm(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteCustomPreset(id);
  };

  const activePreset = presets.find((p) => p.id === activePresetId);
  const builtInPresets = presets.filter((p) => p.isBuiltIn);
  const customPresets = presets.filter((p) => !p.isBuiltIn);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 border ${
          activePresetId
            ? "bg-command-500/20 text-command-400 border-command-500/40 shadow-glow-blue"
            : "glass-panel text-military-300 border-military-700/50 hover:text-gray-100 hover:border-military-500"
        }`}
        title="Map layer presets"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 5a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9zm9 0a1 1 0 011-1h3a1 1 0 011 1v6a1 1 0 01-1 1h-3a1 1 0 01-1-1V9z" />
        </svg>
        {activePreset ? activePreset.name : "Presets"}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 glass-panel border border-military-700/50 rounded-xl p-3 shadow-2xl z-50 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-military-700 scrollbar-track-transparent">
          <p className="text-[10px] font-bold uppercase tracking-widest text-military-500 px-1 pb-2 border-b border-military-700/50 mb-2">
            Layer Presets
          </p>

          {/* Built-in presets */}
          <div className="space-y-1 mb-3">
            {builtInPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleApply(preset)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 border ${
                  activePresetId === preset.id
                    ? "bg-command-500/15 border-command-500/40 text-command-400"
                    : "border-transparent hover:bg-military-700/50 hover:border-military-600/50 text-military-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wide">{preset.name}</span>
                  {activePresetId === preset.id && (
                    <span className="w-2 h-2 rounded-full bg-command-400 shadow-glow-blue" />
                  )}
                </div>
                <p className="text-[10px] text-military-500 leading-snug mb-1.5">{preset.description}</p>
                <div className="flex gap-1 flex-wrap">
                  {(Object.keys(preset.layers) as (keyof MapLayerVisibility)[]).map((key) => {
                    const icon = LAYER_ICONS[key];
                    const active = preset.layers[key];
                    return (
                      <span
                        key={key}
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          active ? `${icon.color} bg-military-700/80` : "text-military-600 bg-military-800/50"
                        }`}
                      >
                        {icon.label}
                      </span>
                    );
                  })}
                </div>
              </button>
            ))}
          </div>

          {/* Custom presets */}
          {customPresets.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-military-500 px-1 pb-2 border-b border-military-700/50 mb-2">
                Custom Presets
              </p>
              <div className="space-y-1 mb-3">
                {customPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApply(preset)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 border group ${
                      activePresetId === preset.id
                        ? "bg-command-500/15 border-command-500/40 text-command-400"
                        : "border-transparent hover:bg-military-700/50 hover:border-military-600/50 text-military-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase tracking-wide">{preset.name}</span>
                      <div className="flex items-center gap-2">
                        {activePresetId === preset.id && (
                          <span className="w-2 h-2 rounded-full bg-command-400 shadow-glow-blue" />
                        )}
                        <span
                          onClick={(e) => handleDelete(e, preset.id)}
                          className="opacity-0 group-hover:opacity-100 text-danger-500 hover:text-danger-400 text-[10px] font-bold uppercase transition-opacity cursor-pointer"
                          title="Delete preset"
                        >
                          DEL
                        </span>
                      </div>
                    </div>
                    {preset.description && (
                      <p className="text-[10px] text-military-500 leading-snug mb-1.5">{preset.description}</p>
                    )}
                    <div className="flex gap-1 flex-wrap">
                      {(Object.keys(preset.layers) as (keyof MapLayerVisibility)[]).map((key) => {
                        const icon = LAYER_ICONS[key];
                        const active = preset.layers[key];
                        return (
                          <span
                            key={key}
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              active ? `${icon.color} bg-military-700/80` : "text-military-600 bg-military-800/50"
                            }`}
                          >
                            {icon.label}
                          </span>
                        );
                      })}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Save current config */}
          <div className="border-t border-military-700/50 pt-2">
            {showSaveForm ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Preset name"
                  className="w-full px-3 py-2 bg-military-800/80 border border-military-600/50 rounded-lg text-xs text-gray-200 placeholder-military-500 focus:outline-none focus:border-command-500/50"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") setShowSaveForm(false);
                  }}
                />
                <input
                  type="text"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 bg-military-800/80 border border-military-600/50 rounded-lg text-xs text-gray-200 placeholder-military-500 focus:outline-none focus:border-command-500/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") setShowSaveForm(false);
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={!saveName.trim()}
                    className="flex-1 px-3 py-2 bg-command-500/20 text-command-400 border border-command-500/40 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-command-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveForm(false);
                      setSaveName("");
                      setSaveDescription("");
                    }}
                    className="px-3 py-2 text-military-400 border border-military-700/50 rounded-lg text-xs font-bold uppercase tracking-wide hover:text-military-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveForm(true)}
                className="w-full px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide text-tactical-500 border border-tactical-600/30 hover:bg-tactical-600/10 transition-all duration-200"
              >
                Save Current Config
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
