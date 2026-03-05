import type { Waypoint } from "../lib/types";

interface Props {
  waypoints: Waypoint[];
  editable: boolean;
  onDelete?: (id: string) => void;
}

export default function WaypointPanel({ waypoints, editable, onDelete }: Props) {
  return (
    <div className="bg-military-800 border border-military-700 rounded-lg p-4">
      <h3 className="font-semibold mb-3">Waypoints ({waypoints.length})</h3>
      {waypoints.length === 0 ? (
        <p className="text-sm text-military-400">
          {editable ? "Click on the map to add waypoints" : "No waypoints"}
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {waypoints.map((wp, i) => (
            <div
              key={wp.id}
              className="flex items-center justify-between bg-military-700 rounded px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium text-blue-400 mr-2">#{i + 1}</span>
                <span>{wp.name || `Waypoint ${i + 1}`}</span>
                <span className="text-military-400 ml-2">
                  {wp.lat.toFixed(4)}, {wp.lon.toFixed(4)}
                </span>
                {wp.altitude && (
                  <span className="text-military-400 ml-2">{wp.altitude}ft</span>
                )}
              </div>
              {editable && onDelete && (
                <button
                  onClick={() => onDelete(wp.id)}
                  className="text-red-400 hover:text-red-300 ml-2"
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
