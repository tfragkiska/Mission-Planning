import { create } from "zustand";
import { api } from "../lib/api";

interface MissionResult {
  id: string;
  name: string;
  type: string;
  status: string;
  priority: string;
  createdBy: { id: string; name: string };
  score: number;
}

interface WaypointResult {
  id: string;
  name: string | null;
  lat: number;
  lon: number;
  type: string;
  missionId: string;
  missionName: string;
  score: number;
}

interface ThreatResult {
  id: string;
  name: string;
  category: string;
  lethality: string;
  active: boolean;
  score: number;
}

interface UserResult {
  id: string;
  name: string;
  email: string;
  role: string;
  score: number;
}

export interface SearchResults {
  missions: MissionResult[];
  waypoints: WaypointResult[];
  threats: ThreatResult[];
  users: UserResult[];
  totalCount: number;
}

const RECENT_SEARCHES_KEY = "opord_recent_searches";
const MAX_RECENT_SEARCHES = 5;

function loadRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(searches: string[]) {
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
}

interface SearchState {
  query: string;
  results: SearchResults | null;
  loading: boolean;
  isOpen: boolean;
  recentSearches: string[];
  selectedIndex: number;
  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  setSelectedIndex: (index: number) => void;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  results: null,
  loading: false,
  isOpen: false,
  recentSearches: loadRecentSearches(),
  selectedIndex: -1,

  setQuery: (query: string) => {
    set({ query, selectedIndex: -1 });

    if (debounceTimer) clearTimeout(debounceTimer);

    if (!query.trim()) {
      set({ results: null, loading: false });
      return;
    }

    set({ loading: true });
    debounceTimer = setTimeout(() => {
      get().search(query);
    }, 300);
  },

  search: async (query: string) => {
    if (!query.trim()) {
      set({ results: null, loading: false });
      return;
    }

    try {
      set({ loading: true });
      const results = await api.search.global(query);
      // Only update if the query hasn't changed while we were fetching
      if (get().query === query) {
        set({ results, loading: false });
      }
    } catch {
      if (get().query === query) {
        set({ loading: false });
      }
    }
  },

  clearSearch: () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    set({ query: "", results: null, loading: false, selectedIndex: -1 });
  },

  toggleOpen: () => {
    const isOpen = !get().isOpen;
    set({ isOpen });
    if (!isOpen) {
      get().clearSearch();
    }
  },

  setOpen: (open: boolean) => {
    set({ isOpen: open });
    if (!open) {
      get().clearSearch();
    }
  },

  addRecentSearch: (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const current = get().recentSearches.filter((s) => s !== trimmed);
    const updated = [trimmed, ...current].slice(0, MAX_RECENT_SEARCHES);
    set({ recentSearches: updated });
    saveRecentSearches(updated);
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  },

  setSelectedIndex: (index: number) => {
    set({ selectedIndex: index });
  },
}));
