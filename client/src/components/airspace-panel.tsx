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
    <div className="glass-panel border border-[var(--color-border-primary)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--color-border-primary)]">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 text-sm font-bold">{"//"}</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-primary)]">Airspaces</h3>
        </div>
        <span className="bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
          {airspaces.length}
        </span>
      </div>

      {airspaces.length === 0 && (
        <p className="text-[var(--color-text-muted)] text-sm italic">No airspace zones defined.</p>
      )}

      <div className="space-y-1.5">
        {airspaces.map((a) => (
          <div key={a.id} className="flex items-center justify-between bg-[var(--color-bg-tertiary)]/60 hover:bg-[var(--color-bg-elevated)]/60 rounded-lg px-3 py-2 transition-colors duration-150 group"
            style={{ borderLeft: `3px solid ${AIRSPACE_COLORS[a.type] || "#666"}` }}
          >
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={visibleIds.has(a.id)}
                onChange={() => handleToggle(a.id)}
                className="rounded border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] text-command-500 focus:ring-command-500 focus:ring-offset-0"
              />
              <div>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{a.name}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: AIRSPACE_COLORS[a.type] || "#888" }}>
                    {a.type}
                  </span>
                  {(a.minAltitude || a.maxAltitude) && (
                    <span className="text-xs text-[var(--color-text-secondary)] font-mono">
                      {a.minAltitude || 0}–{a.maxAltitude || "FL999"}ft
                    </span>
                  )}
                </div>
              </div>
            </div>
            {editable && onDeleteAirspace && (
              <button
                onClick={() => onDeleteAirspace(a.id)}
                className="text-danger-500 hover:text-red-300 hover:scale-110 text-xs opacity-0 group-hover:opacity-100 transition-all duration-150 font-bold"
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
              className="text-xs text-command-400 hover:text-command-300 font-semibold transition-colors"
            >
              + Add Airspace Zone
            </button>
          ) : (
            <div className="bg-[var(--color-bg-tertiary)]/60 rounded-lg p-3 space-y-2 border border-[var(--color-border-primary)]">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Zone name"
                className="w-full bg-[var(--color-bg-elevated)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] border border-[var(--color-border-primary)] focus:border-l-2 focus:border-l-command-500 focus:outline-none transition-all"
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Airspace["type"])}
                className="w-full bg-[var(--color-bg-elevated)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] border border-[var(--color-border-primary)] focus:border-l-2 focus:border-l-command-500 focus:outline-none transition-all"
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
                  className="w-1/2 bg-[var(--color-bg-elevated)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] font-mono border border-[var(--color-border-primary)] focus:border-l-2 focus:border-l-command-500 focus:outline-none transition-all"
                />
                <input
                  value={maxAlt}
                  onChange={(e) => setMaxAlt(e.target.value)}
                  placeholder="Max alt (ft)"
                  type="number"
                  className="w-1/2 bg-[var(--color-bg-elevated)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] font-mono border border-[var(--color-border-primary)] focus:border-l-2 focus:border-l-command-500 focus:outline-none transition-all"
                />
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full bg-[var(--color-bg-elevated)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] border border-[var(--color-border-primary)] focus:border-l-2 focus:border-l-command-500 focus:outline-none transition-all"
                rows={2}
              />
              <p className="text-xs text-[var(--color-text-muted)] italic">Click polygon points on map, then save.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-1.5 bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-elevated)] rounded-lg text-sm text-[var(--color-text-primary)] transition-colors"
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
