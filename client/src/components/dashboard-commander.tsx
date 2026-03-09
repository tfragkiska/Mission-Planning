import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MissionCard from "./mission-card";
import MissionFiltersBar, { MissionFilters } from "./mission-filters";
import MissionTimeline from "./mission-timeline";
import DashboardViewToggle from "./dashboard-view-toggle";
import type { Mission } from "../lib/types";

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

export default function DashboardCommander({ missions, loading }: Props) {
  const navigate = useNavigate();
  const [view, setView] = useState<"grid" | "timeline">("grid");
  const [filters, setFilters] = useState<MissionFilters>({
    search: "",
    status: "ALL",
    type: "ALL",
    priority: "ALL",
    sortBy: "newest",
  });

  const pendingReview = useMemo(
    () =>
      missions
        .filter((m) => m.status === "UNDER_REVIEW")
        .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)),
    [missions],
  );

  const activeOps = useMemo(
    () => missions.filter((m) => ["APPROVED", "BRIEFED", "EXECUTING"].includes(m.status)).length,
    [missions],
  );

  const oneWeekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const thisWeekTotal = useMemo(
    () => missions.filter((m) => new Date(m.createdAt) >= oneWeekAgo).length,
    [missions, oneWeekAgo],
  );

  const recentDecisions = useMemo(
    () =>
      missions
        .filter(
          (m) =>
            (m.status === "APPROVED" || m.status === "REJECTED") &&
            m.approvedBy !== null,
        )
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5),
    [missions],
  );

  // Status distribution for overview
  const statusDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const m of missions) {
      dist[m.status] = (dist[m.status] || 0) + 1;
    }
    return dist;
  }, [missions]);

  const statusColors: Record<string, string> = {
    DRAFT: "bg-[var(--color-border-primary)]",
    PLANNED: "bg-command-500",
    UNDER_REVIEW: "bg-accent-500",
    APPROVED: "bg-tactical-500",
    REJECTED: "bg-danger-500",
    BRIEFED: "bg-purple-600",
    EXECUTING: "bg-accent-600",
    DEBRIEFED: "bg-military-500",
  };

  const filtered = useMemo(() => applyFilters(missions, filters), [missions, filters]);

  const stats = [
    {
      label: "Pending Review",
      value: pendingReview.length,
      color: "text-accent-400",
      borderColor: "border-t-accent-500",
      indicator: "bg-accent-500",
    },
    {
      label: "Active Ops",
      value: activeOps,
      color: "text-tactical-500",
      borderColor: "border-t-tactical-500",
      indicator: "bg-tactical-500",
    },
    {
      label: "This Week",
      value: thisWeekTotal,
      color: "text-command-400",
      borderColor: "border-t-command-500",
      indicator: "bg-command-500",
    },
    {
      label: "Total",
      value: missions.length,
      color: "text-[var(--color-text-primary)]",
      borderColor: "border-t-military-400",
      indicator: "bg-military-400",
    },
  ];

  return (
    <>
      {/* Header */}
      <div className="relative mb-6 sm:mb-8">
        <div className="absolute inset-0 tactical-grid opacity-20 rounded-xl" />
        <div className="relative glass-panel rounded-xl border border-[var(--color-border-primary)] px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse-slow shadow-glow-amber" />
                <span className="text-xs font-mono uppercase tracking-[0.3em] text-accent-400">
                  Commander Overview
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Command Operations Center
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1 font-mono">
                {missions.length} total missions // {pendingReview.length} awaiting review
              </p>
            </div>
            <DashboardViewToggle view={view} onChange={setView} />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`glass-panel rounded-xl border border-[var(--color-border-subtle)] border-t-2 ${stat.borderColor} px-3 sm:px-4 py-3 sm:py-4 text-center transition-all duration-200 hover:border-[var(--color-border-primary)]`}
          >
            <div className="flex justify-center mb-2">
              <div className={`w-1.5 h-1.5 rounded-full ${stat.indicator} animate-pulse-slow`} />
            </div>
            <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-secondary)] mt-1.5 font-medium">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Pending Review Section - Highlighted */}
      {pendingReview.length > 0 && (
        <div className="mb-6">
          <div className="glass-panel rounded-xl border-2 border-accent-500/40 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse-slow shadow-glow-amber" />
                <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-accent-400 font-bold">
                  Pending Review -- Action Required
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-accent-500/20 text-accent-400 text-xs font-bold font-mono">
                {pendingReview.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingReview.map((mission) => (
                <div
                  key={mission.id}
                  onClick={() => navigate(`/missions/${mission.id}`)}
                  className="glass-panel rounded-lg border border-accent-500/20 p-4 cursor-pointer transition-all duration-200 hover:border-accent-500/50 hover:shadow-glow-amber group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-[var(--color-text-primary)] group-hover:text-accent-400 transition-colors">
                      {mission.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                      mission.priority === "CRITICAL" ? "bg-danger-500 text-[var(--color-text-primary)]" :
                      mission.priority === "HIGH" ? "bg-accent-500 text-[var(--color-text-primary)]" :
                      "bg-[var(--color-border-primary)] text-[var(--color-text-primary)]"
                    }`}>
                      {mission.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                    <span>{mission.createdBy.name}</span>
                    <span className="text-[var(--color-text-muted)]">|</span>
                    <span className="font-mono">{mission.type}</span>
                    {mission.scheduledStart && (
                      <>
                        <span className="text-[var(--color-text-muted)]">|</span>
                        <span className="font-mono">
                          {new Date(mission.scheduledStart).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </>
                    )}
                    <span className="text-[var(--color-text-muted)]">|</span>
                    <span className="font-mono text-tactical-500">WPT {mission.waypoints.length}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Status Distribution */}
      <div className="glass-panel rounded-xl border border-[var(--color-border-subtle)] p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-military-400" />
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
            Status Distribution
          </h2>
        </div>
        <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-[var(--color-bg-tertiary)] mb-3">
          {Object.entries(statusDistribution).map(([status, count]) => (
            <div
              key={status}
              className={`${statusColors[status] || "bg-[var(--color-border-primary)]"} transition-all duration-500`}
              style={{ width: `${(count / missions.length) * 100}%` }}
              title={`${status.replace(/_/g, " ")}: ${count}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(statusDistribution)
            .sort(([, a], [, b]) => b - a)
            .map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${statusColors[status] || "bg-[var(--color-border-primary)]"}`} />
                <span className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase tracking-wider">
                  {status.replace(/_/g, " ")} ({count})
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Recent Approvals/Rejections */}
      {recentDecisions.length > 0 && (
        <div className="glass-panel rounded-xl border border-[var(--color-border-subtle)] p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-tactical-500 animate-pulse-slow" />
            <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-tactical-500">
              Recent Approvals / Rejections
            </h2>
          </div>
          <div className="space-y-3">
            {recentDecisions.map((mission) => (
              <div
                key={mission.id}
                className="flex items-center justify-between py-2 border-b border-[var(--color-border-subtle)] last:border-0 cursor-pointer hover:bg-[var(--color-bg-tertiary)]/30 rounded px-2 -mx-2 transition-colors"
                onClick={() => navigate(`/missions/${mission.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    mission.status === "APPROVED" ? "bg-tactical-500" : "bg-danger-500"
                  }`} />
                  <span className="text-sm text-[var(--color-text-primary)]">{mission.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    mission.status === "APPROVED"
                      ? "bg-tactical-500/20 text-tactical-500"
                      : "bg-danger-500/20 text-danger-500"
                  }`}>
                    {mission.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {mission.approvedBy && (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      by {mission.approvedBy.name}
                    </span>
                  )}
                  <span className="text-xs text-[var(--color-text-muted)] font-mono">
                    {new Date(mission.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Missions with filters */}
      <MissionFiltersBar filters={filters} onChange={setFilters} />

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
            <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse-slow" />
            <span className="font-mono text-sm tracking-wide">Loading missions...</span>
          </div>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="glass-panel rounded-xl border border-[var(--color-border-subtle)] py-16 text-center">
          <div className="text-[var(--color-text-muted)] text-4xl mb-3">--</div>
          <p className="text-[var(--color-text-secondary)] font-mono text-sm">No missions match current filters</p>
        </div>
      )}

      {view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {filtered.map((mission) => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      ) : (
        <div className="animate-fade-in">
          <MissionTimeline missions={filtered} />
        </div>
      )}
    </>
  );
}
