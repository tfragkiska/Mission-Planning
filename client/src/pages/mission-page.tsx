import { useEffect, useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/layout";
import MissionMap from "../map/mission-map";
import WaypointPanel from "../components/waypoint-panel";
import AircraftCrewPanel from "../components/aircraft-crew-panel";
import ThreatPanel from "../components/threat-panel";
import WeatherPanel from "../components/weather-panel";
import DeconflictionPanel from "../components/deconfliction-panel";
import { useMissionStore } from "../stores/mission-store";
import { useWaypointStore } from "../stores/waypoint-store";
import { useAuthStore } from "../stores/auth-store";
import { api } from "../lib/api";
import type { MissionStatus, Threat, WeatherReport, DeconflictionResult } from "../lib/types";

const NEXT_STATUS: Partial<Record<MissionStatus, { label: string; status: MissionStatus; roles: string[] }>> = {
  DRAFT: { label: "Mark as Planned", status: "PLANNED", roles: ["PLANNER"] },
  PLANNED: { label: "Submit for Review", status: "UNDER_REVIEW", roles: ["PLANNER"] },
  UNDER_REVIEW: { label: "Approve", status: "APPROVED", roles: ["COMMANDER"] },
  APPROVED: { label: "Mark as Briefed", status: "BRIEFED", roles: ["PLANNER", "PILOT"] },
  BRIEFED: { label: "Begin Execution", status: "EXECUTING", roles: ["PLANNER"] },
  EXECUTING: { label: "Complete Debrief", status: "DEBRIEFED", roles: ["PLANNER"] },
};

export default function MissionPage() {
  const { id } = useParams<{ id: string }>();
  const { currentMission, fetchMission, transitionMission } = useMissionStore();
  const { waypoints, fetchWaypoints, addWaypoint, updateWaypoint, deleteWaypoint } =
    useWaypointStore();
  const user = useAuthStore((s) => s.user);

  const [missionThreats, setMissionThreats] = useState<Threat[]>([]);
  const [weatherReports, setWeatherReports] = useState<WeatherReport[]>([]);
  const [deconflictionResults, setDeconflictionResults] = useState<DeconflictionResult[]>([]);
  const [deconflictionLoading, setDeconflictionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchMission(id);
      fetchWaypoints(id);
      api.threats.listByMission(id).then(setMissionThreats).catch(() => {});
      api.weather.list(id).then(setWeatherReports).catch(() => {});
      api.deconfliction.list(id).then(setDeconflictionResults).catch(() => {});
    }
  }, [id, fetchMission, fetchWaypoints]);

  const handleMapClick = useCallback(
    (lat: number, lon: number) => {
      if (id && currentMission?.status === "DRAFT" && user?.role === "PLANNER") {
        addWaypoint(id, { lat, lon });
      }
    },
    [id, addWaypoint, currentMission?.status, user?.role],
  );

  const handleWaypointDrag = useCallback(
    (waypointId: string, lat: number, lon: number) => {
      if (id) updateWaypoint(id, waypointId, { lat, lon });
    },
    [id, updateWaypoint],
  );

  const handleDelete = useCallback(
    (waypointId: string) => {
      if (id) deleteWaypoint(id, waypointId);
    },
    [id, deleteWaypoint],
  );

  const handleAddThreat = useCallback(async (threatId: string) => {
    if (!id) return;
    await api.threats.addToMission(id, threatId);
    const threats = await api.threats.listByMission(id);
    setMissionThreats(threats);
  }, [id]);

  const handleRemoveThreat = useCallback(async (threatId: string) => {
    if (!id) return;
    await api.threats.removeFromMission(id, threatId);
    setMissionThreats((prev) => prev.filter((t) => t.id !== threatId));
  }, [id]);

  const handleAddWeather = useCallback((report: WeatherReport) => {
    setWeatherReports((prev) => [...prev, report]);
  }, []);

  const handleDeleteWeather = useCallback(async (reportId: string) => {
    if (!id) return;
    await api.weather.delete(id, reportId);
    setWeatherReports((prev) => prev.filter((r) => r.id !== reportId));
  }, [id]);

  const handleRunDeconfliction = useCallback(async () => {
    if (!id) return;
    setDeconflictionLoading(true);
    try {
      const results = await api.deconfliction.run(id);
      setDeconflictionResults(results);
    } finally {
      setDeconflictionLoading(false);
    }
  }, [id]);

  const handleResolveConflict = useCallback(async (conflictId: string) => {
    if (!id) return;
    const updated = await api.deconfliction.resolve(id, conflictId);
    setDeconflictionResults((prev) => prev.map((r) => (r.id === conflictId ? updated : r)));
  }, [id]);

  // No-op handlers for aircraft/crew (backend endpoints not yet available)
  const noopAddAircraft = useCallback(() => {}, []);
  const noopAddCrew = useCallback(() => {}, []);
  const noopRemoveAircraft = useCallback(() => {}, []);
  const noopRemoveCrew = useCallback(() => {}, []);

  if (!currentMission) {
    return (
      <Layout>
        <p className="text-military-400">Loading mission...</p>
      </Layout>
    );
  }

  const editable = currentMission.status === "DRAFT" && user?.role === "PLANNER";
  const nextAction = NEXT_STATUS[currentMission.status];
  const canTransition = nextAction && user && nextAction.roles.includes(user.role);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{currentMission.name}</h2>
            <p className="text-military-400 text-sm">
              {currentMission.type} | {currentMission.priority} | Status: {currentMission.status.replace(/_/g, " ")}
            </p>
          </div>
          <div className="flex gap-2">
            {currentMission.status === "UNDER_REVIEW" && user?.role === "COMMANDER" && (
              <button
                onClick={() => {
                  const comments = prompt("Rejection reason:");
                  if (comments && id) transitionMission(id, "REJECTED", comments);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-medium"
              >
                Reject
              </button>
            )}
            {canTransition && (
              <button
                onClick={() => id && transitionMission(id, nextAction.status)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
              >
                {nextAction.label}
              </button>
            )}
          </div>
        </div>

        {currentMission.commanderComments && (
          <div className="bg-red-900/30 border border-red-700 rounded px-4 py-3 mb-4">
            <p className="text-sm font-medium text-red-300">Commander feedback:</p>
            <p className="text-sm text-red-200">{currentMission.commanderComments}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-[600px]">
            <MissionMap
              waypoints={waypoints}
              threats={missionThreats}
              editable={editable}
              onMapClick={handleMapClick}
              onWaypointDrag={handleWaypointDrag}
            />
          </div>
          <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto">
            <WaypointPanel
              waypoints={waypoints}
              editable={editable}
              onDelete={handleDelete}
            />
            <AircraftCrewPanel
              missionId={id || ""}
              aircraft={currentMission.aircraft || []}
              crewMembers={currentMission.crewMembers || []}
              editable={false}
              onAddAircraft={noopAddAircraft}
              onAddCrew={noopAddCrew}
              onRemoveAircraft={noopRemoveAircraft}
              onRemoveCrew={noopRemoveCrew}
            />
            <ThreatPanel
              missionId={id || ""}
              missionThreats={missionThreats}
              editable={editable}
              onAdd={handleAddThreat}
              onRemove={handleRemoveThreat}
            />
            <WeatherPanel
              missionId={id || ""}
              reports={weatherReports}
              editable={editable}
              onAdd={handleAddWeather}
              onDelete={handleDeleteWeather}
            />
            <DeconflictionPanel
              results={deconflictionResults}
              editable={editable}
              onRunCheck={handleRunDeconfliction}
              onResolve={handleResolveConflict}
              loading={deconflictionLoading}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
