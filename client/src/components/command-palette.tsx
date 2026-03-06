import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMissionStore } from "../stores/mission-store";

interface PaletteItem {
  id: string;
  label: string;
  category: "mission" | "navigation" | "action";
  icon?: string;
  onSelect: () => void;
}

interface Props {
  onClose: () => void;
}

function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lowerText.length && qi < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[qi]) qi++;
  }
  return qi === lowerQuery.length;
}

function fuzzyScore(text: string, query: string): number {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  // Prefer starts-with, then includes, then fuzzy
  if (lower.startsWith(q)) return 3;
  if (lower.includes(q)) return 2;
  return 1;
}

const CATEGORY_LABELS: Record<string, string> = {
  navigation: "Navigation",
  action: "Actions",
  mission: "Missions",
};

const CATEGORY_ORDER = ["navigation", "action", "mission"];

export default function CommandPalette({ onClose }: Props) {
  const navigate = useNavigate();
  const { missions } = useMissionStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build items
  const allItems = useMemo<PaletteItem[]>(() => {
    const nav: PaletteItem[] = [
      {
        id: "nav-dashboard",
        label: "Go to Dashboard",
        category: "navigation",
        onSelect: () => navigate("/dashboard"),
      },
      {
        id: "nav-audit",
        label: "Go to Audit Log",
        category: "navigation",
        onSelect: () => navigate("/audit"),
      },
    ];

    const actions: PaletteItem[] = [
      {
        id: "action-shortcuts",
        label: "Show Keyboard Shortcuts",
        category: "action",
        onSelect: () => {
          /* handled externally by closing palette and showing help */
        },
      },
    ];

    const missionItems: PaletteItem[] = missions.slice(0, 20).map((m) => ({
      id: `mission-${m.id}`,
      label: m.name,
      category: "mission" as const,
      onSelect: () => navigate(`/missions/${m.id}`),
    }));

    return [...nav, ...actions, ...missionItems];
  }, [missions, navigate]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    return allItems
      .filter((item) => fuzzyMatch(item.label, query))
      .sort((a, b) => fuzzyScore(b.label, query) - fuzzyScore(a.label, query));
  }, [allItems, query]);

  // Group by category for display
  const grouped = useMemo(() => {
    const groups: Record<string, PaletteItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category]!.push(item);
    }
    return CATEGORY_ORDER
      .filter((cat) => groups[cat]?.length)
      .map((cat) => ({ category: cat, items: groups[cat]! }));
  }, [filtered]);

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (item: PaletteItem) => {
      onClose();
      // Use setTimeout to let the palette close before navigating
      setTimeout(() => item.onSelect(), 0);
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatItems[selectedIndex]) {
            handleSelect(flatItems[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatItems, selectedIndex, handleSelect, onClose],
  );

  let runningIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center pt-[15vh] p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative glass-panel bg-military-900/95 border border-military-700/60 rounded-2xl shadow-2xl w-full max-w-xl animate-fade-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-military-700/50">
          <svg
            className="w-5 h-5 text-military-500 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search missions, actions, pages..."
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder-military-500 outline-none font-mono"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-military-800 border border-military-600/60 text-military-500 text-[10px] font-mono">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {flatItems.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-military-500 text-sm font-mono">No results found</p>
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.category}>
              <div className="px-5 pt-3 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-military-500">
                  {CATEGORY_LABELS[group.category] || group.category}
                </span>
              </div>
              {group.items.map((item) => {
                const idx = runningIndex++;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    data-index={idx}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-left text-sm transition-colors duration-75 ${
                      isSelected
                        ? "bg-command-500/20 text-gray-100"
                        : "text-military-300 hover:bg-military-800/50"
                    }`}
                  >
                    {item.category === "mission" && (
                      <svg className="w-4 h-4 text-military-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="6" />
                        <circle cx="12" cy="12" r="2" />
                        <line x1="12" y1="2" x2="12" y2="6" />
                        <line x1="12" y1="18" x2="12" y2="22" />
                      </svg>
                    )}
                    {item.category === "navigation" && (
                      <svg className="w-4 h-4 text-military-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                    {item.category === "action" && (
                      <svg className="w-4 h-4 text-military-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    {isSelected && (
                      <kbd className="px-1.5 py-0.5 rounded bg-military-800 border border-military-600/60 text-military-500 text-[10px] font-mono">
                        Enter
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-military-700/50 px-5 py-2.5 flex items-center gap-4">
          <span className="inline-flex items-center gap-1 text-[10px] text-military-500 font-mono">
            <kbd className="px-1 py-0.5 rounded bg-military-800 border border-military-600/60 text-[10px]">&uarr;</kbd>
            <kbd className="px-1 py-0.5 rounded bg-military-800 border border-military-600/60 text-[10px]">&darr;</kbd>
            navigate
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-military-500 font-mono">
            <kbd className="px-1 py-0.5 rounded bg-military-800 border border-military-600/60 text-[10px]">Enter</kbd>
            select
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-military-500 font-mono">
            <kbd className="px-1 py-0.5 rounded bg-military-800 border border-military-600/60 text-[10px]">Esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
