import { aircraftService } from "./aircraft-service";
import { prisma } from "../../infra/database";

jest.mock("../../infra/database", () => ({
  prisma: {
    mission: { findUnique: jest.fn() },
    aircraft: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), delete: jest.fn() },
    crewMember: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), delete: jest.fn() },
  },
}));

describe("aircraftService", () => {
  describe("addAircraft", () => {
    it("adds aircraft to DRAFT mission", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ id: "m-1", status: "DRAFT" });
      (prisma.aircraft.create as jest.Mock).mockResolvedValue({
        id: "ac-1", missionId: "m-1", type: "F-16C", tailNumber: "88-0421", callsign: "Viper 1",
      });
      const result = await aircraftService.addAircraft("m-1", { type: "F-16C", tailNumber: "88-0421", callsign: "Viper 1" });
      expect(result.callsign).toBe("Viper 1");
    });

    it("rejects adding to non-DRAFT mission", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ id: "m-1", status: "PLANNED" });
      await expect(aircraftService.addAircraft("m-1", { type: "F-16C", tailNumber: "88-0421", callsign: "Viper 1" }))
        .rejects.toThrow("Can only modify aircraft in DRAFT missions");
    });
  });

  describe("addCrew", () => {
    it("adds crew to DRAFT mission", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ id: "m-1", status: "DRAFT" });
      (prisma.crewMember.create as jest.Mock).mockResolvedValue({
        id: "cr-1", missionId: "m-1", name: "John", role: "Pilot", aircraftId: null,
      });
      const result = await aircraftService.addCrew("m-1", { name: "John", role: "Pilot" });
      expect(result.name).toBe("John");
    });
  });
});
