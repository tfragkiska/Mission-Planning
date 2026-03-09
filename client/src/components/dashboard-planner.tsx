import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MissionCard from "./mission-card";
import MissionSelect from "./mission-select";
import MissionFiltersBar, { MissionFilters } from "./mission-filters";
import MissionStats from "./mission-stats";
import MissionTimeline from "./mission-timeline";
import DashboardViewToggle from "./dashboard-view-toggle";
import CreateMissionModal from "./create-mission-modal";
import VirtualList from "./virtual-list";
import { useAuthStore } from "../stores/auth-store";
import { api } from "../lib/api";
import type { Mission, AuditLogEntry } from "../lib/types";

const VIRTUAL_SCROLL_THRESHOLD = 50;
const VIRTUAL_ROW_HEIGHT = 200;

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const STATUS_ORDER: Record<string, number> = {
  EXECUTING: 0, BRIEFED: 1, APPROVED: 2, UNDER_REVIEW: 3,
  PLANNED: 4, DRAFT: 5, REJECTED: 6, DEBRIEFED: 7,
};

function applyFilters(missions: Mission[], filters: MissionFilters): Mission[] {
  let result = [...missions];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((m) => m.name.toLowerCase().includes(q));
  }
  if (filters.status !== "ALL") {
    result = result.filter((m) => m.status === filters.status);
  }
  if (filters.type !== "ALL") {
    result = result.filter((m) => m.type === filters.type);
  }
  if (filters.priority !== "ALL") {
    result = result.filter((m) => m.priority === filters.priority);
  }

  switch (filters.sortBy) {
    case "oldest":
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;
    case "name":
      result.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "priority":
      result.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
      break;
    case "status":
      result.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
      break;
    default:
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return result;
}

interface Props {
  missions: Mission[];
  loading: boolean;
}

export default function DashboardPlanner({ missions, loading }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<"grid" | "timeline">("grid");
  const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkExporting, setBulkExporting] = useState(false);
  const [filters, setFilters] = useState<MissionFilters>({
    search: "",
    status: "ALL",
    type: "ALL",
    priority: "ALL",
    sortBy: "newest",
  });

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkExport = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkExporting(true);
    try {
      const blob = await api.exports.bulkCSV(Array.from(selectedIds));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "missions-bulk-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Bulk export failed
    } finally {
      setBulkExporting(false);
    }
  }, [selectedIds]);

  useEffect(() => {
    if (user) {
      api.audit
        .list({ userId: user.id, limit: 5 })
        .then((res) => setRecentActivity(res.logs))
        .catch(() => {});
    }
  }, [user]);

  const myMissions = useMemo(
    () => missions.filter((m) => m.createdBy.id === user?.id),
    [missions, user],
  );

  const filtered = useMemo(() => applyFilters(myMissions, filters), [myMissions, filters]);

  const needingReview = useMemo(
    () => myMissions.filter((m) => m.status === "UNDER_REVIEW").length,
    [myMissions],
  );

  const draftCount = useMemo(
    () => myMissions.filter((m) => m.status === "DRAFT").length,
    [myMissions],
  );

  const actionLabels: Record<string, string> = {
    CREATE_MISSION: "Created mission",
    UPDATE_MISSION: "Updated mission",
    TRANSITION_STATUS: "Changed status",
    ADD_WAYPOINT: "Added waypoint",
    DELETE_WAYPOINT: "Deleted waypoint",
    ADD_THREAT: "Added threat",
    REMOVE_THREAT: "Removed threat",
    ADD_AIRCRAFT: "Added aircraft",
    REMOVE_AIRCRAFT: "Removed aircraft",
  };

  return (
    <>
      {/* Header */}
      <div className="relative mb-6 sm:mb-8">
        <div className="absolute inset-0 tactical-grid opacity-20 rounded-xl" />
        <div className="relative glass-panel rounded-xl border border-[var(--color-border-primary)] px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-2 h-2 rounded-full bg-command-500 animate-pulse-slow shadow-glow-blue" />
                <span className="text-xs font-mono uppercase tracking-[0.3em] text-command-400">
                  Planner Console
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Mission Planning Center
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1 font-mono">
                {myMissions.length} missions created // {filtered.length} displayed
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <DashboardViewToggle view={view} onChange={setView} />
              <button
                onClick={() => setShowCreate(true)}
                className="group relative px-4 sm:px-5 py-2.5 bg-command-500 hover:bg-command-600 rounded-lg font-semibold text-sm transition-all duration-200 hover:shadow-glow-blue flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="hidden sm:inline">{t("dashboard.newMission")}</span>
                <span className="sm:hidden">{t("dashboard.new")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setFilters((f) => ({ ...f, status: "UNDER_REVIEW" }))}
          className="glass-panel rounded-xl border border-accent-500/30 border-t-2 border-t-accent-500 px-5 py-4 text-left transition-all duration-200 hover:border-accent-500/60 hover:shadow-glow-amber group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-accent-400 font-mono mb-1">
                Missions Needing Review
              </div>
              <div className="text-3xl font-bold font-mono text-accent-400">
                {needingReview}
              </div>
            </div>
            <svg className="w-6 h-6 text-accent-500/50 group-hover:text-accent-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
        </button>

        <button
          onClick={() => setFilters((f) => ({ ...f, status: "DRAFT" }))}
          className="glass-panel rounded-xl border border-[var(--color-border-subtle)] border-t-2 border-t-military-400 px-5 py-4 text-left transition-all duration-200 hover:border-[var(--color-border-primary)] group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-secondary)] font-mono mb-1">
                Draft Missions
              </div>
              <div className="text-3xl font-bold font-mono text-[var(--color-text-primary)]">
                {draftCount}
              </div>
            </div>
            <svg className="w-6 h-6 text-[var(--color-text-muted)]/50 group-hover:text-[var(--color-text-secondary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </div>
        </button>
      </div>

      <MissionStats missions={myMissions} />

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="glass-panel rounded-xl border border-[var(--color-border-subtle)] p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-command-500 animate-pulse-slow" />
            <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-command-400">
              My Recent Activity
            </h2>
          </div>
          <div className="space-y-3">
            {recentActivity.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-2 border-b border-[var(--color-border-subtle)] last:border-0 cursor-pointer hover:bg-[var(--color-bg-tertiary)]/30 rounded px-2 -mx-2 transition-colors"
                onClick={() => entry.entityId && navigate(`/missions/${entry.entityId}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-1 h-1 rounded-full bg-command-400" />
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {actionLabels[entry.action] || entry.action}
                  </span>
                  {entry.details && typeof entry.details === "object" && "name" in entry.details && (
                    <span className="text-xs text-[var(--color-text-muted)] font-mono">
                      {String(entry.details.name)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[var(--color-text-muted)] font-mono">
                  {new Date(entry.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <MissionFiltersBar filters={filters} onChange={setFilters} />

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
            <div className="w-2 h-2 rounded-full bg-command-500 animate-pulse-slow" />
            <span className="font-mono text-sm tracking-wide">{t("dashboard.loadingMissions")}</span>
          </div>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="glass-panel rounded-xl border border-[var(--color-border-subtle)] py-16 text-center">
          <div className="text-[var(--color-text-muted)] text-4xl mb-3">--</div>
          <p className="text-[var(--color-text-secondary)] font-mono text-sm">{t("dashboard.noMissionsMatch")}</p>
        </div>
      )}

      {/* Bulk Export Bar */}
      {selectedIds.size > 0 && (
        <div className="glass-panel rounded-xl border border-command-600/40 px-4 py-3 mb-4 flex items-center justify-between animate-fade-in">
          <span className="text-sm text-[var(--color-text-primary)] font-mono">
            {selectedIds.size} mission{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border-primary)] rounded-lg transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleBulkExport}
              disabled={bulkExporting}
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide bg-command-500 hover:bg-command-400 rounded-lg text-[var(--color-text-primary)] transition-all duration-200 shadow-glow-blue disabled:opacity-50 flex items-center gap-2"
            >
              {bulkExporting && (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Export Selected as CSV
            </button>
          </div>
        </div>
      )}

      {view === "grid" ? (
        filtered.length > VIRTUAL_SCROLL_THRESHOLD ? (
          <VirtualList
            items={filtered}
            itemHeight={VIRTUAL_ROW_HEIGHT}
            containerHeight={600}
            overscan={3}
            getKey={(mission) => mission.id}
            renderItem={(mission) => (
              <div className="px-1 pb-4 relative">
                <MissionSelect
                  selected={selectedIds.has(mission.id)}
                  onToggle={() => toggleSelect(mission.id)}
                />
                <MissionCard mission={mission} />
              </div>
            )}
            className="animate-fade-in"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {filtered.map((mission) => (
              <div key={mission.id} className="relative">
                <MissionSelect
                  selected={selectedIds.has(mission.id)}
                  onToggle={() => toggleSelect(mission.id)}
                />
                <MissionCard mission={mission} />
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="animate-fade-in">
          <MissionTimeline missions={filtered} />
        </div>
      )}

      {showCreate && <CreateMissionModal onClose={() => setShowCreate(false)} />}
    </>
  );
}
