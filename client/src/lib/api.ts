import { useAuthStore } from "../stores/auth-store";
import type { User, Mission, Waypoint, Threat, WeatherReport, DeconflictionResult, Aircraft, CrewMember, MissionVersion, Notification, AuditLogEntry } from "./types";

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
    list: (filters?: { status?: string; assignedTo?: string }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.assignedTo) params.set("assignedTo", filters.assignedTo);
      const query = params.toString();
      return request<Mission[]>(`/missions${query ? `?${query}` : ""}`);
    },
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
    listVersions: (id: string) => request<MissionVersion[]>(`/missions/${id}/versions`),
    getVersion: (id: string, version: number) => request<MissionVersion>(`/missions/${id}/versions/${version}`),
    clone: (id: string, name?: string) =>
      request<Mission>(`/missions/${id}/clone`, { method: "POST", body: JSON.stringify({ name }) }),
    saveAsTemplate: (id: string, templateName: string, description?: string) =>
      request<Mission>(`/missions/${id}/save-template`, { method: "POST", body: JSON.stringify({ templateName, description }) }),
    listTemplates: () =>
      request<Array<{ id: string; name: string; templateName: string; templateDescription: string | null; type: string; priority: string; _count: { waypoints: number; aircraft: number } }>>("/missions/templates/list"),
    createFromTemplate: (templateId: string, name: string) =>
      request<Mission>("/missions/templates/create", { method: "POST", body: JSON.stringify({ templateId, name }) }),
    getBriefingData: (missionId: string, template?: string) => {
      const params = template ? `?template=${template}` : "";
      return request<any>(`/missions/${missionId}/briefing-data${params}`);
    },
    getShareStatus: (id: string) =>
      request<{ shareToken: string | null; shareEnabled: boolean }>(`/missions/${id}/share`),
    enableSharing: (id: string) =>
      request<{ shareToken: string; shareUrl: string }>(`/missions/${id}/share`, { method: "POST" }),
    disableSharing: (id: string) =>
      request<{ shareEnabled: boolean }>(`/missions/${id}/share`, { method: "DELETE" }),
  },
  shared: {
    get: (token: string) => request<Mission>(`/shared/${token}`),
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
  threats: {
    list: () => request<Threat[]>("/threats"),
    get: (id: string) => request<Threat>(`/threats/${id}`),
    create: (data: Omit<Threat, "id">) =>
      request<Threat>("/threats", { method: "POST", body: JSON.stringify(data) }),
    listByMission: (missionId: string) =>
      request<Threat[]>(`/missions/${missionId}/threats`),
    addToMission: (missionId: string, threatId: string, notes?: string) =>
      request<unknown>(`/missions/${missionId}/threats`, {
        method: "POST",
        body: JSON.stringify({ threatId, notes }),
      }),
    removeFromMission: (missionId: string, threatId: string) =>
      request<void>(`/missions/${missionId}/threats/${threatId}`, { method: "DELETE" }),
  },
  weather: {
    list: (missionId: string) =>
      request<WeatherReport[]>(`/missions/${missionId}/weather`),
    add: (missionId: string, data: Record<string, unknown>) =>
      request<WeatherReport>(`/missions/${missionId}/weather`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (missionId: string, id: string) =>
      request<void>(`/missions/${missionId}/weather/${id}`, { method: "DELETE" }),
    parseMetar: (missionId: string, raw: string) =>
      request<Partial<WeatherReport>>(`/missions/${missionId}/weather/parse-metar`, {
        method: "POST",
        body: JSON.stringify({ raw }),
      }),
  },
  aircraft: {
    list: (missionId: string) => request<Aircraft[]>(`/missions/${missionId}/aircraft`),
    add: (missionId: string, data: { type: string; tailNumber: string; callsign: string }) =>
      request<Aircraft>(`/missions/${missionId}/aircraft`, { method: "POST", body: JSON.stringify(data) }),
    remove: (missionId: string, id: string) =>
      request<void>(`/missions/${missionId}/aircraft/${id}`, { method: "DELETE" }),
  },
  crew: {
    list: (missionId: string) => request<CrewMember[]>(`/missions/${missionId}/crew`),
    add: (missionId: string, data: { name: string; role: string; aircraftId?: string }) =>
      request<CrewMember>(`/missions/${missionId}/crew`, { method: "POST", body: JSON.stringify(data) }),
    remove: (missionId: string, id: string) =>
      request<void>(`/missions/${missionId}/crew/${id}`, { method: "DELETE" }),
  },
  airspaces: {
    list: async (filters?: { active?: boolean; type?: string }) => {
      const params = new URLSearchParams();
      if (filters?.active !== undefined) params.set("active", String(filters.active));
      if (filters?.type) params.set("type", filters.type);
      const query = params.toString();
      return request(`/airspaces${query ? `?${query}` : ""}`);
    },
    create: async (data: any) => request("/airspaces", { method: "POST", body: JSON.stringify(data) }),
    getById: async (id: string) => request(`/airspaces/${id}`),
    update: async (id: string, data: any) => request(`/airspaces/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: async (id: string) => request<void>(`/airspaces/${id}`, { method: "DELETE" }),
  },
  deconfliction: {
    run: (missionId: string) =>
      request<DeconflictionResult[]>(`/missions/${missionId}/deconfliction/run`, { method: "POST" }),
    list: (missionId: string) =>
      request<DeconflictionResult[]>(`/missions/${missionId}/deconfliction`),
    resolve: (missionId: string, id: string) =>
      request<DeconflictionResult>(`/missions/${missionId}/deconfliction/${id}/resolve`, { method: "POST" }),
    status: (missionId: string) =>
      request<{ hasCritical: boolean; canApprove: boolean }>(`/missions/${missionId}/deconfliction/status`),
  },
  audit: {
    list: (filters?: {
      userId?: string;
      entityType?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }) => {
      const params = new URLSearchParams();
      if (filters?.userId) params.set("userId", filters.userId);
      if (filters?.entityType) params.set("entityType", filters.entityType);
      if (filters?.action) params.set("action", filters.action);
      if (filters?.startDate) params.set("startDate", filters.startDate);
      if (filters?.endDate) params.set("endDate", filters.endDate);
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.limit) params.set("limit", String(filters.limit));
      const query = params.toString();
      return request<{
        logs: AuditLogEntry[];
        total: number;
        limit: number;
        offset: number;
      }>(`/audit${query ? `?${query}` : ""}`);
    },
    forMission: (missionId: string) =>
      request<AuditLogEntry[]>(`/audit/mission/${missionId}`),
  },
  exports: {
    download: async (missionId: string, format: string): Promise<Blob> => {
      const token = useAuthStore.getState().token;
      const res = await fetch(`${BASE_URL}/missions/${missionId}/export/${format}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.status === 401) {
        useAuthStore.getState().logout();
        throw new Error("Unauthorized");
      }
      if (!res.ok) {
        throw new Error(`Export failed: ${res.status}`);
      }
      return res.blob();
    },
    bulkCSV: async (missionIds: string[]): Promise<Blob> => {
      const token = useAuthStore.getState().token;
      const res = await fetch(`${BASE_URL}/missions/export/bulk-csv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ missionIds }),
      });
      if (res.status === 401) {
        useAuthStore.getState().logout();
        throw new Error("Unauthorized");
      }
      if (!res.ok) {
        throw new Error(`Bulk export failed: ${res.status}`);
      }
      return res.blob();
    },
  },
  search: {
    global: (query: string, options?: { types?: string; limit?: number }) => {
      const params = new URLSearchParams();
      params.set("q", query);
      if (options?.types) params.set("types", options.types);
      if (options?.limit) params.set("limit", String(options.limit));
      return request<{
        missions: Array<{
          id: string;
          name: string;
          type: string;
          status: string;
          priority: string;
          createdBy: { id: string; name: string };
          score: number;
        }>;
        waypoints: Array<{
          id: string;
          name: string | null;
          lat: number;
          lon: number;
          type: string;
          missionId: string;
          missionName: string;
          score: number;
        }>;
        threats: Array<{
          id: string;
          name: string;
          category: string;
          lethality: string;
          active: boolean;
          score: number;
        }>;
        users: Array<{
          id: string;
          name: string;
          email: string;
          role: string;
          score: number;
        }>;
        totalCount: number;
      }>(`/search?${params.toString()}`);
    },
  },
  notifications: {
    list: (filters?: { unread?: boolean; limit?: number }) => {
      const params = new URLSearchParams();
      if (filters?.unread) params.set("unread", "true");
      if (filters?.limit) params.set("limit", String(filters.limit));
      const query = params.toString();
      return request<Notification[]>(`/notifications${query ? `?${query}` : ""}`);
    },
    markRead: (id: string) =>
      request<Notification>(`/notifications/${id}/read`, { method: "PATCH" }),
    markAllRead: () =>
      request<void>("/notifications/read-all", { method: "POST" }),
  },
};
