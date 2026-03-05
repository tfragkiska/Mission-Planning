import { cloneService } from "./clone-service";
import { prisma } from "../../infra/database";

jest.mock("../../infra/database", () => ({
  prisma: {
    mission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    waypoint: { createMany: jest.fn() },
    aircraft: { create: jest.fn() },
    crewMember: { createMany: jest.fn() },
    missionThreat: { createMany: jest.fn() },
  },
}));

describe("cloneService", () => {
  const mockSource = {
    id: "m-1", name: "Alpha", type: "TRAINING", priority: "HIGH",
    scheduledStart: null, scheduledEnd: null,
    waypoints: [
      { sequenceOrder: 1, name: "WP1", lat: 34.0, lon: -118.0, altitude: 5000, speed: 300, timeOnTarget: null, type: "WAYPOINT" },
    ],
    aircraft: [{ id: "ac-1", type: "F-16C", tailNumber: "88-0421", callsign: "Viper 1" }],
    crewMembers: [{ id: "cr-1", name: "John", role: "Pilot", aircraftId: "ac-1" }],
    missionThreats: [{ threatId: "t-1", notes: null }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("cloneMission", () => {
    it("creates a DRAFT copy with all associations", async () => {
      (prisma.mission.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockSource)  // source lookup
        .mockResolvedValueOnce({ id: "m-2", name: "Alpha (Copy)", status: "DRAFT" });  // return cloned
      (prisma.mission.create as jest.Mock).mockResolvedValue({ id: "m-2" });
      (prisma.waypoint.createMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.aircraft.create as jest.Mock).mockResolvedValue({ id: "ac-2" });
      (prisma.crewMember.createMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.missionThreat.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await cloneService.cloneMission("m-1", "user-1");

      expect(prisma.mission.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "DRAFT" }) })
      );
      expect(prisma.waypoint.createMany).toHaveBeenCalled();
      expect(prisma.aircraft.create).toHaveBeenCalled();
      expect(prisma.missionThreat.createMany).toHaveBeenCalled();
    });

    it("throws NotFoundError for non-existent mission", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(cloneService.cloneMission("bad-id", "user-1"))
        .rejects.toThrow("Mission not found");
    });

    it("uses custom name when provided", async () => {
      (prisma.mission.findUnique as jest.Mock)
        .mockResolvedValueOnce({ ...mockSource, waypoints: [], aircraft: [], crewMembers: [], missionThreats: [] })
        .mockResolvedValueOnce({ id: "m-2", name: "Custom Name", status: "DRAFT" });
      (prisma.mission.create as jest.Mock).mockResolvedValue({ id: "m-2" });

      await cloneService.cloneMission("m-1", "user-1", "Custom Name");

      expect(prisma.mission.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: "Custom Name" }) })
      );
    });
  });

  describe("saveAsTemplate", () => {
    it("marks a mission as a template", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ id: "m-1" });
      (prisma.mission.update as jest.Mock).mockResolvedValue({ id: "m-1", isTemplate: true, templateName: "CAS Template" });

      const result = await cloneService.saveAsTemplate("m-1", "CAS Template", "A CAS mission template");

      expect(prisma.mission.update).toHaveBeenCalledWith({
        where: { id: "m-1" },
        data: { isTemplate: true, templateName: "CAS Template", templateDescription: "A CAS mission template" },
      });
    });

    it("throws NotFoundError for non-existent mission", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(cloneService.saveAsTemplate("bad-id", "Template"))
        .rejects.toThrow("Mission not found");
    });
  });

  describe("listTemplates", () => {
    it("returns only template missions", async () => {
      (prisma.mission.findMany as jest.Mock).mockResolvedValue([
        { id: "m-1", templateName: "CAS Template", isTemplate: true },
      ]);
      const result = await cloneService.listTemplates();
      expect(result).toHaveLength(1);
      expect(prisma.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isTemplate: true } })
      );
    });
  });

  describe("createFromTemplate", () => {
    it("throws NotFoundError if mission is not a template", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ id: "m-1", isTemplate: false });

      await expect(cloneService.createFromTemplate("m-1", "user-1", "New Mission"))
        .rejects.toThrow("Template not found");
    });
  });
});
