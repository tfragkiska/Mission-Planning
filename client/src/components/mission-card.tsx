import { useNavigate } from "react-router-dom";
import type { Mission } from "../lib/types";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-600",
  PLANNED: "bg-blue-600",
  UNDER_REVIEW: "bg-yellow-600",
  APPROVED: "bg-green-600",
  REJECTED: "bg-red-600",
  BRIEFED: "bg-purple-600",
  EXECUTING: "bg-orange-600",
  DEBRIEFED: "bg-gray-500",
};

export default function MissionCard({ mission }: { mission: Mission }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/missions/${mission.id}`)}
      className="bg-military-800 border border-military-700 rounded-lg p-4 cursor-pointer hover:border-military-500 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-lg">{mission.name}</h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[mission.status]}`}>
          {mission.status.replace("_", " ")}
        </span>
      </div>
      <div className="text-sm text-military-400 space-y-1">
        <p>Type: {mission.type} | Priority: {mission.priority}</p>
        <p>Created by: {mission.createdBy.name}</p>
        <p>Waypoints: {mission.waypoints.length}</p>
        {mission.scheduledStart && (
          <p>Scheduled: {new Date(mission.scheduledStart).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  );
}
