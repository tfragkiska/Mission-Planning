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

const lethalityBadge: Record<ThreatLethality, string> = {
  LOW: "bg-command-600/20 text-command-400 border-command-600/30",
  MEDIUM: "bg-accent-600/20 text-accent-400 border-accent-600/30",
  HIGH: "bg-orange-900/30 text-orange-400 border-orange-600/30",
  CRITICAL: "bg-danger-600/20 text-danger-500 border-danger-600/30 shadow-glow-amber",
};

const categoryBg: Record<ThreatCategory, string> = {
  SAM: "bg-danger-600/20 text-danger-500",
  AAA: "bg-orange-900/30 text-orange-400",
  MANPAD: "bg-accent-600/20 text-accent-400",
  RADAR: "bg-command-600/20 text-command-400",
  FIGHTER: "bg-danger-600/25 text-danger-500",
  OTHER: "bg-[var(--color-border-primary)] text-[var(--color-text-primary)]",
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
    <div className="glass-panel border border-[var(--color-border-primary)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--color-border-primary)]">
        <div className="flex items-center gap-2">
          <span className="text-danger-500 text-sm font-bold">{"//"}</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-primary)]">Threats</h3>
          <span className="bg-danger-600/20 text-danger-500 text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
            {missionThreats.length}
          </span>
        </div>
        {editable && (
          <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-command-400 hover:text-command-300 font-semibold transition-colors">
            {showAdd ? "Cancel" : "+ Add Threat"}
          </button>
        )}
      </div>

      {showAdd && (
        <div className="mb-3 max-h-40 overflow-y-auto space-y-1.5 bg-[var(--color-bg-tertiary)]/40 rounded-lg p-2 border border-[var(--color-border-subtle)]">
          {availableThreats.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] italic py-1">No threats available</p>
          ) : (
            availableThreats.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-[var(--color-bg-tertiary)]/60 hover:bg-[var(--color-bg-elevated)]/60 rounded-lg px-3 py-2 text-sm transition-colors duration-150">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold font-mono ${categoryBg[t.category]}`}>
                    {categoryIcons[t.category]}
                  </span>
                  <span className="text-[var(--color-text-primary)]">{t.name}</span>
                  <span className="text-[var(--color-text-secondary)] font-mono text-xs">{t.rangeNm}NM</span>
                </div>
                <button onClick={() => { onAdd(t.id); setShowAdd(false); }}
                  className="text-tactical-500 hover:text-tactical-500 text-xs font-semibold transition-colors">+ Add</button>
              </div>
            ))
          )}
        </div>
      )}

      {missionThreats.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] italic">No threats assigned</p>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {missionThreats.map((t) => (
            <div key={t.id} className="flex items-center justify-between bg-[var(--color-bg-tertiary)]/60 hover:bg-[var(--color-bg-elevated)]/60 rounded-lg px-3 py-2 text-sm transition-colors duration-150 group">
              <div className="flex items-center gap-2.5">
                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold font-mono ${categoryBg[t.category]}`}>
                  {categoryIcons[t.category]}
                </span>
                <div>
                  <span className="text-[var(--color-text-primary)] font-medium">{t.name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[var(--color-text-secondary)] font-mono text-xs">{t.rangeNm}NM</span>
                    <span className={`px-1.5 py-0 rounded text-xs font-semibold border ${lethalityBadge[t.lethality]}`}>
                      {t.lethality}
                    </span>
                  </div>
                </div>
              </div>
              {editable && (
                <button onClick={() => onRemove(t.id)} className="text-danger-500 hover:text-red-300 hover:scale-110 text-xs ml-2 opacity-0 group-hover:opacity-100 transition-all duration-150 font-bold">x</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
