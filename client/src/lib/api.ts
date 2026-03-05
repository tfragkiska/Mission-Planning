import { useAuthStore } from "../stores/auth-store";
import type { User, Mission, Waypoint } from "./types";

const BASE_URL = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (res.status === 401) {
    useAuthStore.getState().logout();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<User>("/auth/me"),
  },
  missions: {
    list: () => request<Mission[]>("/missions"),
    get: (id: string) => request<Mission>(`/missions/${id}`),
    create: (data: { name: string; type: string; priority?: string; scheduledStart?: string; scheduledEnd?: string }) =>
      request<Mission>("/missions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Mission>(`/missions/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/missions/${id}`, { method: "DELETE" }),
    transition: (id: string, status: string, comments?: string) =>
      request<Mission>(`/missions/${id}/transition`, {
        method: "POST",
        body: JSON.stringify({ status, comments }),
      }),
  },
  waypoints: {
    list: (missionId: string) =>
      request<Waypoint[]>(`/missions/${missionId}/waypoints`),
    create: (missionId: string, data: { lat: number; lon: number; name?: string; altitude?: number; speed?: number; type?: string }) =>
      request<Waypoint>(`/missions/${missionId}/waypoints`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (missionId: string, id: string, data: Record<string, unknown>) =>
      request<Waypoint>(`/missions/${missionId}/waypoints/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (missionId: string, id: string) =>
      request<void>(`/missions/${missionId}/waypoints/${id}`, { method: "DELETE" }),
    reorder: (missionId: string, waypointIds: string[]) =>
      request<Waypoint[]>(`/missions/${missionId}/waypoints/reorder`, {
        method: "PUT",
        body: JSON.stringify({ waypointIds }),
      }),
  },
};
