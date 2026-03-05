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
    <div className="bg-military-800 border border-military-700 rounded-lg p-4">
      <h3 className="font-semibold mb-3">Version History</h3>

      {loading && <p className="text-sm text-military-400">Loading...</p>}

      {!loading && versions.length === 0 && (
        <p className="text-sm text-military-400">No version history</p>
      )}

      {!loading && versions.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {versions.map((v) => (
            <div key={v.id} className="bg-military-700 rounded px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-blue-400">v{v.version}</span>
                <span className="text-xs text-military-400">
                  {new Date(v.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-military-300 mt-1">{formatChangeType(v.changeType)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
