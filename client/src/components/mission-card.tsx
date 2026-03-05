import { useNavigate } from "react-router-dom";
import type { Mission } from "../lib/types";

const statusStyles: Record<string, { bg: string; glow: string }> = {
  DRAFT: { bg: "bg-military-600", glow: "" },
  PLANNED: { bg: "bg-command-500", glow: "shadow-glow-blue" },
  UNDER_REVIEW: { bg: "bg-accent-500", glow: "shadow-glow-amber" },
  APPROVED: { bg: "bg-tactical-500", glow: "shadow-glow-green" },
  REJECTED: { bg: "bg-danger-500", glow: "" },
  BRIEFED: { bg: "bg-purple-600", glow: "" },
  EXECUTING: { bg: "bg-accent-600", glow: "shadow-glow-amber" },
  DEBRIEFED: { bg: "bg-military-500", glow: "" },
};

const priorityBorders: Record<string, string> = {
  LOW: "border-l-military-500",
  MEDIUM: "border-l-command-400",
  HIGH: "border-l-accent-500",
  CRITICAL: "border-l-danger-500",
};

export default function MissionCard({ mission }: { mission: Mission }) {
  const navigate = useNavigate();
  const status = statusStyles[mission.status] || { bg: "bg-military-600", glow: "" };
  const borderColor = priorityBorders[mission.priority] || "border-l-military-500";

  return (
    <div
      onClick={() => navigate(`/missions/${mission.id}`)}
      className={`group relative glass-panel border border-military-700/50 rounded-xl p-5 cursor-pointer
        transition-all duration-300 ease-out
        hover:border-military-500/70 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20
        border-l-[3px] ${borderColor}`}
    >
      {/* Corner accent */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-tactical-500/30 rounded-tl-xl" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-tactical-500/30 rounded-tr-xl" />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-base text-white group-hover:text-tactical-500 transition-colors truncate pr-2">
          {mission.name}
        </h3>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${status.bg} ${status.glow}`}>
          {mission.status.replace(/_/g, " ")}
        </span>
      </div>

      {/* Tags row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 rounded bg-military-700/80 text-[10px] font-mono uppercase tracking-wider text-military-300">
          {mission.type}
        </span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider
          ${mission.priority === "CRITICAL" ? "bg-danger-500/20 text-danger-500" :
            mission.priority === "HIGH" ? "bg-accent-500/20 text-accent-400" :
            mission.priority === "MEDIUM" ? "bg-command-500/20 text-command-400" :
            "bg-military-700/80 text-military-400"}`}>
          {mission.priority}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-military-400">
          <span>{mission.createdBy.name}</span>
          <span className="font-mono text-tactical-500 text-xs">
            WPT {mission.waypoints.length}
          </span>
        </div>
        {mission.scheduledStart && (
          <div className="flex items-center gap-1.5 text-military-400 text-xs font-mono">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {new Date(mission.scheduledStart).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-military-600/50 to-transparent" />
    </div>
  );
}
