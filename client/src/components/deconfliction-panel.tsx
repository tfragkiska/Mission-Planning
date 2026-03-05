import type { DeconflictionResult, ConflictSeverity } from "../lib/types";

interface Props {
  results: DeconflictionResult[];
  editable: boolean;
  onRunCheck: () => void;
  onResolve: (id: string) => void;
  loading: boolean;
}

const severityStyles: Record<ConflictSeverity, { bg: string; border: string; text: string }> = {
  CRITICAL: { bg: "bg-red-900/30", border: "border-red-700", text: "text-red-400" },
  WARNING: { bg: "bg-yellow-900/30", border: "border-yellow-700", text: "text-yellow-400" },
  INFO: { bg: "bg-blue-900/30", border: "border-blue-700", text: "text-blue-400" },
};

export default function DeconflictionPanel({ results, editable, onRunCheck, onResolve, loading }: Props) {
  const criticalCount = results.filter((r) => r.severity === "CRITICAL" && r.resolution === "UNRESOLVED").length;
  const warningCount = results.filter((r) => r.severity === "WARNING" && r.resolution === "UNRESOLVED").length;

  return (
    <div className="bg-military-800 border border-military-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Deconfliction</h3>
        {editable && (
          <button
            onClick={onRunCheck}
            disabled={loading}
            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded"
          >
            {loading ? "Running..." : "Run Check"}
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="flex gap-3 mb-3 text-xs">
          {criticalCount > 0 && (
            <span className="text-red-400 font-medium">{criticalCount} Critical</span>
          )}
          {warningCount > 0 && (
            <span className="text-yellow-400 font-medium">{warningCount} Warning</span>
          )}
          {criticalCount === 0 && warningCount === 0 && (
            <span className="text-green-400 font-medium">All Clear</span>
          )}
        </div>
      )}

      {results.length === 0 ? (
        <p className="text-sm text-military-400">No deconfliction results. Run a check to detect conflicts.</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {results.map((r) => {
            const style = severityStyles[r.severity] || severityStyles.INFO;
            return (
              <div key={r.id} className={`${style.bg} ${style.border} border rounded px-3 py-2 text-sm`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${style.text}`}>{r.severity} — {r.conflictType}</span>
                  {r.resolution === "UNRESOLVED" && editable && (
                    <button onClick={() => onResolve(r.id)} className="text-xs text-green-400 hover:text-green-300">
                      Resolve
                    </button>
                  )}
                  {r.resolution === "RESOLVED" && (
                    <span className="text-xs text-green-400">Resolved</span>
                  )}
                </div>
                <p className="text-sm mt-1">{r.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
