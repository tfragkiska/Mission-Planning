import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth-store";
import Layout from "../components/layout";
import type { AuditLogEntry, AuditAction, AuditEntityType } from "../lib/types";

const ACTION_LABELS: Record<string, string> = {
  CREATE_MISSION: "Created Mission",
  UPDATE_MISSION: "Updated Mission",
  TRANSITION_STATUS: "Status Transition",
  ADD_WAYPOINT: "Added Waypoint",
  DELETE_WAYPOINT: "Deleted Waypoint",
  ADD_THREAT: "Added Threat",
  REMOVE_THREAT: "Removed Threat",
  ADD_AIRCRAFT: "Added Aircraft",
  REMOVE_AIRCRAFT: "Removed Aircraft",
  LOGIN: "Login",
  LOGOUT: "Logout",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE_MISSION: "text-green-400 bg-green-500/10 border-green-500/30",
  UPDATE_MISSION: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  TRANSITION_STATUS: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  ADD_WAYPOINT: "text-green-400 bg-green-500/10 border-green-500/30",
  DELETE_WAYPOINT: "text-red-400 bg-red-500/10 border-red-500/30",
  ADD_THREAT: "text-green-400 bg-green-500/10 border-green-500/30",
  REMOVE_THREAT: "text-red-400 bg-red-500/10 border-red-500/30",
  ADD_AIRCRAFT: "text-green-400 bg-green-500/10 border-green-500/30",
  REMOVE_AIRCRAFT: "text-red-400 bg-red-500/10 border-red-500/30",
  LOGIN: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  LOGOUT: "text-military-400 bg-military-500/10 border-military-500/30",
};

const DOT_COLORS: Record<string, string> = {
  CREATE_MISSION: "bg-green-400",
  UPDATE_MISSION: "bg-blue-400",
  TRANSITION_STATUS: "bg-amber-400",
  ADD_WAYPOINT: "bg-green-400",
  DELETE_WAYPOINT: "bg-red-400",
  ADD_THREAT: "bg-green-400",
  REMOVE_THREAT: "bg-red-400",
  ADD_AIRCRAFT: "bg-green-400",
  REMOVE_AIRCRAFT: "bg-red-400",
  LOGIN: "bg-blue-400",
  LOGOUT: "bg-military-400",
};

const ALL_ACTIONS: AuditAction[] = [
  "CREATE_MISSION",
  "UPDATE_MISSION",
  "TRANSITION_STATUS",
  "ADD_WAYPOINT",
  "DELETE_WAYPOINT",
  "ADD_THREAT",
  "REMOVE_THREAT",
  "ADD_AIRCRAFT",
  "REMOVE_AIRCRAFT",
  "LOGIN",
  "LOGOUT",
];

const ALL_ENTITY_TYPES: AuditEntityType[] = [
  "MISSION",
  "WAYPOINT",
  "THREAT",
  "AIRCRAFT",
  "CREW",
  "USER",
];

const PAGE_SIZE = 25;

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDetails(details: Record<string, unknown> | null): string {
  if (!details) return "";
  const parts: string[] = [];
  if (details.from && details.to) {
    parts.push(`${details.from} -> ${details.to}`);
  }
  if (details.name) {
    parts.push(`"${details.name}"`);
  }
  if (details.missionId) {
    parts.push(`Mission: ${(details.missionId as string).slice(0, 8)}...`);
  }
  if (details.changes && typeof details.changes === "object") {
    const keys = Object.keys(details.changes as object);
    if (keys.length > 0) {
      parts.push(`Changed: ${keys.join(", ")}`);
    }
  }
  if (details.comments) {
    parts.push(`"${details.comments}"`);
  }
  return parts.join(" | ");
}

export default function AuditPage() {
  const user = useAuthStore((s) => s.user);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterAction, setFilterAction] = useState<string>("");
  const [filterEntityType, setFilterEntityType] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  const isCommander = user?.role === "COMMANDER";

  const fetchLogs = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.audit.list({
          action: filterAction || undefined,
          entityType: filterEntityType || undefined,
          startDate: filterStartDate || undefined,
          endDate: filterEndDate || undefined,
          page: pageNum,
          limit: PAGE_SIZE,
        });
        if (append) {
          setLogs((prev) => [...prev, ...result.logs]);
        } else {
          setLogs(result.logs);
        }
        setTotal(result.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    },
    [filterAction, filterEntityType, filterStartDate, filterEndDate],
  );

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [fetchLogs]);

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLogs(nextPage, true);
  }

  function handleApplyFilters() {
    setPage(1);
    fetchLogs(1);
  }

  function handleClearFilters() {
    setFilterAction("");
    setFilterEntityType("");
    setFilterStartDate("");
    setFilterEndDate("");
  }

  const hasMore = logs.length < total;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 tracking-wide">
              AUDIT LOG
            </h1>
            <p className="text-sm text-military-400 mt-1">
              {isCommander
                ? "Complete system activity trail"
                : "Your activity trail"}
            </p>
          </div>
          <div className="text-sm font-mono text-military-500">
            {total} {total === 1 ? "entry" : "entries"}
          </div>
        </div>

        {/* Filters */}
        <div className="glass-panel bg-military-900/60 border border-military-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-4 h-4 text-military-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span className="text-sm font-semibold text-military-300 uppercase tracking-wider">
              Filters
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-military-500 mb-1 uppercase tracking-wider">
                Action
              </label>
              <select
                className="w-full bg-military-800 border border-military-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-tactical-500/50"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <option value="">All Actions</option>
                {ALL_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {ACTION_LABELS[a] || a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-military-500 mb-1 uppercase tracking-wider">
                Entity Type
              </label>
              <select
                className="w-full bg-military-800 border border-military-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-tactical-500/50"
                value={filterEntityType}
                onChange={(e) => setFilterEntityType(e.target.value)}
              >
                <option value="">All Entities</option>
                {ALL_ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-military-500 mb-1 uppercase tracking-wider">
                Start Date
              </label>
              <input
                type="datetime-local"
                className="w-full bg-military-800 border border-military-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-tactical-500/50"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-military-500 mb-1 uppercase tracking-wider">
                End Date
              </label>
              <input
                type="datetime-local"
                className="w-full bg-military-800 border border-military-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-tactical-500/50"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-1.5 text-sm font-medium rounded bg-tactical-600 hover:bg-tactical-500 text-white transition-colors"
            >
              Apply
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-1.5 text-sm font-medium rounded bg-military-700 hover:bg-military-600 text-military-300 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Timeline */}
        <div className="glass-panel bg-military-900/60 border border-military-700/50 rounded-lg overflow-hidden">
          {logs.length === 0 && !loading ? (
            <div className="p-8 text-center text-military-500">
              No audit log entries found.
            </div>
          ) : (
            <div className="divide-y divide-military-800/50">
              {logs.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-military-800/30 transition-colors"
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center pt-1">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${DOT_COLORS[entry.action] || "bg-military-500"}`}
                    />
                    {idx < logs.length - 1 && (
                      <div className="w-px flex-1 bg-military-700/40 mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Timestamp */}
                      <span className="text-xs font-mono text-military-500 whitespace-nowrap">
                        {formatTimestamp(entry.createdAt)}
                      </span>

                      {/* User name */}
                      <span className="text-sm font-medium text-gray-300">
                        {entry.user.name}
                      </span>

                      {/* Action badge */}
                      <span
                        className={`text-xs font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${ACTION_COLORS[entry.action] || "text-military-400 bg-military-500/10 border-military-500/30"}`}
                      >
                        {ACTION_LABELS[entry.action] || entry.action}
                      </span>

                      {/* Entity badge */}
                      <span className="text-xs font-mono text-military-500 px-2 py-0.5 rounded bg-military-800 border border-military-700/50">
                        {entry.entityType}
                      </span>
                    </div>

                    {/* Details row */}
                    <div className="flex items-center gap-3 mt-1.5">
                      {entry.entityId && (
                        <span className="text-xs font-mono text-military-600">
                          ID: {entry.entityId.slice(0, 8)}...
                        </span>
                      )}
                      {entry.details && (
                        <span className="text-xs text-military-400 truncate">
                          {formatDetails(entry.details)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* IP address */}
                  {entry.ipAddress && (
                    <span className="text-xs font-mono text-military-600 whitespace-nowrap hidden lg:block">
                      {entry.ipAddress}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="p-4 border-t border-military-800/50 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-6 py-2 text-sm font-medium rounded bg-military-700 hover:bg-military-600 text-military-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Loading..." : `Load More (${logs.length} of ${total})`}
              </button>
            </div>
          )}

          {/* Loading indicator */}
          {loading && logs.length === 0 && (
            <div className="p-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-tactical-500/30 border-t-tactical-500 rounded-full animate-spin" />
              <p className="text-sm text-military-500 mt-2">
                Loading audit logs...
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
