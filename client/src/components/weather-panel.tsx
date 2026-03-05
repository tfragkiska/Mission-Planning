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
    <div className="bg-military-800 border border-military-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Weather ({reports.length})</h3>
        {editable && (
          <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-blue-400 hover:text-blue-300">
            {showAdd ? "Cancel" : "+ Add METAR"}
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleAddMetar} className="mb-3">
          {error && <p className="text-xs text-red-400 mb-1">{error}</p>}
          <input
            value={rawMetar}
            onChange={(e) => setRawMetar(e.target.value)}
            placeholder="Paste METAR string..."
            className="w-full px-2 py-1 text-sm bg-military-700 border border-military-600 rounded text-gray-100 mb-2 font-mono"
            required
          />
          <button type="submit" className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded">Parse & Add</button>
        </form>
      )}

      {reports.length === 0 ? (
        <p className="text-sm text-military-400">No weather data</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {reports.map((r) => (
            <div key={r.id} className="bg-military-700 rounded px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-blue-400">{r.stationId}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-military-400">{r.type}</span>
                  {editable && (
                    <button onClick={() => onDelete(r.id)} className="text-red-400 hover:text-red-300 text-xs">x</button>
                  )}
                </div>
              </div>
              <p className="text-xs font-mono text-military-400 mt-1">{r.rawReport}</p>
              <div className="flex gap-4 mt-1 text-xs text-military-300">
                {r.temperature !== null && <span>Temp: {r.temperature}C</span>}
                {r.windSpeed !== null && <span>Wind: {windArrow(r.windDir)} {r.windSpeed}kt</span>}
                {r.visibility !== null && <span>Vis: {r.visibility}SM</span>}
                {r.ceiling !== null && <span>Ceil: {r.ceiling}ft</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
