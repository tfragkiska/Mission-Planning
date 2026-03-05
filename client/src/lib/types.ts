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

export type ThreatCategory = "SAM" | "AAA" | "MANPAD" | "RADAR" | "FIGHTER" | "OTHER";
export type ThreatLethality = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ConflictType = "AIRSPACE" | "TIMING" | "RESOURCE" | "RESTRICTED_AIRSPACE";
export type ConflictSeverity = "INFO" | "WARNING" | "CRITICAL";
export type ConflictResolution = "UNRESOLVED" | "RESOLVED" | "ACCEPTED";

export interface Threat {
  id: string;
  name: string;
  category: ThreatCategory;
  lat: number;
  lon: number;
  rangeNm: number;
  lethality: ThreatLethality;
  minAltitude: number | null;
  maxAltitude: number | null;
  active: boolean;
  notes: string | null;
}

export interface WeatherReport {
  id: string;
  missionId: string;
  stationId: string;
  type: string;
  rawReport: string;
  temperature: number | null;
  windSpeed: number | null;
  windDir: number | null;
  visibility: number | null;
  ceiling: number | null;
  conditions: string | null;
  isManual: boolean;
  observedAt: string;
}

export interface DeconflictionResult {
  id: string;
  missionId: string;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  description: string;
  resolution: ConflictResolution;
  resolvedBy: string | null;
  resolvedAt: string | null;
  details: Record<string, unknown> | null;
}
