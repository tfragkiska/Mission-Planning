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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Missions</h2>
          <div className="flex items-center gap-3">
            <DashboardViewToggle view={view} onChange={setView} />
            {user?.role === "PLANNER" && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors"
              >
                + New Mission
              </button>
            )}
          </div>
        </div>

        <MissionStats missions={missions} />
        <MissionFiltersBar filters={filters} onChange={setFilters} />

        {loading && <p className="text-military-400">Loading missions...</p>}

        {!loading && filtered.length === 0 && (
          <p className="text-military-400">No missions match your filters.</p>
        )}

        {view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((mission) => (
              <MissionCard key={mission.id} mission={mission} />
            ))}
          </div>
        ) : (
          <MissionTimeline missions={filtered} />
        )}

        {showCreate && <CreateMissionModal onClose={() => setShowCreate(false)} />}
      </div>
    </Layout>
  );
}
