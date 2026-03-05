import { threatService } from "./service";
import { prisma } from "../../infra/database";

jest.mock("../../infra/database", () => ({
  prisma: {
    threat: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    missionThreat: {
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock("../../infra/socket", () => ({
  emitMissionUpdate: jest.fn(),
}));

const mockThreat = {
  id: "threat-1",
  name: "SA-6 Gainful",
  category: "SAM",
  lat: 34.1,
  lon: -118.2,
  rangeNm: 13,
  lethality: "HIGH",
  minAltitude: 100,
  maxAltitude: 40000,
  active: true,
  source: "manual",
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("threatService", () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── create ─────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a threat with all required fields", async () => {
      (prisma.threat.create as jest.Mock).mockResolvedValue(mockThreat);

      const result = await threatService.create({
        name: "SA-6 Gainful",
        category: "SAM",
        lat: 34.1,
        lon: -118.2,
        rangeNm: 13,
        lethality: "HIGH",
      });

      expect(result.name).toBe("SA-6 Gainful");
      expect(prisma.threat.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "SA-6 Gainful",
          category: "SAM",
          lat: 34.1,
          lon: -118.2,
          rangeNm: 13,
          lethality: "HIGH",
          active: true,
        }),
      });
    });

    it("defaults active to true when not specified", async () => {
      (prisma.threat.create as jest.Mock).mockResolvedValue(mockThreat);

      await threatService.create({
        name: "Test",
        category: "AAA",
        lat: 0,
        lon: 0,
        rangeNm: 5,
        lethality: "LOW",
      });

      const data = (prisma.threat.create as jest.Mock).mock.calls[0][0].data;
      expect(data.active).toBe(true);
    });

    it("allows setting active to false", async () => {
      (prisma.threat.create as jest.Mock).mockResolvedValue({ ...mockThreat, active: false });

      await threatService.create({
        name: "Inactive",
        category: "SAM",
        lat: 0,
        lon: 0,
        rangeNm: 5,
        lethality: "LOW",
        active: false,
      });

      const data = (prisma.threat.create as jest.Mock).mock.calls[0][0].data;
      expect(data.active).toBe(false);
    });

    it("stores optional altitude ranges", async () => {
      (prisma.threat.create as jest.Mock).mockResolvedValue(mockThreat);

      await threatService.create({
        name: "Test SAM",
        category: "SAM",
        lat: 34.1,
        lon: -118.2,
        rangeNm: 13,
        lethality: "HIGH",
        minAltitude: 100,
        maxAltitude: 40000,
      });

      const data = (prisma.threat.create as jest.Mock).mock.calls[0][0].data;
      expect(data.minAltitude).toBe(100);
      expect(data.maxAltitude).toBe(40000);
    });
  });

  // ─── list ───────────────────────────────────────────────────────

  describe("list", () => {
    it("returns all threats ordered by name ascending", async () => {
      (prisma.threat.findMany as jest.Mock).mockResolvedValue([mockThreat]);

      const result = await threatService.list();

      expect(result).toHaveLength(1);
      expect(prisma.threat.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { name: "asc" },
      });
    });

    it("filters by active status", async () => {
      (prisma.threat.findMany as jest.Mock).mockResolvedValue([mockThreat]);

      await threatService.list({ active: true });

      expect(prisma.threat.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { name: "asc" },
      });
    });

    it("filters by category", async () => {
      (prisma.threat.findMany as jest.Mock).mockResolvedValue([]);

      await threatService.list({ category: "SAM" as any });

      expect(prisma.threat.findMany).toHaveBeenCalledWith({
        where: { category: "SAM" },
        orderBy: { name: "asc" },
      });
    });

    it("returns empty array when no threats match", async () => {
      (prisma.threat.findMany as jest.Mock).mockResolvedValue([]);
      const result = await threatService.list({ active: false });
      expect(result).toEqual([]);
    });
  });

  // ─── getById ────────────────────────────────────────────────────

  describe("getById", () => {
    it("returns a threat when found", async () => {
      (prisma.threat.findUnique as jest.Mock).mockResolvedValue(mockThreat);

      const result = await threatService.getById("threat-1");
      expect(result.id).toBe("threat-1");
    });

    it("throws NotFoundError when threat does not exist", async () => {
      (prisma.threat.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(threatService.getById("bad-id")).rejects.toThrow("Threat not found");
    });
  });

  // ─── update ─────────────────────────────────────────────────────

  describe("update", () => {
    it("updates threat fields", async () => {
      (prisma.threat.findUnique as jest.Mock).mockResolvedValue(mockThreat);
      (prisma.threat.update as jest.Mock).mockResolvedValue({ ...mockThreat, name: "SA-8 Gecko" });

      const result = await threatService.update("threat-1", { name: "SA-8 Gecko" });
      expect(result.name).toBe("SA-8 Gecko");
    });

    it("throws NotFoundError for non-existent threat", async () => {
      (prisma.threat.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(threatService.update("bad-id", { name: "X" })).rejects.toThrow(
        "Threat not found",
      );
    });

    it("updates coordinates", async () => {
      (prisma.threat.findUnique as jest.Mock).mockResolvedValue(mockThreat);
      (prisma.threat.update as jest.Mock).mockResolvedValue({ ...mockThreat, lat: 36.0, lon: -120.0 });

      await threatService.update("threat-1", { lat: 36.0, lon: -120.0 });

      expect(prisma.threat.update).toHaveBeenCalledWith({
        where: { id: "threat-1" },
        data: expect.objectContaining({ lat: 36.0, lon: -120.0 }),
      });
    });

    it("updates active status", async () => {
      (prisma.threat.findUnique as jest.Mock).mockResolvedValue(mockThreat);
      (prisma.threat.update as jest.Mock).mockResolvedValue({ ...mockThreat, active: false });

      await threatService.update("threat-1", { active: false });

      expect(prisma.threat.update).toHaveBeenCalledWith({
        where: { id: "threat-1" },
        data: expect.objectContaining({ active: false }),
      });
    });
  });

  // ─── delete ─────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes an existing threat", async () => {
      (prisma.threat.findUnique as jest.Mock).mockResolvedValue(mockThreat);
      (prisma.threat.delete as jest.Mock).mockResolvedValue(mockThreat);

      await threatService.delete("threat-1");
      expect(prisma.threat.delete).toHaveBeenCalledWith({ where: { id: "threat-1" } });
    });

    it("throws NotFoundError for non-existent threat", async () => {
      (prisma.threat.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(threatService.delete("bad-id")).rejects.toThrow("Threat not found");
    });
  });

  // ─── addToMission ───────────────────────────────────────────────

  describe("addToMission", () => {
    it("links a threat to a mission", async () => {
      const missionThreat = { missionId: "m-1", threatId: "threat-1", notes: null, threat: mockThreat };
      (prisma.missionThreat.create as jest.Mock).mockResolvedValue(missionThreat);

      const result = await threatService.addToMission("m-1", "threat-1");

      expect(prisma.missionThreat.create).toHaveBeenCalledWith({
        data: { missionId: "m-1", threatId: "threat-1", notes: undefined },
        include: { threat: true },
      });
      expect(result.threat.name).toBe("SA-6 Gainful");
    });

    it("links a threat to a mission with notes", async () => {
      const missionThreat = {
        missionId: "m-1",
        threatId: "threat-1",
        notes: "Primary threat along route",
        threat: mockThreat,
      };
      (prisma.missionThreat.create as jest.Mock).mockResolvedValue(missionThreat);

      const result = await threatService.addToMission("m-1", "threat-1", "Primary threat along route");

      expect(prisma.missionThreat.create).toHaveBeenCalledWith({
        data: { missionId: "m-1", threatId: "threat-1", notes: "Primary threat along route" },
        include: { threat: true },
      });
      expect(result.notes).toBe("Primary threat along route");
    });
  });

  // ─── removeFromMission ──────────────────────────────────────────

  describe("removeFromMission", () => {
    it("removes a threat from a mission using compound key", async () => {
      (prisma.missionThreat.delete as jest.Mock).mockResolvedValue({});

      await threatService.removeFromMission("m-1", "threat-1");

      expect(prisma.missionThreat.delete).toHaveBeenCalledWith({
        where: { missionId_threatId: { missionId: "m-1", threatId: "threat-1" } },
      });
    });
  });

  // ─── listByMission ─────────────────────────────────────────────

  describe("listByMission", () => {
    it("returns threats with notes for a mission", async () => {
      (prisma.missionThreat.findMany as jest.Mock).mockResolvedValue([
        { threat: mockThreat, notes: "Primary threat" },
      ]);

      const result = await threatService.listByMission("m-1");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("SA-6 Gainful");
      expect(result[0].notes).toBe("Primary threat");
    });

    it("returns empty array when no threats assigned", async () => {
      (prisma.missionThreat.findMany as jest.Mock).mockResolvedValue([]);

      const result = await threatService.listByMission("m-1");
      expect(result).toEqual([]);
    });

    it("maps multiple mission threats correctly", async () => {
      const secondThreat = { ...mockThreat, id: "threat-2", name: "ZSU-23-4" };
      (prisma.missionThreat.findMany as jest.Mock).mockResolvedValue([
        { threat: mockThreat, notes: "Primary" },
        { threat: secondThreat, notes: "Secondary" },
      ]);

      const result = await threatService.listByMission("m-1");
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("SA-6 Gainful");
      expect(result[1].name).toBe("ZSU-23-4");
    });
  });

  // ─── findThreatsNearRoute ───────────────────────────────────────

  describe("findThreatsNearRoute", () => {
    it("executes PostGIS query and returns results", async () => {
      const nearbyThreats = [
        { ...mockThreat, distance_nm: 2.3 },
      ];
      (prisma.$queryRaw as jest.Mock).mockResolvedValue(nearbyThreats);

      const result = await threatService.findThreatsNearRoute("m-1", 10);
      expect(result).toEqual(nearbyThreats);
    });

    it("uses default buffer of 5 NM", async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      await threatService.findThreatsNearRoute("m-1");
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it("returns empty array when no threats are near route", async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await threatService.findThreatsNearRoute("m-1");
      expect(result).toEqual([]);
    });
  });
});
