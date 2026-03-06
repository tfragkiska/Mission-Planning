import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSearchStore } from "../stores/search-store";

const statusColors: Record<string, string> = {
  DRAFT: "bg-military-600 text-military-200",
  PLANNED: "bg-command-600/30 text-command-300",
  UNDER_REVIEW: "bg-yellow-600/30 text-yellow-300",
  APPROVED: "bg-tactical-600/30 text-tactical-300",
  REJECTED: "bg-accent-600/30 text-accent-300",
  BRIEFED: "bg-blue-600/30 text-blue-300",
  EXECUTING: "bg-green-600/30 text-green-300",
  DEBRIEFED: "bg-military-500/30 text-military-300",
};

const lethalityColors: Record<string, string> = {
  LOW: "text-green-400",
  MEDIUM: "text-yellow-400",
  HIGH: "text-orange-400",
  CRITICAL: "text-red-400",
};

const roleColors: Record<string, string> = {
  PLANNER: "text-command-400",
  PILOT: "text-tactical-500",
  COMMANDER: "text-accent-400",
};

export default function GlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    query,
    results,
    loading,
    isOpen,
    recentSearches,
    selectedIndex,
    setQuery,
    clearSearch,
    setOpen,
    toggleOpen,
    addRecentSearch,
    clearRecentSearches,
    setSelectedIndex,
  } = useSearchStore();

  // Build flat list of navigable results for keyboard navigation
  const flatResults = useCallback(() => {
    if (!results) return [];
    const items: Array<{ type: string; id: string; navigate: string }> = [];
    for (const m of results.missions) {
      items.push({ type: "mission", id: m.id, navigate: `/missions/${m.id}` });
    }
    for (const w of results.waypoints) {
      items.push({ type: "waypoint", id: w.id, navigate: `/missions/${w.missionId}` });
    }
    for (const t of results.threats) {
      items.push({ type: "threat", id: t.id, navigate: `/dashboard` });
    }
    for (const u of results.users) {
      items.push({ type: "user", id: u.id, navigate: `/dashboard` });
    }
    return items;
  }, [results]);

  // Ctrl+K shortcut to open search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleOpen();
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && isOpen) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, toggleOpen, setOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [isOpen, setOpen]);

  function handleNavigate(path: string) {
    if (query.trim()) {
      addRecentSearch(query.trim());
    }
    setOpen(false);
    navigate(path);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const items = flatResults();
    const totalItems = items.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(Math.min(selectedIndex + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(Math.max(selectedIndex - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < totalItems) {
        handleNavigate(items[selectedIndex].navigate);
      }
    }
  }

  function handleRecentClick(recent: string) {
    setQuery(recent);
    inputRef.current?.focus();
  }

  const showDropdown = isOpen && (query.trim().length > 0 || recentSearches.length > 0);
  const hasResults = results && results.totalCount > 0;
  const showRecent = isOpen && !query.trim() && recentSearches.length > 0;
  const showNoResults = query.trim().length > 0 && !loading && results && results.totalCount === 0;

  // Track cumulative index for keyboard navigation
  let runningIndex = 0;

  return (
    <div className="relative">
      {/* Search trigger / input */}
      <div className="flex items-center">
        {!isOpen ? (
          <button
            onClick={() => {
              toggleOpen();
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="flex items-center gap-2 text-military-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-military-700/50"
            title="Search (Ctrl+K)"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="hidden lg:inline text-xs font-mono">Ctrl+K</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-military-800/80 border border-military-600/50 rounded-lg px-3 py-1.5 w-64 lg:w-80">
            <svg
              className="w-4 h-4 text-military-400 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search missions, waypoints, threats..."
              className="bg-transparent text-sm text-gray-100 placeholder-military-500 outline-none w-full font-mono"
              autoFocus
            />
            {loading && (
              <div className="w-4 h-4 border-2 border-tactical-500/30 border-t-tactical-500 rounded-full animate-spin flex-shrink-0" />
            )}
            {query && !loading && (
              <button
                onClick={clearSearch}
                className="text-military-400 hover:text-white flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            <span className="text-[10px] font-mono text-military-500 flex-shrink-0 border border-military-600 rounded px-1">ESC</span>
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full right-0 mt-2 w-96 max-h-[70vh] overflow-y-auto glass-panel bg-military-900/95 border border-military-600/50 rounded-xl shadow-2xl shadow-black/50 backdrop-blur-xl z-50"
        >
          {/* Recent searches */}
          {showRecent && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-military-500">
                  Recent Searches
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-[10px] font-mono text-military-500 hover:text-military-300 transition-colors"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((recent, i) => (
                <button
                  key={i}
                  onClick={() => handleRecentClick(recent)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-military-300 hover:text-white hover:bg-military-700/50 rounded-lg transition-colors text-left"
                >
                  <svg className="w-3.5 h-3.5 text-military-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="font-mono truncate">{recent}</span>
                </button>
              ))}
            </div>
          )}

          {/* Loading state */}
          {loading && query.trim() && (
            <div className="p-6 flex items-center justify-center gap-2 text-military-400">
              <div className="w-4 h-4 border-2 border-tactical-500/30 border-t-tactical-500 rounded-full animate-spin" />
              <span className="text-sm font-mono">Searching...</span>
            </div>
          )}

          {/* No results */}
          {showNoResults && (
            <div className="p-6 text-center">
              <svg className="w-8 h-8 text-military-600 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <p className="text-sm text-military-400 font-mono">No results found</p>
              <p className="text-xs text-military-500 mt-1">Try a different search term</p>
            </div>
          )}

          {/* Results grouped by type */}
          {hasResults && !loading && (
            <div className="py-2">
              {/* Missions */}
              {results.missions.length > 0 && (
                <div>
                  <div className="px-3 py-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-military-500">
                      Missions ({results.missions.length})
                    </span>
                  </div>
                  {results.missions.map((mission) => {
                    const idx = runningIndex++;
                    return (
                      <button
                        key={mission.id}
                        onClick={() => handleNavigate(`/missions/${mission.id}`)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                          selectedIndex === idx
                            ? "bg-tactical-500/20 text-white"
                            : "hover:bg-military-700/50 text-military-200"
                        }`}
                      >
                        <svg className="w-4 h-4 text-command-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{mission.name}</span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${statusColors[mission.status] || "bg-military-700 text-military-300"}`}>
                              {mission.status}
                            </span>
                          </div>
                          <span className="text-xs text-military-400 font-mono">
                            {mission.type} / {mission.priority}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Waypoints */}
              {results.waypoints.length > 0 && (
                <div>
                  {results.missions.length > 0 && (
                    <div className="mx-3 my-1 h-px bg-military-700/50" />
                  )}
                  <div className="px-3 py-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-military-500">
                      Waypoints ({results.waypoints.length})
                    </span>
                  </div>
                  {results.waypoints.map((waypoint) => {
                    const idx = runningIndex++;
                    return (
                      <button
                        key={waypoint.id}
                        onClick={() => handleNavigate(`/missions/${waypoint.missionId}`)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                          selectedIndex === idx
                            ? "bg-tactical-500/20 text-white"
                            : "hover:bg-military-700/50 text-military-200"
                        }`}
                      >
                        <svg className="w-4 h-4 text-tactical-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {waypoint.name || `Waypoint (${waypoint.type})`}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-military-400 font-mono">
                            <span>{waypoint.lat.toFixed(4)}, {waypoint.lon.toFixed(4)}</span>
                            <span className="text-military-600">|</span>
                            <span className="truncate">{waypoint.missionName}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Threats */}
              {results.threats.length > 0 && (
                <div>
                  {(results.missions.length > 0 || results.waypoints.length > 0) && (
                    <div className="mx-3 my-1 h-px bg-military-700/50" />
                  )}
                  <div className="px-3 py-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-military-500">
                      Threats ({results.threats.length})
                    </span>
                  </div>
                  {results.threats.map((threat) => {
                    const idx = runningIndex++;
                    return (
                      <button
                        key={threat.id}
                        onClick={() => handleNavigate(`/dashboard`)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                          selectedIndex === idx
                            ? "bg-tactical-500/20 text-white"
                            : "hover:bg-military-700/50 text-military-200"
                        }`}
                      >
                        <svg className="w-4 h-4 text-accent-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{threat.name}</span>
                            <span className={`text-[10px] font-mono ${lethalityColors[threat.lethality] || "text-military-400"}`}>
                              {threat.lethality}
                            </span>
                          </div>
                          <span className="text-xs text-military-400 font-mono">
                            {threat.category}{!threat.active && " (inactive)"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Users */}
              {results.users.length > 0 && (
                <div>
                  {(results.missions.length > 0 || results.waypoints.length > 0 || results.threats.length > 0) && (
                    <div className="mx-3 my-1 h-px bg-military-700/50" />
                  )}
                  <div className="px-3 py-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-military-500">
                      Users ({results.users.length})
                    </span>
                  </div>
                  {results.users.map((user) => {
                    const idx = runningIndex++;
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleNavigate(`/dashboard`)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                          selectedIndex === idx
                            ? "bg-tactical-500/20 text-white"
                            : "hover:bg-military-700/50 text-military-200"
                        }`}
                      >
                        <svg className="w-4 h-4 text-military-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{user.name}</span>
                            <span className={`text-[10px] font-mono ${roleColors[user.role] || "text-military-400"}`}>
                              {user.role}
                            </span>
                          </div>
                          <span className="text-xs text-military-400 font-mono truncate">
                            {user.email}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Total count footer */}
              <div className="px-3 py-2 border-t border-military-700/50 mt-1">
                <span className="text-[10px] font-mono text-military-500">
                  {results.totalCount} result{results.totalCount !== 1 ? "s" : ""} found
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
