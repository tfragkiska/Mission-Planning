import { create } from "zustand";
import type { Mission } from "../lib/types";
import { api } from "../lib/api";

interface MissionState {
  missions: Mission[];
  currentMission: Mission | null;
  loading: boolean;
  error: string | null;
  fetchMissions: (filters?: { status?: string; assignedTo?: string }) => Promise<void>;
  fetchMission: (id: string) => Promise<void>;
  createMission: (data: { name: string; type: string; priority?: string }) => Promise<Mission>;
  transitionMission: (id: string, status: string, comments?: string) => Promise<void>;
}

export const useMissionStore = create<MissionState>((set, get) => ({
  missions: [],
  currentMission: null,
  loading: false,
  error: null,

  fetchMissions: async (filters?: { status?: string; assignedTo?: string }) => {
    set({ loading: true, error: null });
    try {
      const missions = await api.missions.list(filters);
      set({ missions, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to fetch", loading: false });
    }
  },

  fetchMission: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const mission = await api.missions.get(id);
      set({ currentMission: mission, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to fetch", loading: false });
    }
  },

  createMission: async (data) => {
    const mission = await api.missions.create(data);
    set({ missions: [mission, ...get().missions] });
    return mission;
  },

  transitionMission: async (id, status, comments) => {
    const mission = await api.missions.transition(id, status, comments);
    set({
      currentMission: mission,
      missions: get().missions.map((m) => (m.id === id ? mission : m)),
    });
  },
}));
