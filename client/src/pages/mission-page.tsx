import { useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/layout";
import MissionMap from "../map/mission-map";
import WaypointPanel from "../components/waypoint-panel";
import { useMissionStore } from "../stores/mission-store";
import { useWaypointStore } from "../stores/waypoint-store";
import { useAuthStore } from "../stores/auth-store";
import type { MissionStatus } from "../lib/types";

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

  useEffect(() => {
    if (id) {
      fetchMission(id);
      fetchWaypoints(id);
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 h-[600px]">
            <MissionMap
              waypoints={waypoints}
              editable={editable}
              onMapClick={handleMapClick}
              onWaypointDrag={handleWaypointDrag}
            />
          </div>
          <div className="lg:col-span-1">
            <WaypointPanel
              waypoints={waypoints}
              editable={editable}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
