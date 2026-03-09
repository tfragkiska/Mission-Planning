import React, { useState, useCallback } from "react";
import type { Waypoint } from "../lib/types";

interface Props {
  waypoints: Waypoint[];
  editable: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, data: Record<string, unknown>) => void;
}

function EditableWaypoint({
  wp,
  index,
  editable,
  onDelete,
  onUpdate,
}: {
  wp: Waypoint;
  index: number;
  editable: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, data: Record<string, unknown>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(wp.name || "");
  const [altitude, setAltitude] = useState(wp.altitude?.toString() || "");
  const [speed, setSpeed] = useState(wp.speed?.toString() || "");
  const [type, setType] = useState(wp.type || "WAYPOINT");

  const handleSave = useCallback(() => {
    if (!onUpdate) return;
    onUpdate(wp.id, {
      name: name || undefined,
      altitude: altitude ? Number(altitude) : undefined,
      speed: speed ? Number(speed) : undefined,
      type,
    });
    setEditing(false);
  }, [wp.id, name, altitude, speed, type, onUpdate]);

  const handleCancel = useCallback(() => {
    setName(wp.name || "");
    setAltitude(wp.altitude?.toString() || "");
    setSpeed(wp.speed?.toString() || "");
    setType(wp.type || "WAYPOINT");
    setEditing(false);
  }, [wp]);

  if (editing && editable) {
    return (
      <div className="bg-[var(--color-bg-tertiary)]/60 rounded-lg px-3 py-3 text-sm border border-command-500/30">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Waypoint ${index + 1}`}
              className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded px-2 py-1 text-xs text-[var(--color-input-text)] mt-0.5"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded px-2 py-1 text-xs text-[var(--color-input-text)] mt-0.5"
            >
              <option value="INITIAL_POINT">Initial Point</option>
              <option value="WAYPOINT">Waypoint</option>
              <option value="TARGET">Target</option>
              <option value="EGRESS_POINT">Egress Point</option>
              <option value="LANDING">Landing</option>
              <option value="RALLY_POINT">Rally Point</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Altitude (ft)</label>
            <input
              type="number"
              value={altitude}
              onChange={(e) => setAltitude(e.target.value)}
              placeholder="e.g. 25000"
              className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded px-2 py-1 text-xs text-[var(--color-input-text)] mt-0.5"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Speed (kts)</label>
            <input
              type="number"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              placeholder="e.g. 450"
              className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded px-2 py-1 text-xs text-[var(--color-input-text)] mt-0.5"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-command-500 hover:bg-command-400 rounded text-xs font-bold text-white transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1 bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-tertiary)] rounded text-xs font-medium text-[var(--color-text-secondary)] border border-[var(--color-border-primary)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between bg-[var(--color-bg-tertiary)]/60 hover:bg-[var(--color-bg-elevated)]/60 rounded-lg px-3 py-2 text-sm transition-colors duration-150 group ${editable ? "cursor-pointer" : ""}`}
      onClick={() => editable && setEditing(true)}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-command-600/20 text-command-400 text-xs font-bold">
          {index + 1}
        </span>
        <div>
          <span className="font-medium text-[var(--color-text-primary)]">{wp.name || `Waypoint ${index + 1}`}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[var(--color-text-secondary)] font-mono text-xs">
              {wp.lat.toFixed(4)}, {wp.lon.toFixed(4)}
            </span>
            {wp.altitude && (
              <span className="text-accent-400 font-mono text-xs font-semibold">{wp.altitude}ft</span>
            )}
            {wp.speed && (
              <span className="text-command-400 font-mono text-xs font-semibold">{wp.speed}kts</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {editable && (
          <span className="text-[10px] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity mr-1">
            click to edit
          </span>
        )}
        {editable && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(wp.id); }}
            className="text-danger-500 hover:text-red-300 hover:scale-110 ml-1 opacity-0 group-hover:opacity-100 transition-all duration-150 text-xs font-bold w-5 h-5 flex items-center justify-center rounded"
          >
            x
          </button>
        )}
      </div>
    </div>
  );
}

function WaypointPanelInner({ waypoints, editable, onDelete, onUpdate }: Props) {
  return (
    <div className="glass-panel border border-[var(--color-border-primary)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--color-border-primary)]">
        <div className="flex items-center gap-2">
          <span className="text-tactical-500 text-sm font-bold">{"//"}</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-primary)]">Waypoints</h3>
        </div>
        <span className="bg-tactical-700/40 text-tactical-500 text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
          {waypoints.length}
        </span>
      </div>
      {waypoints.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] italic">
          {editable ? "Click on the map to add waypoints" : "No waypoints"}
        </p>
      ) : (
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
          {waypoints.map((wp, i) => (
            <EditableWaypoint
              key={wp.id}
              wp={wp}
              index={i}
              editable={editable}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(WaypointPanelInner);
