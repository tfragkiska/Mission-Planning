import { useState } from "react";
import maplibregl from "maplibre-gl";
import TerrainToggle from "./terrain-toggle";
import { toggleMeasurement, isMeasurementActive, clearMeasurement } from "../map/measurement-tool";

interface Props {
  map: maplibregl.Map | null;
  threatLayerVisible: boolean;
  corridorVisible: boolean;
  labelsVisible: boolean;
  onToggleThreatLayer: () => void;
  onToggleCorridor: () => void;
  onToggleLabels: () => void;
}

export default function MapControls({
  map,
  threatLayerVisible,
  corridorVisible,
  labelsVisible,
  onToggleThreatLayer,
  onToggleCorridor,
  onToggleLabels,
}: Props) {
  const [measuring, setMeasuring] = useState(isMeasurementActive());

  const handleMeasureToggle = () => {
    if (!map) return;
    const newState = toggleMeasurement(map);
    setMeasuring(newState);
  };

  const handleMeasureClear = () => {
    if (!map) return;
    clearMeasurement(map);
  };

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
      <div className="glass-panel border border-military-700/50 rounded-xl p-2 flex flex-col gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-military-500 px-1 pb-1 border-b border-military-700/50">
          Map Controls
        </p>

        <TerrainToggle map={map} />

        <button
          onClick={onToggleThreatLayer}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 border ${
            threatLayerVisible
              ? "bg-danger-600/20 text-danger-500 border-danger-600/40"
              : "glass-panel text-military-300 border-military-700/50 hover:text-gray-100 hover:border-military-500"
          }`}
          title="Toggle threat range rings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm0-3a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          Threats
        </button>

        <button
          onClick={onToggleCorridor}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 border ${
            corridorVisible
              ? "bg-command-500/20 text-command-400 border-command-500/40"
              : "glass-panel text-military-300 border-military-700/50 hover:text-gray-100 hover:border-military-500"
          }`}
          title="Toggle route corridor (2 NM)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M3 5a1 1 0 011-1h12a1 1 0 011 1v2H3V5zm0 4h14v2H3V9zm0 4h14v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
          </svg>
          Corridor
        </button>

        <button
          onClick={onToggleLabels}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 border ${
            labelsVisible
              ? "bg-tactical-600/20 text-tactical-500 border-tactical-600/40"
              : "glass-panel text-military-300 border-military-700/50 hover:text-gray-100 hover:border-military-500"
          }`}
          title="Toggle distance/bearing labels"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zM7 11a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm1 3a1 1 0 100 2h2a1 1 0 100-2H8z" clipRule="evenodd" />
          </svg>
          Labels
        </button>

        <div className="border-t border-military-700/50 pt-1.5 mt-0.5">
          <button
            onClick={handleMeasureToggle}
            disabled={!map}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 border ${
              measuring
                ? "bg-accent-600/20 text-accent-400 border-accent-600/40 shadow-glow-amber"
                : "glass-panel text-military-300 border-military-700/50 hover:text-gray-100 hover:border-military-500"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Click-to-measure distance and bearing"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M2 4.5A2.5 2.5 0 014.5 2h11A2.5 2.5 0 0118 4.5v.71a.75.75 0 01-1.5 0V4.5a1 1 0 00-1-1h-11a1 1 0 00-1 1v11a1 1 0 001 1h.71a.75.75 0 010 1.5H4.5A2.5 2.5 0 012 15.5v-11zM7.5 7a.75.75 0 00-.75.75v4.5a.75.75 0 001.5 0v-4.5A.75.75 0 007.5 7zm3 2a.75.75 0 00-.75.75v2.5a.75.75 0 001.5 0v-2.5A.75.75 0 0010.5 9zm3-1a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 0013.5 8z" clipRule="evenodd" />
            </svg>
            {measuring ? "Stop Measure" : "Measure"}
          </button>
          {measuring && (
            <button
              onClick={handleMeasureClear}
              className="w-full mt-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide text-military-400 hover:text-military-200 border border-military-700/50 hover:border-military-600 transition-all duration-200"
            >
              Clear Points
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
