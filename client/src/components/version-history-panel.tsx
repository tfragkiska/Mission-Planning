import { useState, useEffect } from "react";
import { api } from "../lib/api";
import type { MissionVersion } from "../lib/types";

interface Props {
  missionId: string;
}

export default function VersionHistoryPanel({ missionId }: Props) {
  const [versions, setVersions] = useState<MissionVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.missions.listVersions(missionId)
      .then(setVersions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [missionId]);

  const changeTypeLabels: Record<string, string> = {
    created: "Created",
    updated: "Updated",
  };

  function formatChangeType(ct: string): string {
    if (ct.startsWith("transition:")) {
      return `Status \u2192 ${ct.replace("transition:", "").replace(/_/g, " ")}`;
    }
    return changeTypeLabels[ct] || ct;
  }

  return (
    <div className="glass-panel border border-[var(--color-border-primary)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--color-border-primary)]">
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-text-secondary)] text-sm font-bold">{"//"}</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-primary)]">Version History</h3>
        </div>
        {!loading && versions.length > 0 && (
          <span className="bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
            {versions.length}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-2">
          <div className="w-3 h-3 border border-command-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--color-text-muted)] font-mono text-xs">Loading...</p>
        </div>
      )}

      {!loading && versions.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)] italic">No version history</p>
      )}

      {!loading && versions.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {versions.map((v, i) => (
            <div key={v.id} className="flex items-start gap-3 bg-[var(--color-bg-tertiary)]/60 hover:bg-[var(--color-bg-elevated)]/60 rounded-lg px-3 py-2 text-sm transition-colors duration-150 group">
              {/* Timeline dot */}
              <div className="flex flex-col items-center pt-1 flex-shrink-0">
                <span className={`flex items-center justify-center w-7 h-5 rounded text-xs font-bold font-mono ${i === 0 ? "bg-command-600/20 text-command-400" : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]"}`}>
                  v{v.version}
                </span>
                {i < versions.length - 1 && (
                  <span className="w-px h-3 bg-[var(--color-bg-elevated)] mt-1" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--color-text-primary)]">{formatChangeType(v.changeType)}</p>
                  <span className="text-xs text-[var(--color-text-muted)] font-mono flex-shrink-0">
                    {new Date(v.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
