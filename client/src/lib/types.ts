export type Role = "PLANNER" | "PILOT" | "COMMANDER";
export type MissionStatus =
  | "DRAFT" | "PLANNED" | "UNDER_REVIEW" | "APPROVED"
  | "REJECTED" | "BRIEFED" | "EXECUTING" | "DEBRIEFED";
export type MissionType = "TRAINING" | "OPERATIONAL";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type WaypointType =
  | "INITIAL_POINT" | "WAYPOINT" | "TARGET"
  | "EGRESS_POINT" | "LANDING" | "RALLY_POINT";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Mission {
  id: string;
  name: string;
  type: MissionType;
  status: MissionStatus;
  priority: Priority;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  commanderComments: string | null;
  createdBy: User;
  approvedBy: User | null;
  aircraft: Aircraft[];
  crewMembers: CrewMember[];
  waypoints: Waypoint[];
  createdAt: string;
  updatedAt: string;
}

export interface Aircraft {
  id: string;
  type: string;
  tailNumber: string;
  callsign: string;
}

export interface CrewMember {
  id: string;
  role: string;
  name: string;
  aircraftId: string | null;
}

export interface Waypoint {
  id: string;
  missionId: string;
  sequenceOrder: number;
  name: string | null;
  lat: number;
  lon: number;
  altitude: number | null;
  speed: number | null;
  timeOnTarget: string | null;
  type: WaypointType;
}
