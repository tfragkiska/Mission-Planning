import { useState, useEffect } from "react";
import { useDebounce } from "../hooks/use-debounce";

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
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onChange({ ...filters, search: debouncedSearch });
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (key: keyof MissionFilters, value: string) => {
    if (key === "search") {
      setSearchInput(value);
      return;
    }
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = filters.status !== "ALL" || filters.type !== "ALL" || filters.priority !== "ALL" || searchInput !== "";

  const selectClasses = `bg-military-700/80 border border-military-600/50 rounded-lg px-3 py-2 text-sm
    text-military-300 focus:outline-none focus:border-command-500/50 focus:ring-1 focus:ring-command-500/20
    transition-colors cursor-pointer appearance-none min-h-[44px]`;

  return (
    <div className="glass-panel rounded-xl border border-military-700/30 p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-3.5 h-3.5 text-military-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
        <span className="text-[10px] uppercase tracking-[0.15em] text-military-500 font-semibold">
          Filters
        </span>
        {hasActiveFilters && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse-slow" />
        )}
      </div>
      <div className="flex flex-col md:flex-row flex-wrap gap-3 items-stretch md:items-center">
        <div className="relative flex-1 min-w-0 md:min-w-[220px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-military-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search missions..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-military-700/80 border border-military-600/50 rounded-lg pl-9 pr-3 py-2 text-sm
              placeholder-military-500 text-white min-h-[44px]
              focus:outline-none focus:border-command-500/50 focus:ring-1 focus:ring-command-500/20
              transition-colors"
          />
        </div>
        <div className="grid grid-cols-2 md:flex gap-3">
          <select
            value={filters.status}
            onChange={(e) => update("status", e.target.value)}
            className={`${selectClasses} ${filters.status !== "ALL" ? "border-accent-500/40 text-accent-400" : ""}`}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === "ALL" ? "All Statuses" : s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select
            value={filters.type}
            onChange={(e) => update("type", e.target.value)}
            className={`${selectClasses} ${filters.type !== "ALL" ? "border-accent-500/40 text-accent-400" : ""}`}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t === "ALL" ? "All Types" : t}</option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => update("priority", e.target.value)}
            className={`${selectClasses} ${filters.priority !== "ALL" ? "border-accent-500/40 text-accent-400" : ""}`}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p === "ALL" ? "All Priorities" : p}</option>
            ))}
          </select>
          <select
            value={filters.sortBy}
            onChange={(e) => update("sortBy", e.target.value)}
            className={selectClasses}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
