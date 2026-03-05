export interface MissionFilters {
  search: string;
  status: string;
  type: string;
  priority: string;
  sortBy: string;
}

interface Props {
  filters: MissionFilters;
  onChange: (filters: MissionFilters) => void;
}

const STATUSES = ["ALL", "DRAFT", "PLANNED", "UNDER_REVIEW", "APPROVED", "REJECTED", "BRIEFED", "EXECUTING", "DEBRIEFED"];
const TYPES = ["ALL", "TRAINING", "OPERATIONAL"];
const PRIORITIES = ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name", label: "Name A-Z" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
];

export default function MissionFilters({ filters, onChange }: Props) {
  const update = (key: keyof MissionFilters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-military-800 rounded-lg p-4 mb-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search missions..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="w-full bg-military-700 rounded px-3 py-2 text-sm placeholder-military-400"
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => update("status", e.target.value)}
          className="bg-military-700 rounded px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === "ALL" ? "All Statuses" : s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select
          value={filters.type}
          onChange={(e) => update("type", e.target.value)}
          className="bg-military-700 rounded px-3 py-2 text-sm"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>{t === "ALL" ? "All Types" : t}</option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => update("priority", e.target.value)}
          className="bg-military-700 rounded px-3 py-2 text-sm"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p === "ALL" ? "All Priorities" : p}</option>
          ))}
        </select>
        <select
          value={filters.sortBy}
          onChange={(e) => update("sortBy", e.target.value)}
          className="bg-military-700 rounded px-3 py-2 text-sm"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
