import { useState, useEffect } from "react";
import type { Threat, ThreatLethality, ThreatCategory } from "../lib/types";
import { api } from "../lib/api";

interface Props {
  missionId: string;
  missionThreats: Threat[];
  editable: boolean;
  onAdd: (threatId: string) => void;
  onRemove: (threatId: string) => void;
}

const lethalityColors: Record<ThreatLethality, string> = {
  LOW: "text-blue-400",
  MEDIUM: "text-yellow-400",
  HIGH: "text-orange-400",
  CRITICAL: "text-red-400",
};

const categoryIcons: Record<ThreatCategory, string> = {
  SAM: "S",
  AAA: "A",
  MANPAD: "M",
  RADAR: "R",
  FIGHTER: "F",
  OTHER: "?",
};

export default function ThreatPanel({ missionThreats, editable, onAdd, onRemove }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [allThreats, setAllThreats] = useState<Threat[]>([]);

  useEffect(() => {
    if (showAdd) {
      api.threats.list().then(setAllThreats).catch(() => {});
    }
  }, [showAdd]);

  const availableThreats = allThreats.filter(
    (t) => !missionThreats.some((mt) => mt.id === t.id)
  );

  return (
    <div className="bg-military-800 border border-military-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Threats ({missionThreats.length})</h3>
        {editable && (
          <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-blue-400 hover:text-blue-300">
            {showAdd ? "Cancel" : "+ Add Threat"}
          </button>
        )}
      </div>

      {showAdd && (
        <div className="mb-3 max-h-40 overflow-y-auto space-y-1">
          {availableThreats.length === 0 ? (
            <p className="text-xs text-military-400">No threats available</p>
          ) : (
            availableThreats.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-military-700 rounded px-2 py-1 text-sm">
                <span>
                  <span className={`font-mono mr-1 ${lethalityColors[t.lethality]}`}>[{categoryIcons[t.category]}]</span>
                  {t.name} — {t.rangeNm}NM
                </span>
                <button onClick={() => { onAdd(t.id); setShowAdd(false); }}
                  className="text-green-400 hover:text-green-300 text-xs">+ Add</button>
              </div>
            ))
          )}
        </div>
      )}

      {missionThreats.length === 0 ? (
        <p className="text-sm text-military-400">No threats assigned</p>
      ) : (
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {missionThreats.map((t) => (
            <div key={t.id} className="flex items-center justify-between bg-military-700 rounded px-2 py-1 text-sm">
              <div>
                <span className={`font-mono mr-1 ${lethalityColors[t.lethality]}`}>[{categoryIcons[t.category]}]</span>
                <span>{t.name}</span>
                <span className="text-military-400 ml-1">— {t.rangeNm}NM, {t.lethality}</span>
              </div>
              {editable && (
                <button onClick={() => onRemove(t.id)} className="text-red-400 hover:text-red-300 text-xs ml-2">x</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
