import React from "react";
import type { Waypoint } from "../lib/types";

interface Props {
  waypoints: Waypoint[];
  editable: boolean;
  onDelete?: (id: string) => void;
}

function WaypointPanelInner({ waypoints, editable, onDelete }: Props) {
  return (
    <div className="glass-panel border border-military-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-military-700/50">
        <div className="flex items-center gap-2">
          <span className="text-tactical-500 text-sm font-bold">{"//"}</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-military-300">Waypoints</h3>
        </div>
        <span className="bg-tactical-700/40 text-tactical-500 text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
          {waypoints.length}
        </span>
      </div>
      {waypoints.length === 0 ? (
        <p className="text-sm text-military-500 italic">
          {editable ? "Click on the map to add waypoints" : "No waypoints"}
        </p>
      ) : (
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {waypoints.map((wp, i) => (
            <div
              key={wp.id}
              className="flex items-center justify-between bg-military-800/60 hover:bg-military-700/60 rounded-lg px-3 py-2 text-sm transition-colors duration-150 group"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-command-600/20 text-command-400 text-xs font-bold">
                  {i + 1}
                </span>
                <div>
                  <span className="font-medium text-gray-200">{wp.name || `Waypoint ${i + 1}`}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-military-400 font-mono text-xs">
                      {wp.lat.toFixed(4)}, {wp.lon.toFixed(4)}
                    </span>
                    {wp.altitude && (
                      <span className="text-accent-400 font-mono text-xs font-semibold">{wp.altitude}ft</span>
                    )}
                  </div>
                </div>
              </div>
              {editable && onDelete && (
                <button
                  onClick={() => onDelete(wp.id)}
                  className="text-danger-500 hover:text-red-300 hover:scale-110 ml-2 opacity-0 group-hover:opacity-100 transition-all duration-150 text-xs font-bold w-5 h-5 flex items-center justify-center rounded"
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(WaypointPanelInner);
