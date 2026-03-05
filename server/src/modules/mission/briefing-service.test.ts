import { briefingService } from "./briefing-service";
import { prisma } from "../../infra/database";

jest.mock("../../infra/database", () => ({
  prisma: {
    mission: { findUnique: jest.fn() },
  },
}));

describe("briefingService", () => {
  describe("generatePdf", () => {
    it("generates a PDF buffer for a mission", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({
        id: "m-1",
        name: "Alpha Strike",
        type: "TRAINING",
        status: "PLANNED",
        priority: "HIGH",
        scheduledStart: new Date("2026-03-10T08:00:00Z"),
        scheduledEnd: new Date("2026-03-10T12:00:00Z"),
        commanderComments: null,
        createdBy: { id: "u-1", name: "Alex Planner", email: "p@m.mil", role: "PLANNER" },
        approvedBy: null,
        aircraft: [
          { id: "ac-1", type: "F-16C", tailNumber: "88-0421", callsign: "Viper 1", crewMembers: [] },
        ],
        crewMembers: [
          { id: "cr-1", name: "John Doe", role: "Pilot", aircraftId: "ac-1" },
        ],
        waypoints: [
          { id: "w-1", sequenceOrder: 1, name: "IP", lat: 34.05, lon: -118.25, altitude: 5000, speed: 300, type: "INITIAL_POINT" },
          { id: "w-2", sequenceOrder: 2, name: "Target", lat: 34.15, lon: -118.1, altitude: 3000, speed: 250, type: "TARGET" },
        ],
        missionThreats: [
          { threat: { name: "SA-6", category: "SAM", rangeNm: 13, lethality: "HIGH", lat: 34.1, lon: -118.2, minAltitude: 100, maxAltitude: 40000 }, notes: null },
        ],
        weatherReports: [
          { stationId: "KLAX", type: "METAR", rawReport: "KLAX 270KT 10SM", temperature: 15, windSpeed: 15, windDir: 270, visibility: 10, ceiling: null, observedAt: new Date() },
        ],
        deconflictionResults: [
          { severity: "WARNING", conflictType: "TIMING", description: "No schedule set", resolution: "UNRESOLVED" },
        ],
      });

      const pdf = await briefingService.generatePdf("m-1");

      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
      // PDF files start with %PDF
      expect(pdf.toString("ascii", 0, 5)).toBe("%PDF-");
    });

    it("throws for missing mission", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(briefingService.generatePdf("bad-id")).rejects.toThrow("Mission not found");
    });
  });
});
