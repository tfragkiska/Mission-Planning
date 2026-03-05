import { useNavigate } from "react-router-dom";
import type { Mission } from "../lib/types";

interface Props {
  missions: Mission[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-military-500",
  PLANNED: "bg-command-500",
  UNDER_REVIEW: "bg-accent-500",
  APPROVED: "bg-tactical-500",
  REJECTED: "bg-danger-500",
  BRIEFED: "bg-purple-500",
  EXECUTING: "bg-accent-600",
  DEBRIEFED: "bg-military-400",
};

const STATUS_RING: Record<string, string> = {
  DRAFT: "ring-military-500/30",
  PLANNED: "ring-command-500/30",
  UNDER_REVIEW: "ring-accent-500/30",
  APPROVED: "ring-tactical-500/30",
  REJECTED: "ring-danger-500/30",
  BRIEFED: "ring-purple-500/30",
  EXECUTING: "ring-accent-600/30",
  DEBRIEFED: "ring-military-400/30",
};

const PRIORITY_BORDERS: Record<string, string> = {
  LOW: "border-l-military-500",
  MEDIUM: "border-l-command-400",
  HIGH: "border-l-accent-500",
  CRITICAL: "border-l-danger-500",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "text-military-400",
  MEDIUM: "text-command-400",
  HIGH: "text-accent-400",
  CRITICAL: "text-danger-500 font-bold",
};

export default function MissionTimeline({ missions }: Props) {
  const navigate = useNavigate();

  const sortedMissions = [...missions].sort((a, b) => {
    const dateA = a.scheduledStart ? new Date(a.scheduledStart).getTime() : new Date(a.createdAt).getTime();
    const dateB = b.scheduledStart ? new Date(b.scheduledStart).getTime() : new Date(b.createdAt).getTime();
    return dateA - dateB;
  });

  if (missions.length === 0) {
    return (
      <div className="glass-panel rounded-xl border border-military-700/30 py-16 text-center">
        <p className="text-military-400 font-mono text-sm">No missions to display.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-8">
      {/* Vertical timeline line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-tactical-500/40 via-military-600/40 to-transparent" />

      <div className="space-y-3">
        {sortedMissions.map((mission) => {
          const startDate = mission.scheduledStart
            ? new Date(mission.scheduledStart).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
            : "Unscheduled";
          const endDate = mission.scheduledEnd
            ? new Date(mission.scheduledEnd).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
            : "";
          const dotColor = STATUS_COLORS[mission.status] || "bg-military-500";
          const ringColor = STATUS_RING[mission.status] || "ring-military-500/30";

          return (
            <div key={mission.id} className="relative">
              {/* Timeline dot */}
              <div className={`absolute -left-8 top-4 w-[9px] h-[9px] rounded-full ${dotColor} ring-[3px] ${ringColor} z-10`} />

              {/* Card */}
              <div
                onClick={() => navigate(`/missions/${mission.id}`)}
                className={`group glass-panel rounded-xl border border-military-700/30 px-5 py-4 cursor-pointer
                  transition-all duration-300 ease-out
                  hover:border-military-500/50 hover:shadow-lg hover:shadow-black/10
                  border-l-[3px] ${PRIORITY_BORDERS[mission.priority] || "border-l-military-500"}`}
              >
                <div className="flex items-center gap-4">
                  {/* Time column */}
                  <div className="flex-shrink-0 w-28 text-right">
                    <div className="text-xs font-mono text-military-400">{startDate}</div>
                    {endDate && (
                      <div className="text-[10px] font-mono text-military-500 mt-0.5">to {endDate}</div>
                    )}
                  </div>

                  {/* Separator */}
                  <div className="w-px h-8 bg-military-700/50 flex-shrink-0" />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white group-hover:text-tactical-500 transition-colors truncate">
                        {mission.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-military-700/60 text-[9px] font-mono uppercase tracking-wider text-military-400 flex-shrink-0">
                        {mission.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-military-500 mt-0.5 font-mono">
                      {mission.status.replace(/_/g, " ")}
                    </div>
                  </div>

                  {/* Priority */}
                  <div className={`text-[10px] font-mono uppercase tracking-wider flex-shrink-0 ${PRIORITY_STYLES[mission.priority] || "text-military-400"}`}>
                    {mission.priority}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
