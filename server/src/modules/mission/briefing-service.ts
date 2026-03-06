import PDFDocument from "pdfkit";
import { prisma } from "../../infra/database";
import { NotFoundError } from "../../shared/errors";
import { getTemplate, type BriefingTemplate, type BriefingData, type TemplateId } from "./briefing-templates";

// ---------------------------------------------------------------------------
// Data fetching (shared between PDF and JSON endpoints)
// ---------------------------------------------------------------------------

async function fetchMissionData(missionId: string) {
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: {
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      approvedBy: { select: { id: true, name: true, email: true, role: true } },
      aircraft: { include: { crewMembers: true } },
      crewMembers: true,
      waypoints: { orderBy: { sequenceOrder: "asc" } },
      missionThreats: { include: { threat: true } },
      weatherReports: { orderBy: { observedAt: "desc" } },
      deconflictionResults: { orderBy: { severity: "asc" } },
    },
  });
  if (!mission) throw new NotFoundError("Mission");
  return mission;
}

// ---------------------------------------------------------------------------
// Public service
// ---------------------------------------------------------------------------

export const briefingService = {
  /**
   * Return structured briefing data as JSON for the preview page.
   */
  async getBriefingData(missionId: string, templateId?: string): Promise<BriefingData> {
    const mission = await fetchMissionData(missionId);
    const template = getTemplate(templateId);

    const critical = mission.deconflictionResults.filter(
      (d) => d.severity === "CRITICAL" && d.resolution === "UNRESOLVED",
    );
    const warnings = mission.deconflictionResults.filter(
      (d) => d.severity === "WARNING" && d.resolution === "UNRESOLVED",
    );
    const resolved = mission.deconflictionResults.filter((d) => d.resolution === "RESOLVED");

    return {
      mission: {
        id: mission.id,
        name: mission.name,
        type: mission.type,
        status: mission.status.replace(/_/g, " "),
        priority: mission.priority,
        scheduledStart: mission.scheduledStart?.toISOString() ?? null,
        scheduledEnd: mission.scheduledEnd?.toISOString() ?? null,
        commanderComments: mission.commanderComments,
        createdAt: mission.createdAt.toISOString(),
        updatedAt: mission.updatedAt.toISOString(),
      },
      createdBy: mission.createdBy as BriefingData["createdBy"],
      approvedBy: mission.approvedBy as BriefingData["approvedBy"],
      aircraft: mission.aircraft.map((ac) => ({
        id: ac.id,
        callsign: ac.callsign,
        type: ac.type,
        tailNumber: ac.tailNumber,
      })),
      crewMembers: mission.crewMembers.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        aircraftId: c.aircraftId,
      })),
      waypoints: mission.waypoints.map((wp) => ({
        sequenceOrder: wp.sequenceOrder,
        name: wp.name,
        lat: wp.lat,
        lon: wp.lon,
        altitude: wp.altitude,
        speed: wp.speed,
        timeOnTarget: wp.timeOnTarget?.toISOString() ?? null,
        type: wp.type.replace(/_/g, " "),
      })),
      threats: mission.missionThreats.map((mt) => ({
        name: mt.threat.name,
        category: mt.threat.category,
        lat: mt.threat.lat,
        lon: mt.threat.lon,
        rangeNm: mt.threat.rangeNm,
        lethality: mt.threat.lethality,
        minAltitude: mt.threat.minAltitude,
        maxAltitude: mt.threat.maxAltitude,
        notes: mt.notes,
      })),
      weather: mission.weatherReports.map((wr) => ({
        stationId: wr.stationId,
        type: wr.type,
        rawReport: wr.rawReport,
        temperature: wr.temperature,
        windSpeed: wr.windSpeed,
        windDir: wr.windDir,
        visibility: wr.visibility,
        ceiling: wr.ceiling,
        observedAt: wr.observedAt.toISOString(),
      })),
      deconfliction: {
        critical: critical.map((c) => ({
          conflictType: c.conflictType,
          description: c.description,
          resolution: c.resolution,
        })),
        warnings: warnings.map((w) => ({
          conflictType: w.conflictType,
          description: w.description,
          resolution: w.resolution,
        })),
        resolved: resolved.length,
        allClear: critical.length === 0 && warnings.length === 0,
      },
      generatedAt: new Date().toISOString(),
      templateId: template.id,
    };
  },

  /**
   * Generate a PDF for the given mission using the specified template.
   */
  async generatePdf(missionId: string, templateId?: string): Promise<Buffer> {
    const mission = await fetchMissionData(missionId);
    const template = getTemplate(templateId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        bufferPages: true,
      });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const enabledSections = template.sections
        .filter((s) => s.enabled)
        .sort((a, b) => a.order - b.order);

      const dateTimeGroup = formatDTG(new Date());

      // =====================================================================
      // RENDER SECTIONS
      // =====================================================================

      for (const section of enabledSections) {
        switch (section.id) {
          case "header":
            renderHeader(doc, mission, template, dateTimeGroup);
            break;
          case "mission-overview":
          case "mission-statement":
            renderMissionOverview(doc, mission, template, section.title);
            break;
          case "route-details":
            renderRouteDetails(doc, mission, template, section.title);
            break;
          case "threat-assessment":
            renderThreatAssessment(doc, mission, template, section.title);
            break;
          case "weather-summary":
            renderWeatherSummary(doc, mission, template, section.title);
            break;
          case "aircraft-crew":
            renderAircraftCrew(doc, mission, template, section.title);
            break;
          case "deconfliction-status":
            renderDeconfliction(doc, mission, template, section.title);
            break;
          case "commander-notes":
            renderCommanderNotes(doc, mission, template, section.title);
            break;
        }
      }

      // FOOTER
      renderFooter(doc, mission);

      doc.end();
    });
  },
};

// ---------------------------------------------------------------------------
// Date-Time Group formatting (military standard: DDHHMMZMmmYYYY)
// ---------------------------------------------------------------------------

function formatDTG(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const mins = String(d.getUTCMinutes()).padStart(2, "0");
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const mon = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day}${hours}${mins}Z ${mon} ${year}`;
}

// ---------------------------------------------------------------------------
// Ensure there is room on the current page; add a new page if not.
// ---------------------------------------------------------------------------

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > doc.page.height - 80) {
    doc.addPage();
  }
}

// ---------------------------------------------------------------------------
// Section: HEADER
// ---------------------------------------------------------------------------

function renderHeader(doc: PDFKit.PDFDocument, mission: any, template: BriefingTemplate, dtg: string) {
  // Classification banner
  doc.fontSize(9).font("Times-Bold").text("UNCLASSIFIED // FOR TRAINING USE ONLY", { align: "center" });
  doc.moveDown(0.5);

  // Horizontal rule
  const x1 = 60;
  const x2 = doc.page.width - 60;
  doc.moveTo(x1, doc.y).lineTo(x2, doc.y).lineWidth(1.5).stroke();
  doc.moveDown(0.4);

  // Title
  const title = template.id === "opord" ? "OPERATION ORDER" : template.id === "crew" ? "CREW BRIEFING" : "MISSION BRIEFING";
  doc.fontSize(18).font("Times-Bold").text(title, { align: "center" });
  doc.moveDown(0.2);

  // Mission name
  doc.fontSize(14).font("Times-Bold").text(mission.name.toUpperCase(), { align: "center" });
  doc.moveDown(0.3);

  // DTG & template
  doc.fontSize(9).font("Times-Roman").text(`DTG: ${dtg}`, { align: "center" });
  doc.text(`Template: ${template.name}`, { align: "center" });
  doc.moveDown(0.3);

  doc.moveTo(x1, doc.y).lineTo(x2, doc.y).lineWidth(0.5).stroke();
  doc.moveDown(0.8);

  // Table of contents for OPORD
  if (template.includeTableOfContents) {
    doc.fontSize(12).font("Times-Bold").text("TABLE OF CONTENTS");
    doc.moveDown(0.3);
    const enabled = template.sections.filter((s) => s.enabled && s.id !== "header").sort((a, b) => a.order - b.order);
    enabled.forEach((s) => {
      doc.fontSize(10).font("Times-Roman").text(s.title, { indent: 20 });
    });
    doc.moveDown(1);
    doc.moveTo(x1, doc.y).lineTo(x2, doc.y).lineWidth(0.5).stroke();
    doc.moveDown(0.8);
  }
}

// ---------------------------------------------------------------------------
// Section: MISSION OVERVIEW
// ---------------------------------------------------------------------------

function renderMissionOverview(doc: PDFKit.PDFDocument, mission: any, template: BriefingTemplate, title: string) {
  ensureSpace(doc, 120);
  sectionHeader(doc, title);

  const fontSize = template.compact ? 9 : 10;

  tableRow(doc, "Mission Name", mission.name, fontSize);
  tableRow(doc, "Type", mission.type, fontSize);
  tableRow(doc, "Status", mission.status.replace(/_/g, " "), fontSize);
  tableRow(doc, "Priority", mission.priority, fontSize);
  tableRow(doc, "Created By", mission.createdBy.name, fontSize);
  if (mission.approvedBy) {
    tableRow(doc, "Approved By", mission.approvedBy.name, fontSize);
  }
  if (mission.scheduledStart) {
    tableRow(doc, "Scheduled Start", formatDTG(new Date(mission.scheduledStart)), fontSize);
  }
  if (mission.scheduledEnd) {
    tableRow(doc, "Scheduled End", formatDTG(new Date(mission.scheduledEnd)), fontSize);
  }

  doc.moveDown(template.compact ? 0.3 : 0.6);
}

// ---------------------------------------------------------------------------
// Section: ROUTE DETAILS (waypoint table)
// ---------------------------------------------------------------------------

function renderRouteDetails(doc: PDFKit.PDFDocument, mission: any, template: BriefingTemplate, title: string) {
  ensureSpace(doc, 100);
  sectionHeader(doc, title);

  if (mission.waypoints.length === 0) {
    doc.fontSize(10).font("Times-Roman").text("No waypoints defined.", { indent: 20 });
    doc.moveDown(0.4);
    return;
  }

  const colDefs = [
    { label: "#",        x: 70,  w: 25 },
    { label: "Name",     x: 100, w: 90 },
    { label: "Lat",      x: 195, w: 60 },
    { label: "Lon",      x: 260, w: 60 },
    { label: "Alt (ft)", x: 325, w: 50 },
    { label: "Spd (kt)", x: 380, w: 50 },
    { label: "TOT",      x: 435, w: 55 },
    { label: "Type",     x: 495, w: 60 },
  ];

  // Table header row
  const headerY = doc.y;
  doc.fontSize(8).font("Times-Bold");
  colDefs.forEach((c) => doc.text(c.label, c.x, headerY, { width: c.w }));
  doc.moveDown(0.3);

  // Underline
  doc.moveTo(70, doc.y).lineTo(555, doc.y).lineWidth(0.5).stroke();
  doc.moveDown(0.2);

  doc.font("Times-Roman").fontSize(8);
  mission.waypoints.forEach((wp: any) => {
    ensureSpace(doc, 14);
    const y = doc.y;
    doc.text(String(wp.sequenceOrder), 70, y, { width: 25 });
    doc.text(wp.name || "-", 100, y, { width: 90 });
    doc.text(wp.lat.toFixed(4), 195, y, { width: 60 });
    doc.text(wp.lon.toFixed(4), 260, y, { width: 60 });
    doc.text(wp.altitude ? String(wp.altitude) : "-", 325, y, { width: 50 });
    doc.text(wp.speed ? String(wp.speed) : "-", 380, y, { width: 50 });
    doc.text(wp.timeOnTarget ? formatDTG(new Date(wp.timeOnTarget)) : "-", 435, y, { width: 55 });
    doc.text(wp.type.replace(/_/g, " "), 495, y, { width: 60 });
    doc.moveDown(0.3);
  });

  doc.moveDown(template.compact ? 0.3 : 0.6);
}

// ---------------------------------------------------------------------------
// Section: THREAT ASSESSMENT (threat matrix table)
// ---------------------------------------------------------------------------

function renderThreatAssessment(doc: PDFKit.PDFDocument, mission: any, template: BriefingTemplate, title: string) {
  ensureSpace(doc, 80);
  sectionHeader(doc, title);

  if (mission.missionThreats.length === 0) {
    doc.fontSize(10).font("Times-Roman").text("No threats identified.", { indent: 20 });
    doc.moveDown(0.4);
    return;
  }

  // Threat matrix table header
  const cols = [
    { label: "Threat",      x: 70,  w: 100 },
    { label: "Category",    x: 175, w: 55 },
    { label: "Range (NM)",  x: 235, w: 55 },
    { label: "Lethality",   x: 295, w: 55 },
    { label: "Alt Range",   x: 355, w: 70 },
    { label: "Position",    x: 430, w: 90 },
  ];

  const hdrY = doc.y;
  doc.fontSize(8).font("Times-Bold");
  cols.forEach((c) => doc.text(c.label, c.x, hdrY, { width: c.w }));
  doc.moveDown(0.3);
  doc.moveTo(70, doc.y).lineTo(555, doc.y).lineWidth(0.5).stroke();
  doc.moveDown(0.2);

  doc.font("Times-Roman").fontSize(8);
  mission.missionThreats.forEach((mt: any) => {
    const t = mt.threat;
    ensureSpace(doc, 14);
    const y = doc.y;
    doc.text(t.name, 70, y, { width: 100 });
    doc.text(t.category, 175, y, { width: 55 });
    doc.text(String(t.rangeNm), 235, y, { width: 55 });
    doc.text(t.lethality, 295, y, { width: 55 });
    doc.text(`${t.minAltitude || 0}-${t.maxAltitude || "UNL"} ft`, 355, y, { width: 70 });
    doc.text(`${t.lat.toFixed(4)}, ${t.lon.toFixed(4)}`, 430, y, { width: 90 });
    doc.moveDown(0.3);

    if (mt.notes) {
      doc.fontSize(7).font("Times-Italic").text(`Notes: ${mt.notes}`, { indent: 80 });
      doc.font("Times-Roman").fontSize(8);
      doc.moveDown(0.15);
    }
  });

  doc.moveDown(template.compact ? 0.3 : 0.6);
}

// ---------------------------------------------------------------------------
// Section: WEATHER SUMMARY (table)
// ---------------------------------------------------------------------------

function renderWeatherSummary(doc: PDFKit.PDFDocument, mission: any, template: BriefingTemplate, title: string) {
  ensureSpace(doc, 80);
  sectionHeader(doc, title);

  if (mission.weatherReports.length === 0) {
    doc.fontSize(10).font("Times-Roman").text("No weather data available.", { indent: 20 });
    doc.moveDown(0.4);
    return;
  }

  // Weather table header
  const cols = [
    { label: "Station",    x: 70,  w: 60 },
    { label: "Type",       x: 135, w: 40 },
    { label: "Temp (C)",   x: 180, w: 45 },
    { label: "Wind",       x: 230, w: 60 },
    { label: "Vis (SM)",   x: 295, w: 45 },
    { label: "Ceiling",    x: 345, w: 50 },
    { label: "Raw",        x: 400, w: 135 },
  ];

  const hdrY = doc.y;
  doc.fontSize(8).font("Times-Bold");
  cols.forEach((c) => doc.text(c.label, c.x, hdrY, { width: c.w }));
  doc.moveDown(0.3);
  doc.moveTo(70, doc.y).lineTo(555, doc.y).lineWidth(0.5).stroke();
  doc.moveDown(0.2);

  doc.font("Times-Roman").fontSize(7);
  mission.weatherReports.forEach((wr: any) => {
    ensureSpace(doc, 14);
    const y = doc.y;
    doc.text(wr.stationId, 70, y, { width: 60 });
    doc.text(wr.type, 135, y, { width: 40 });
    doc.text(wr.temperature !== null ? String(wr.temperature) : "-", 180, y, { width: 45 });
    doc.text(wr.windSpeed !== null ? `${wr.windDir || 0}deg/${wr.windSpeed}kt` : "-", 230, y, { width: 60 });
    doc.text(wr.visibility !== null ? String(wr.visibility) : "-", 295, y, { width: 45 });
    doc.text(wr.ceiling !== null ? `${wr.ceiling} ft` : "-", 345, y, { width: 50 });
    doc.text(wr.rawReport, 400, y, { width: 135 });
    doc.moveDown(0.35);
  });

  doc.moveDown(template.compact ? 0.3 : 0.6);
}

// ---------------------------------------------------------------------------
// Section: AIRCRAFT & CREW
// ---------------------------------------------------------------------------

function renderAircraftCrew(doc: PDFKit.PDFDocument, mission: any, template: BriefingTemplate, title: string) {
  ensureSpace(doc, 80);
  sectionHeader(doc, title);

  const fontSize = template.compact ? 9 : 10;

  if (mission.aircraft.length === 0) {
    doc.fontSize(fontSize).font("Times-Roman").text("No aircraft assigned.", { indent: 20 });
  } else {
    mission.aircraft.forEach((ac: any) => {
      ensureSpace(doc, 30);
      doc.fontSize(fontSize).font("Times-Bold").text(`${ac.callsign} -- ${ac.type} (${ac.tailNumber})`, { indent: 20 });
      doc.font("Times-Roman");
      const acCrew = mission.crewMembers.filter((c: any) => c.aircraftId === ac.id);
      if (acCrew.length > 0) {
        acCrew.forEach((c: any) => {
          doc.fontSize(fontSize - 1).text(`${c.role}: ${c.name}`, { indent: 40 });
        });
      }
    });

    const unassigned = mission.crewMembers.filter((c: any) => !c.aircraftId);
    if (unassigned.length > 0) {
      doc.moveDown(0.3);
      doc.fontSize(fontSize).font("Times-Bold").text("Unassigned Crew:", { indent: 20 });
      doc.font("Times-Roman");
      unassigned.forEach((c: any) => {
        doc.fontSize(fontSize - 1).text(`${c.role}: ${c.name}`, { indent: 40 });
      });
    }
  }

  doc.moveDown(template.compact ? 0.3 : 0.6);
}

// ---------------------------------------------------------------------------
// Section: DECONFLICTION STATUS
// ---------------------------------------------------------------------------

function renderDeconfliction(doc: PDFKit.PDFDocument, mission: any, template: BriefingTemplate, title: string) {
  ensureSpace(doc, 60);
  sectionHeader(doc, title);

  if (mission.deconflictionResults.length === 0) {
    doc.fontSize(10).font("Times-Roman").text("No deconfliction checks run.", { indent: 20 });
    doc.moveDown(0.4);
    return;
  }

  const critical = mission.deconflictionResults.filter(
    (d: any) => d.severity === "CRITICAL" && d.resolution === "UNRESOLVED",
  );
  const warnings = mission.deconflictionResults.filter(
    (d: any) => d.severity === "WARNING" && d.resolution === "UNRESOLVED",
  );
  const resolved = mission.deconflictionResults.filter((d: any) => d.resolution === "RESOLVED");

  doc.fontSize(10);
  if (critical.length > 0) {
    doc.font("Times-Bold").fillColor("red").text(`CRITICAL CONFLICTS: ${critical.length} UNRESOLVED`, { indent: 20 });
    doc.fillColor("black").font("Times-Roman");
    critical.forEach((c: any) => {
      doc.fontSize(8).text(`[${c.conflictType}] ${c.description}`, { indent: 30 });
    });
    doc.moveDown(0.3);
  }

  if (warnings.length > 0) {
    doc.font("Times-Bold").fillColor("#B45309").text(`WARNINGS: ${warnings.length}`, { indent: 20 });
    doc.fillColor("black").font("Times-Roman");
    warnings.forEach((w: any) => {
      doc.fontSize(8).text(`[${w.conflictType}] ${w.description}`, { indent: 30 });
    });
    doc.moveDown(0.3);
  }

  if (resolved.length > 0) {
    doc.fillColor("black").fontSize(9).text(`Resolved conflicts: ${resolved.length}`, { indent: 20 });
  }

  if (critical.length === 0 && warnings.length === 0) {
    doc.font("Times-Bold").fillColor("green").text("ALL CLEAR -- No unresolved conflicts", { indent: 20 });
    doc.fillColor("black").font("Times-Roman");
  }

  doc.moveDown(template.compact ? 0.3 : 0.6);
}

// ---------------------------------------------------------------------------
// Section: COMMANDER NOTES
// ---------------------------------------------------------------------------

function renderCommanderNotes(doc: PDFKit.PDFDocument, mission: any, _template: BriefingTemplate, title: string) {
  if (!mission.commanderComments) return;
  ensureSpace(doc, 60);
  sectionHeader(doc, title);
  doc.fontSize(10).font("Times-Roman").text(mission.commanderComments, { indent: 20 });
  doc.moveDown(0.6);
}

// ---------------------------------------------------------------------------
// FOOTER
// ---------------------------------------------------------------------------

function renderFooter(doc: PDFKit.PDFDocument, mission: any) {
  doc.moveDown(1.5);
  const x1 = 60;
  const x2 = doc.page.width - 60;
  doc.moveTo(x1, doc.y).lineTo(x2, doc.y).lineWidth(1).stroke();
  doc.moveDown(0.4);
  doc.fontSize(8).fillColor("black").font("Times-Bold").text("UNCLASSIFIED // FOR TRAINING USE ONLY", { align: "center" });
  doc.font("Times-Roman").text(`Mission ID: ${mission.id}`, { align: "center" });
  doc.text(`Generated: ${formatDTG(new Date())}`, { align: "center" });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.fontSize(12).font("Times-Bold").text(title);
  doc.moveDown(0.3);
  doc.font("Times-Roman");
}

function tableRow(doc: PDFKit.PDFDocument, label: string, value: string, fontSize = 10) {
  doc.fontSize(fontSize);
  doc.font("Times-Bold").text(`${label}: `, { continued: true, indent: 20 });
  doc.font("Times-Roman").text(value);
}
