/**
 * Briefing template system for mission briefing PDF generation.
 *
 * Defines the BriefingTemplate interface and three built-in templates:
 *   - Standard OPORD (5-paragraph operational order)
 *   - Quick Brief (condensed single-page summary)
 *   - Crew Brief (pilot-focused with route, threats, weather, freqs)
 */

export type TemplateId = "opord" | "quick" | "crew";

export interface BriefingSection {
  id: string;
  title: string;
  enabled: boolean;
  /** Order in which section appears (lower = earlier) */
  order: number;
}

export interface BriefingTemplate {
  id: TemplateId;
  name: string;
  description: string;
  /** Whether to include a table of contents page */
  includeTableOfContents: boolean;
  /** Whether to use condensed/compact layout */
  compact: boolean;
  sections: BriefingSection[];
}

/** Structured briefing data returned by the briefing-data endpoint */
export interface BriefingData {
  mission: {
    id: string;
    name: string;
    type: string;
    status: string;
    priority: string;
    scheduledStart: string | null;
    scheduledEnd: string | null;
    commanderComments: string | null;
    createdAt: string;
    updatedAt: string;
  };
  createdBy: { id: string; name: string; email: string; role: string };
  approvedBy: { id: string; name: string; email: string; role: string } | null;
  aircraft: Array<{
    id: string;
    callsign: string;
    type: string;
    tailNumber: string;
  }>;
  crewMembers: Array<{
    id: string;
    name: string;
    role: string;
    aircraftId: string | null;
  }>;
  waypoints: Array<{
    sequenceOrder: number;
    name: string | null;
    lat: number;
    lon: number;
    altitude: number | null;
    speed: number | null;
    timeOnTarget: string | null;
    type: string;
  }>;
  threats: Array<{
    name: string;
    category: string;
    lat: number;
    lon: number;
    rangeNm: number;
    lethality: string;
    minAltitude: number | null;
    maxAltitude: number | null;
    notes: string | null;
  }>;
  weather: Array<{
    stationId: string;
    type: string;
    rawReport: string;
    temperature: number | null;
    windSpeed: number | null;
    windDir: number | null;
    visibility: number | null;
    ceiling: number | null;
    observedAt: string;
  }>;
  deconfliction: {
    critical: Array<{ conflictType: string; description: string; resolution: string }>;
    warnings: Array<{ conflictType: string; description: string; resolution: string }>;
    resolved: number;
    allClear: boolean;
  };
  generatedAt: string;
  templateId: TemplateId;
}

// ---------------------------------------------------------------------------
// Built-in templates
// ---------------------------------------------------------------------------

export const STANDARD_OPORD: BriefingTemplate = {
  id: "opord",
  name: "Standard OPORD",
  description: "Full 5-paragraph operational order: Situation, Mission, Execution, Sustainment, Command & Signal",
  includeTableOfContents: true,
  compact: false,
  sections: [
    { id: "header",              title: "Header",                 enabled: true, order: 0 },
    { id: "mission-overview",    title: "1. Situation",           enabled: true, order: 1 },
    { id: "threat-assessment",   title: "   a. Threat Assessment", enabled: true, order: 2 },
    { id: "weather-summary",     title: "   b. Weather",          enabled: true, order: 3 },
    { id: "deconfliction-status", title: "   c. Airspace / Deconfliction", enabled: true, order: 4 },
    { id: "mission-statement",   title: "2. Mission",             enabled: true, order: 5 },
    { id: "route-details",       title: "3. Execution",           enabled: true, order: 6 },
    { id: "aircraft-crew",       title: "4. Sustainment",         enabled: true, order: 7 },
    { id: "commander-notes",     title: "5. Command & Signal",    enabled: true, order: 8 },
  ],
};

export const QUICK_BRIEF: BriefingTemplate = {
  id: "quick",
  name: "Quick Brief",
  description: "Condensed single-page summary for time-critical missions",
  includeTableOfContents: false,
  compact: true,
  sections: [
    { id: "header",              title: "Header",              enabled: true,  order: 0 },
    { id: "mission-overview",    title: "Mission Summary",     enabled: true,  order: 1 },
    { id: "route-details",       title: "Route",               enabled: true,  order: 2 },
    { id: "threat-assessment",   title: "Threats",             enabled: true,  order: 3 },
    { id: "weather-summary",     title: "Weather",             enabled: true,  order: 4 },
    { id: "aircraft-crew",       title: "Aircraft / Crew",     enabled: false, order: 5 },
    { id: "deconfliction-status", title: "Deconfliction",      enabled: true,  order: 6 },
    { id: "commander-notes",     title: "Commander Notes",     enabled: false, order: 7 },
  ],
};

export const CREW_BRIEF: BriefingTemplate = {
  id: "crew",
  name: "Crew Brief",
  description: "Pilot-focused brief emphasising route, threats, weather, and frequencies",
  includeTableOfContents: false,
  compact: false,
  sections: [
    { id: "header",              title: "Header",              enabled: true,  order: 0 },
    { id: "mission-overview",    title: "Mission Overview",    enabled: true,  order: 1 },
    { id: "aircraft-crew",       title: "Aircraft & Crew",     enabled: true,  order: 2 },
    { id: "route-details",       title: "Route / Waypoints",   enabled: true,  order: 3 },
    { id: "threat-assessment",   title: "Threat Matrix",       enabled: true,  order: 4 },
    { id: "weather-summary",     title: "Weather",             enabled: true,  order: 5 },
    { id: "deconfliction-status", title: "Deconfliction",      enabled: true,  order: 6 },
    { id: "commander-notes",     title: "Notes",               enabled: false, order: 7 },
  ],
};

export const TEMPLATES: Record<TemplateId, BriefingTemplate> = {
  opord: STANDARD_OPORD,
  quick: QUICK_BRIEF,
  crew: CREW_BRIEF,
};

export function getTemplate(id: string | undefined): BriefingTemplate {
  if (id && id in TEMPLATES) return TEMPLATES[id as TemplateId];
  return STANDARD_OPORD;
}

export function listTemplates(): Array<{ id: TemplateId; name: string; description: string }> {
  return Object.values(TEMPLATES).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
  }));
}
