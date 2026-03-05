import { useEffect, useState } from "react";
import Layout from "../components/layout";
import MissionCard from "../components/mission-card";
import CreateMissionModal from "../components/create-mission-modal";
import { useMissionStore } from "../stores/mission-store";
import { useAuthStore } from "../stores/auth-store";

export default function DashboardPage() {
  const { missions, loading, fetchMissions } = useMissionStore();
  const user = useAuthStore((s) => s.user);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Missions</h2>
          {user?.role === "PLANNER" && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors"
            >
              + New Mission
            </button>
          )}
        </div>

        {loading && <p className="text-military-400">Loading missions...</p>}

        {!loading && missions.length === 0 && (
          <p className="text-military-400">No missions yet.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {missions.map((mission) => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>

        {showCreate && <CreateMissionModal onClose={() => setShowCreate(false)} />}
      </div>
    </Layout>
  );
}
