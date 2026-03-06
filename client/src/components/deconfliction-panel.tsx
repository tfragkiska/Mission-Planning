import React from "react";
import type { DeconflictionResult, ConflictSeverity } from "../lib/types";

interface Props {
  results: DeconflictionResult[];
  editable: boolean;
  onRunCheck: () => void;
  onResolve: (id: string) => void;
  loading: boolean;
}

const severityStyles: Record<ConflictSeverity, { bg: string; border: string; text: string; badge: string }> = {
  CRITICAL: {
    bg: "bg-danger-600/10",
    border: "border-danger-600/40",
    text: "text-danger-500",
    badge: "bg-danger-600/20 text-danger-500 border-danger-600/30",
  },
  WARNING: {
    bg: "bg-accent-600/10",
    border: "border-accent-600/40",
    text: "text-accent-400",
    badge: "bg-accent-600/20 text-accent-400 border-accent-600/30",
  },
  INFO: {
    bg: "bg-command-600/10",
    border: "border-command-600/40",
    text: "text-command-400",
    badge: "bg-command-600/20 text-command-400 border-command-600/30",
  },
};

function DeconflictionPanelInner({ results, editable, onRunCheck, onResolve, loading }: Props) {
  const criticalCount = results.filter((r) => r.severity === "CRITICAL" && r.resolution === "UNRESOLVED").length;
  const warningCount = results.filter((r) => r.severity === "WARNING" && r.resolution === "UNRESOLVED").length;

  return (
    <div className="glass-panel border border-military-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-military-700/50">
        <div className="flex items-center gap-2">
          <span className="text-accent-400 text-sm font-bold">{"//"}</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-military-300">Deconfliction</h3>
        </div>
        {editable && (
          <button
            onClick={onRunCheck}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide bg-command-500 hover:bg-command-400 disabled:bg-command-600/30 disabled:text-command-400/50 rounded-lg text-white transition-all duration-200 shadow-glow-blue"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border border-white/50 border-t-transparent rounded-full animate-spin" />
                Running...
              </span>
            ) : "Run Check"}
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="flex gap-3 mb-3 text-xs">
          {criticalCount > 0 && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-danger-600/20 text-danger-500 font-bold border border-danger-600/30 animate-pulse-slow">
              {criticalCount} Critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-600/20 text-accent-400 font-bold border border-accent-600/30">
              {warningCount} Warning
            </span>
          )}
          {criticalCount === 0 && warningCount === 0 && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tactical-700/30 text-tactical-500 font-bold border border-tactical-600/30 shadow-glow-green">
              All Clear
            </span>
          )}
        </div>
      )}

      {results.length === 0 ? (
        <p className="text-sm text-military-500 italic">No deconfliction results. Run a check to detect conflicts.</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {results.map((r) => {
            const style = severityStyles[r.severity] || severityStyles.INFO;
            const isResolved = r.resolution === "RESOLVED";
            const isUnresolvedCritical = r.severity === "CRITICAL" && r.resolution === "UNRESOLVED";
            return (
              <div
                key={r.id}
                className={`${isResolved ? "bg-military-800/40 border-military-700/30 opacity-60" : `${style.bg} ${style.border}`} border rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${isUnresolvedCritical ? "animate-pulse-slow" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0 rounded text-xs font-bold border ${isResolved ? "bg-military-700 text-military-500 border-military-600" : style.badge}`}>
                      {r.severity}
                    </span>
                    <span className={`text-xs ${isResolved ? "text-military-500" : "text-military-300"}`}>{r.conflictType}</span>
                  </div>
                  {r.resolution === "UNRESOLVED" && editable && (
                    <button onClick={() => onResolve(r.id)} className="text-xs text-tactical-500 hover:text-tactical-500 font-semibold transition-colors">
                      Resolve
                    </button>
                  )}
                  {r.resolution === "RESOLVED" && (
                    <span className="text-xs text-tactical-500/60 font-mono">RESOLVED</span>
                  )}
                </div>
                <p className={`text-sm mt-1.5 ${isResolved ? "text-military-500" : "text-military-300"}`}>{r.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default React.memo(DeconflictionPanelInner);
