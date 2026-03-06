import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Layout from "../components/layout";
import DashboardPlanner from "../components/dashboard-planner";
import DashboardPilot from "../components/dashboard-pilot";
import DashboardCommander from "../components/dashboard-commander";
import { useMissionStore } from "../stores/mission-store";
import { useAuthStore } from "../stores/auth-store";

export default function DashboardPage() {
  // useTranslation hook available for any direct translations needed
  useTranslation();
  const { missions, loading, fetchMissions } = useMissionStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user?.role === "PILOT") {
      fetchMissions({ assignedTo: "me" });
    } else {
      fetchMissions();
    }
  }, [fetchMissions, user?.role]);

  function renderDashboard() {
    switch (user?.role) {
      case "PILOT":
        return <DashboardPilot missions={missions} loading={loading} />;
      case "COMMANDER":
        return <DashboardCommander missions={missions} loading={loading} />;
      case "PLANNER":
      default:
        return <DashboardPlanner missions={missions} loading={loading} />;
    }
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-0 sm:px-4">
        {renderDashboard()}
      </div>
    </Layout>
  );
}
