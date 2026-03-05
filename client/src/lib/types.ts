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

export interface MissionVersion {
  id: string;
  version: number;
  changedBy: string;
  changeType: string;
  createdAt: string;
  snapshot?: Mission;
}

export type NotificationType =
  | "MISSION_STATUS"
  | "MISSION_ASSIGNED"
  | "REVIEW_REQUESTED"
  | "APPROVAL"
  | "REJECTION"
  | "DECONFLICTION_ALERT";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  missionId: string | null;
  read: boolean;
  createdAt: string;
}

export type AuditAction =
  | "CREATE_MISSION"
  | "UPDATE_MISSION"
  | "TRANSITION_STATUS"
  | "ADD_WAYPOINT"
  | "DELETE_WAYPOINT"
  | "ADD_THREAT"
  | "REMOVE_THREAT"
  | "ADD_AIRCRAFT"
  | "REMOVE_AIRCRAFT"
  | "LOGIN"
  | "LOGOUT";

export type AuditEntityType =
  | "MISSION"
  | "WAYPOINT"
  | "THREAT"
  | "AIRCRAFT"
  | "CREW"
  | "USER";

export interface AuditLogEntry {
  id: string;
  userId: string;
  user: User;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}
