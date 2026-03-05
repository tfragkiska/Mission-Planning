import { useState, useEffect } from "react";
import type { Airspace } from "../lib/airspace-types";

const AIRSPACE_COLORS: Record<string, string> = {
  RESTRICTED: "#dc2626",
  PROHIBITED: "#7c2d12",
  MOA: "#ca8a04",
  WARNING: "#ea580c",
  ALERT: "#9333ea",
  TFR: "#e11d48",
};

interface Props {
  airspaces: Airspace[];
  onToggleVisibility: (id: string, visible: boolean) => void;
  onCreateAirspace?: (data: Omit<Airspace, "id" | "active">) => void;
  onDeleteAirspace?: (id: string) => void;
  editable: boolean;
}

export default function AirspacePanel({ airspaces, onToggleVisibility, onCreateAirspace, onDeleteAirspace, editable }: Props) {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set(airspaces.map(a => a.id)));
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<Airspace["type"]>("RESTRICTED");
  const [minAlt, setMinAlt] = useState("");
  const [maxAlt, setMaxAlt] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setVisibleIds(new Set(airspaces.map(a => a.id)));
  }, [airspaces]);

  const handleToggle = (id: string) => {
    const newVisible = new Set(visibleIds);
    if (newVisible.has(id)) {
      newVisible.delete(id);
      onToggleVisibility(id, false);
    } else {
      newVisible.add(id);
      onToggleVisibility(id, true);
    }
    setVisibleIds(newVisible);
  };

  return (
    <div className="bg-military-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">Airspaces</h3>
        <span className="text-xs text-military-400">{airspaces.length} zones</span>
      </div>

      {airspaces.length === 0 && (
        <p className="text-military-400 text-sm">No airspace zones defined.</p>
      )}

      <div className="space-y-2">
        {airspaces.map((a) => (
          <div key={a.id} className="flex items-center justify-between bg-military-700 rounded px-3 py-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={visibleIds.has(a.id)}
                onChange={() => handleToggle(a.id)}
                className="rounded"
              />
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: AIRSPACE_COLORS[a.type] || "#666" }}
              />
              <div>
                <span className="text-sm font-medium">{a.name}</span>
                <span className="text-xs text-military-400 ml-2">{a.type}</span>
                {(a.minAltitude || a.maxAltitude) && (
                  <span className="text-xs text-military-400 ml-2">
                    {a.minAltitude || 0}–{a.maxAltitude || "FL999"}ft
                  </span>
                )}
              </div>
            </div>
            {editable && onDeleteAirspace && (
              <button
                onClick={() => onDeleteAirspace(a.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      {editable && onCreateAirspace && (
        <div className="mt-3">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              + Add Airspace Zone
            </button>
          ) : (
            <div className="bg-military-700 rounded p-3 space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Zone name"
                className="w-full bg-military-600 rounded px-2 py-1 text-sm"
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Airspace["type"])}
                className="w-full bg-military-600 rounded px-2 py-1 text-sm"
              >
                {Object.keys(AIRSPACE_COLORS).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  value={minAlt}
                  onChange={(e) => setMinAlt(e.target.value)}
                  placeholder="Min alt (ft)"
                  type="number"
                  className="w-1/2 bg-military-600 rounded px-2 py-1 text-sm"
                />
                <input
                  value={maxAlt}
                  onChange={(e) => setMaxAlt(e.target.value)}
                  placeholder="Max alt (ft)"
                  type="number"
                  className="w-1/2 bg-military-600 rounded px-2 py-1 text-sm"
                />
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full bg-military-600 rounded px-2 py-1 text-sm"
                rows={2}
              />
              <p className="text-xs text-military-400">Click polygon points on map, then save.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1 bg-military-600 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
