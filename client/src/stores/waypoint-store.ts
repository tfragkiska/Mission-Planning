import { create } from "zustand";
import type { Waypoint } from "../lib/types";
import { api } from "../lib/api";

interface WaypointState {
  waypoints: Waypoint[];
  loading: boolean;
  fetchWaypoints: (missionId: string) => Promise<void>;
  addWaypoint: (missionId: string, data: { lat: number; lon: number; name?: string; altitude?: number; type?: string }) => Promise<void>;
  updateWaypoint: (missionId: string, id: string, data: Record<string, unknown>) => Promise<void>;
  deleteWaypoint: (missionId: string, id: string) => Promise<void>;
}

export const useWaypointStore = create<WaypointState>((set, get) => ({
  waypoints: [],
  loading: false,

  fetchWaypoints: async (missionId) => {
    set({ loading: true });
    const waypoints = await api.waypoints.list(missionId);
    set({ waypoints, loading: false });
  },

  addWaypoint: async (missionId, data) => {
    const waypoint = await api.waypoints.create(missionId, data);
    set({ waypoints: [...get().waypoints, waypoint] });
  },

  updateWaypoint: async (missionId, id, data) => {
    const updated = await api.waypoints.update(missionId, id, data);
    set({ waypoints: get().waypoints.map((w) => (w.id === id ? updated : w)) });
  },

  deleteWaypoint: async (missionId, id) => {
    await api.waypoints.delete(missionId, id);
    set({ waypoints: get().waypoints.filter((w) => w.id !== id) });
  },
}));
