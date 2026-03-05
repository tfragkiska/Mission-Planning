import { useNavigate } from "react-router-dom";
import type { Mission } from "../lib/types";

interface Props {
  missions: Mission[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-500",
  PLANNED: "bg-blue-500",
  UNDER_REVIEW: "bg-yellow-500",
  APPROVED: "bg-green-500",
  REJECTED: "bg-red-500",
  BRIEFED: "bg-purple-500",
  EXECUTING: "bg-orange-500",
  DEBRIEFED: "bg-cyan-500",
};

const PRIORITY_BORDERS: Record<string, string> = {
  LOW: "border-l-gray-400",
  MEDIUM: "border-l-blue-400",
  HIGH: "border-l-orange-400",
  CRITICAL: "border-l-red-400",
};

export default function MissionTimeline({ missions }: Props) {
  const navigate = useNavigate();

  const sortedMissions = [...missions].sort((a, b) => {
    const dateA = a.scheduledStart ? new Date(a.scheduledStart).getTime() : new Date(a.createdAt).getTime();
    const dateB = b.scheduledStart ? new Date(b.scheduledStart).getTime() : new Date(b.createdAt).getTime();
    return dateA - dateB;
  });

  if (missions.length === 0) {
    return <p className="text-military-400">No missions to display.</p>;
  }

  return (
    <div className="space-y-2">
      {sortedMissions.map((mission) => {
        const startDate = mission.scheduledStart
          ? new Date(mission.scheduledStart).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
          : "Unscheduled";
        const endDate = mission.scheduledEnd
          ? new Date(mission.scheduledEnd).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
          : "";

        return (
          <div
            key={mission.id}
            onClick={() => navigate(`/missions/${mission.id}`)}
            className={`flex items-center gap-3 bg-military-800 rounded-lg px-4 py-3 cursor-pointer hover:bg-military-700 transition-colors border-l-4 ${PRIORITY_BORDERS[mission.priority] || "border-l-gray-500"}`}
          >
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[mission.status] || "bg-gray-500"}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{mission.name}</span>
                <span className="text-xs text-military-400 flex-shrink-0">{mission.type}</span>
              </div>
              <div className="text-xs text-military-400 mt-0.5">
                {startDate}{endDate ? ` — ${endDate}` : ""} | {mission.status.replace(/_/g, " ")}
              </div>
            </div>
            <div className="text-xs text-military-400 flex-shrink-0">
              {mission.priority}
            </div>
          </div>
        );
      })}
    </div>
  );
}
