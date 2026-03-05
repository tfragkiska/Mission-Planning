import PDFDocument from "pdfkit";
import { prisma } from "../../infra/database";
import { NotFoundError } from "../../shared/errors";

export const briefingService = {
  async generatePdf(missionId: string): Promise<Buffer> {
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

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ===== HEADER =====
      doc.fontSize(20).font("Helvetica-Bold").text("MISSION BRIEFING", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text("Classification: UNCLASSIFIED // FOR TRAINING USE ONLY", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(8).text(`Generated: ${new Date().toISOString()}`, { align: "center" });
      doc.moveDown(1);

      // Line separator
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // ===== MISSION DETAILS =====
      sectionHeader(doc, "1. MISSION DETAILS");

      tableRow(doc, "Mission Name", mission.name);
      tableRow(doc, "Type", mission.type);
      tableRow(doc, "Status", mission.status.replace(/_/g, " "));
      tableRow(doc, "Priority", mission.priority);
      tableRow(doc, "Created By", mission.createdBy.name);
      if (mission.approvedBy) {
        tableRow(doc, "Approved By", mission.approvedBy.name);
      }
      if (mission.scheduledStart) {
        tableRow(doc, "Scheduled Start", new Date(mission.scheduledStart).toUTCString());
      }
      if (mission.scheduledEnd) {
        tableRow(doc, "Scheduled End", new Date(mission.scheduledEnd).toUTCString());
      }
      if (mission.commanderComments) {
        tableRow(doc, "Commander Comments", mission.commanderComments);
      }
      doc.moveDown(0.5);

      // ===== AIRCRAFT & CREW =====
      sectionHeader(doc, "2. AIRCRAFT & CREW");

      if (mission.aircraft.length === 0) {
        doc.fontSize(10).text("No aircraft assigned.", { indent: 20 });
      } else {
        mission.aircraft.forEach((ac) => {
          doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(`${ac.callsign} — ${ac.type} (${ac.tailNumber})`, { indent: 20 });
          doc.font("Helvetica");

          const acCrew = mission.crewMembers.filter((c) => c.aircraftId === ac.id);
          if (acCrew.length > 0) {
            acCrew.forEach((c) => {
              doc.fontSize(9).text(`  ${c.role}: ${c.name}`, { indent: 40 });
            });
          }
        });

        // Unassigned crew
        const unassigned = mission.crewMembers.filter((c) => !c.aircraftId);
        if (unassigned.length > 0) {
          doc.moveDown(0.3);
          doc.fontSize(10).font("Helvetica-Bold").text("Unassigned Crew:", { indent: 20 });
          doc.font("Helvetica");
          unassigned.forEach((c) => {
            doc.fontSize(9).text(`  ${c.role}: ${c.name}`, { indent: 40 });
          });
        }
      }
      doc.moveDown(0.5);

      // ===== ROUTE / WAYPOINTS =====
      sectionHeader(doc, "3. ROUTE");

      if (mission.waypoints.length === 0) {
        doc.fontSize(10).text("No waypoints defined.", { indent: 20 });
      } else {
        // Table header
        const wpY = doc.y;
        doc.fontSize(8).font("Helvetica-Bold");
        doc.text("#", 70, wpY, { width: 20 });
        doc.text("Name", 95, wpY, { width: 100 });
        doc.text("Lat", 200, wpY, { width: 60 });
        doc.text("Lon", 265, wpY, { width: 60 });
        doc.text("Alt (ft)", 330, wpY, { width: 50 });
        doc.text("Speed", 385, wpY, { width: 50 });
        doc.text("Type", 440, wpY, { width: 100 });
        doc.font("Helvetica");
        doc.moveDown(0.3);

        mission.waypoints.forEach((wp) => {
          const y = doc.y;
          doc.fontSize(8);
          doc.text(String(wp.sequenceOrder), 70, y, { width: 20 });
          doc.text(wp.name || "-", 95, y, { width: 100 });
          doc.text(wp.lat.toFixed(4), 200, y, { width: 60 });
          doc.text(wp.lon.toFixed(4), 265, y, { width: 60 });
          doc.text(wp.altitude ? String(wp.altitude) : "-", 330, y, { width: 50 });
          doc.text(wp.speed ? String(wp.speed) : "-", 385, y, { width: 50 });
          doc.text(wp.type.replace(/_/g, " "), 440, y, { width: 100 });
          doc.moveDown(0.3);
        });
      }
      doc.moveDown(0.5);

      // ===== THREATS =====
      sectionHeader(doc, "4. THREAT ASSESSMENT");

      if (mission.missionThreats.length === 0) {
        doc.fontSize(10).text("No threats identified.", { indent: 20 });
      } else {
        mission.missionThreats.forEach((mt) => {
          const t = mt.threat;
          doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .text(`${t.name} (${t.category})`, { indent: 20 });
          doc
            .font("Helvetica")
            .fontSize(8)
            .text(
              `Range: ${t.rangeNm} NM | Lethality: ${t.lethality} | Alt: ${t.minAltitude || 0}-${t.maxAltitude || "unlimited"} ft | Pos: ${t.lat.toFixed(4)}, ${t.lon.toFixed(4)}`,
              { indent: 30 },
            );
          if (mt.notes) {
            doc.text(`Notes: ${mt.notes}`, { indent: 30 });
          }
          doc.moveDown(0.2);
        });
      }
      doc.moveDown(0.5);

      // ===== WEATHER =====
      sectionHeader(doc, "5. WEATHER");

      if (mission.weatherReports.length === 0) {
        doc.fontSize(10).text("No weather data available.", { indent: 20 });
      } else {
        mission.weatherReports.forEach((wr) => {
          doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .text(`${wr.stationId} (${wr.type})`, { indent: 20 });
          doc.font("Helvetica").fontSize(8).text(wr.rawReport, { indent: 30 });
          const details: string[] = [];
          if (wr.temperature !== null) details.push(`Temp: ${wr.temperature}°C`);
          if (wr.windSpeed !== null) details.push(`Wind: ${wr.windDir || 0}°/${wr.windSpeed}kt`);
          if (wr.visibility !== null) details.push(`Vis: ${wr.visibility}SM`);
          if (wr.ceiling !== null) details.push(`Ceiling: ${wr.ceiling}ft`);
          if (details.length > 0) {
            doc.text(details.join(" | "), { indent: 30 });
          }
          doc.moveDown(0.2);
        });
      }
      doc.moveDown(0.5);

      // ===== DECONFLICTION =====
      sectionHeader(doc, "6. DECONFLICTION STATUS");

      if (mission.deconflictionResults.length === 0) {
        doc.fontSize(10).text("No deconfliction checks run.", { indent: 20 });
      } else {
        const critical = mission.deconflictionResults.filter(
          (d) => d.severity === "CRITICAL" && d.resolution === "UNRESOLVED",
        );
        const warnings = mission.deconflictionResults.filter(
          (d) => d.severity === "WARNING" && d.resolution === "UNRESOLVED",
        );
        const resolved = mission.deconflictionResults.filter((d) => d.resolution === "RESOLVED");

        doc.fontSize(10);
        if (critical.length > 0) {
          doc
            .font("Helvetica-Bold")
            .fillColor("red")
            .text(`CRITICAL CONFLICTS: ${critical.length} UNRESOLVED`, { indent: 20 });
          doc.fillColor("black").font("Helvetica");
          critical.forEach((c) => {
            doc.fontSize(8).text(`• [${c.conflictType}] ${c.description}`, { indent: 30 });
          });
          doc.moveDown(0.3);
        }

        if (warnings.length > 0) {
          doc
            .font("Helvetica-Bold")
            .fillColor("#B45309")
            .text(`WARNINGS: ${warnings.length}`, { indent: 20 });
          doc.fillColor("black").font("Helvetica");
          warnings.forEach((w) => {
            doc.fontSize(8).text(`• [${w.conflictType}] ${w.description}`, { indent: 30 });
          });
          doc.moveDown(0.3);
        }

        if (resolved.length > 0) {
          doc
            .fillColor("black")
            .fontSize(9)
            .text(`Resolved conflicts: ${resolved.length}`, { indent: 20 });
        }

        if (critical.length === 0 && warnings.length === 0) {
          doc
            .font("Helvetica-Bold")
            .fillColor("green")
            .text("ALL CLEAR — No unresolved conflicts", { indent: 20 });
          doc.fillColor("black").font("Helvetica");
        }
      }

      // ===== FOOTER =====
      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc
        .fontSize(8)
        .fillColor("black")
        .text("UNCLASSIFIED // FOR TRAINING USE ONLY", { align: "center" });
      doc.text(`Mission ID: ${mission.id}`, { align: "center" });

      doc.end();
    });
  },
};

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.fontSize(12).font("Helvetica-Bold").text(title);
  doc.moveDown(0.3);
  doc.font("Helvetica");
}

function tableRow(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.fontSize(10);
  doc.font("Helvetica-Bold").text(`${label}: `, { continued: true, indent: 20 });
  doc.font("Helvetica").text(value);
}
