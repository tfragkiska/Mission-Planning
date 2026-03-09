import { useState } from "react";
import type { WeatherReport } from "../lib/types";
import { api } from "../lib/api";

interface Props {
  missionId: string;
  reports: WeatherReport[];
  editable: boolean;
  onAdd: (report: WeatherReport) => void;
  onDelete: (id: string) => void;
}

export default function WeatherPanel({ missionId, reports, editable, onAdd, onDelete }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [rawMetar, setRawMetar] = useState("");
  const [error, setError] = useState("");

  async function handleAddMetar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const parsed = await api.weather.parseMetar(missionId, rawMetar);
      const report = await api.weather.add(missionId, {
        ...parsed,
        rawReport: rawMetar,
        type: "METAR",
        stationId: (parsed as Record<string, unknown>).stationId || "UNKNOWN",
        observedAt: new Date().toISOString(),
      });
      onAdd(report);
      setRawMetar("");
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    }
  }

  function windArrow(dir: number | null) {
    if (dir === null) return "";
    const arrows = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return arrows[Math.round(dir / 45) % 8];
  }

  return (
    <div className="glass-panel border border-[var(--color-border-primary)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--color-border-primary)]">
        <div className="flex items-center gap-2">
          <span className="text-accent-400 text-sm font-bold">{"//"}</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-primary)]">Weather</h3>
          <span className="bg-accent-600/20 text-accent-400 text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
            {reports.length}
          </span>
        </div>
        {editable && (
          <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-command-400 hover:text-command-300 font-semibold transition-colors">
            {showAdd ? "Cancel" : "+ Add METAR"}
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleAddMetar} className="mb-3 bg-[var(--color-bg-tertiary)]/40 rounded-lg p-3 border border-[var(--color-border-subtle)]">
          {error && <p className="text-xs text-danger-500 mb-1 font-semibold">{error}</p>}
          <input
            value={rawMetar}
            onChange={(e) => setRawMetar(e.target.value)}
            placeholder="Paste METAR string..."
            className="w-full px-3 py-1.5 text-sm bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] rounded-lg text-tactical-500 mb-2 font-mono focus:border-l-2 focus:border-l-command-500 focus:outline-none transition-all"
            required
          />
          <button type="submit" className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide bg-command-500 hover:bg-command-400 rounded-lg text-[var(--color-text-primary)] transition-colors">Parse & Add</button>
        </form>
      )}

      {reports.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] italic">No weather data</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {reports.map((r) => (
            <div key={r.id} className="bg-[var(--color-bg-tertiary)]/60 hover:bg-[var(--color-bg-elevated)]/60 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 group">
              <div className="flex items-center justify-between">
                <span className="font-bold text-accent-400 text-base tracking-wide">{r.stationId}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-muted)] font-mono uppercase">{r.type}</span>
                  {editable && (
                    <button onClick={() => onDelete(r.id)} className="text-danger-500 hover:text-red-300 hover:scale-110 text-xs opacity-0 group-hover:opacity-100 transition-all duration-150 font-bold">x</button>
                  )}
                </div>
              </div>
              <p className="text-xs font-mono text-tactical-500 mt-1.5 bg-[var(--color-bg-secondary)]/50 rounded px-2 py-1 leading-relaxed">{r.rawReport}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
                {r.temperature !== null && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Temp</span>
                    <span className="text-[var(--color-text-primary)] font-mono">{r.temperature}C</span>
                  </div>
                )}
                {r.windSpeed !== null && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Wind</span>
                    <span className="text-[var(--color-text-primary)] font-mono">{windArrow(r.windDir)} {r.windSpeed}kt</span>
                  </div>
                )}
                {r.visibility !== null && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Vis</span>
                    <span className="text-[var(--color-text-primary)] font-mono">{r.visibility}SM</span>
                  </div>
                )}
                {r.ceiling !== null && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Ceil</span>
                    <span className="text-[var(--color-text-primary)] font-mono">{r.ceiling}ft</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
