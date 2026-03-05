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
    { label: "Total", value: total, color: "text-white" },
    { label: "Active", value: active, color: "text-green-400" },
    { label: "Drafts", value: drafts, color: "text-yellow-400" },
    { label: "Under Review", value: underReview, color: "text-orange-400" },
    { label: "Completed", value: completed, color: "text-blue-400" },
  ];

  return (
    <div className="grid grid-cols-5 gap-3 mb-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-military-800 rounded-lg px-4 py-3 text-center">
          <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          <div className="text-xs text-military-400 mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
