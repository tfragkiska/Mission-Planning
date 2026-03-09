import type { Mission } from "../lib/types";

interface Props {
  missions: Mission[];
}

export default function MissionStats({ missions }: Props) {
  const total = missions.length;
  const byStatus = missions.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const active = (byStatus["PLANNED"] || 0) + (byStatus["APPROVED"] || 0) +
                 (byStatus["BRIEFED"] || 0) + (byStatus["EXECUTING"] || 0);
  const drafts = byStatus["DRAFT"] || 0;
  const underReview = byStatus["UNDER_REVIEW"] || 0;
  const completed = byStatus["DEBRIEFED"] || 0;

  const stats = [
    { label: "Total Missions", value: total, color: "text-[var(--color-text-primary)]", borderColor: "border-t-military-400", indicator: "bg-military-400" },
    { label: "Active", value: active, color: "text-tactical-500", borderColor: "border-t-tactical-500", indicator: "bg-tactical-500" },
    { label: "Drafts", value: drafts, color: "text-accent-400", borderColor: "border-t-accent-500", indicator: "bg-accent-500" },
    { label: "Under Review", value: underReview, color: "text-accent-600", borderColor: "border-t-accent-600", indicator: "bg-accent-600" },
    { label: "Completed", value: completed, color: "text-command-400", borderColor: "border-t-command-500", indicator: "bg-command-500" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`glass-panel rounded-xl border border-[var(--color-border-subtle)] border-t-2 ${stat.borderColor} px-3 sm:px-4 py-3 sm:py-4 text-center transition-all duration-200 hover:border-[var(--color-border-primary)]`}
        >
          <div className="flex justify-center mb-2">
            <div className={`w-1.5 h-1.5 rounded-full ${stat.indicator} animate-pulse-slow`} />
          </div>
          <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${stat.color}`}>
            {stat.value}
          </div>
          <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-secondary)] mt-1.5 font-medium">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
