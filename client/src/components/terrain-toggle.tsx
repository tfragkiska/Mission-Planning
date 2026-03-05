import { useState } from "react";
import maplibregl from "maplibre-gl";
import { toggleTerrainLayer, isTerrainEnabled } from "../map/terrain-layer";

interface Props {
  map: maplibregl.Map | null;
}

export default function TerrainToggle({ map }: Props) {
  const [enabled, setEnabled] = useState(isTerrainEnabled());

  const handleToggle = () => {
    if (!map) return;
    const newState = toggleTerrainLayer(map);
    setEnabled(newState);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={!map}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 border ${
        enabled
          ? "bg-command-500/20 text-command-400 border-command-500/40 shadow-glow-blue"
          : "glass-panel text-military-300 border-military-700/50 hover:text-gray-100 hover:border-military-500"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title="Toggle terrain elevation overlay"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
      >
        <path d="M2 16l4.5-7 3 4.5L13 8l5 8H2z" />
      </svg>
      Terrain
    </button>
  );
}
