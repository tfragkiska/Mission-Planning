import { useEffect, useState, useMemo } from "react";
import Layout from "../components/layout";
import MissionCard from "../components/mission-card";
import CreateMissionModal from "../components/create-mission-modal";
import MissionFiltersBar, { MissionFilters } from "../components/mission-filters";
import MissionStats from "../components/mission-stats";
import MissionTimeline from "../components/mission-timeline";
import DashboardViewToggle from "../components/dashboard-view-toggle";
import { useMissionStore } from "../stores/mission-store";
import { useAuthStore } from "../stores/auth-store";
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
    default: // newest
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return result;
}

export default function DashboardPage() {
  const { missions, loading, fetchMissions } = useMissionStore();
  const user = useAuthStore((s) => s.user);
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<"grid" | "timeline">("grid");
  const [filters, setFilters] = useState<MissionFilters>({
    search: "",
    status: "ALL",
    type: "ALL",
    priority: "ALL",
    sortBy: "newest",
  });

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const filtered = useMemo(() => applyFilters(missions, filters), [missions, filters]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-0 sm:px-4">
        {/* Header Section */}
        <div className="relative mb-6 sm:mb-8">
          <div className="absolute inset-0 tactical-grid opacity-20 rounded-xl" />
          <div className="relative glass-panel rounded-xl border border-military-700/50 px-4 sm:px-8 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-2 h-2 rounded-full bg-tactical-500 animate-pulse-slow shadow-glow-green" />
                  <span className="text-xs font-mono uppercase tracking-[0.3em] text-tactical-500">
                    System Active
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Mission Operations Center
                </h1>
                <p className="text-sm text-military-400 mt-1 font-mono">
                  {missions.length} missions registered // {filtered.length} displayed
                </p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <DashboardViewToggle view={view} onChange={setView} />
                {user?.role === "PLANNER" && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="group relative px-4 sm:px-5 py-2.5 bg-command-500 hover:bg-command-600 rounded-lg font-semibold text-sm transition-all duration-200 hover:shadow-glow-blue flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span className="hidden sm:inline">New Mission</span>
                    <span className="sm:hidden">New</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <MissionStats missions={missions} />
        <MissionFiltersBar filters={filters} onChange={setFilters} />

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-military-400">
              <div className="w-2 h-2 rounded-full bg-command-500 animate-pulse-slow" />
              <span className="font-mono text-sm tracking-wide">Loading missions...</span>
            </div>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="glass-panel rounded-xl border border-military-700/30 py-16 text-center">
            <div className="text-military-500 text-4xl mb-3">--</div>
            <p className="text-military-400 font-mono text-sm">No missions match current filters</p>
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

        {showCreate && <CreateMissionModal onClose={() => setShowCreate(false)} />}
      </div>
    </Layout>
  );
}
