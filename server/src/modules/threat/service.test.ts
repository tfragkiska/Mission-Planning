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

describe("threatService", () => {
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

  describe("create", () => {
    it("creates a threat", async () => {
      (prisma.threat.create as jest.Mock).mockResolvedValue(mockThreat);
      const result = await threatService.create({
        name: "SA-6 Gainful", category: "SAM", lat: 34.1, lon: -118.2,
        rangeNm: 13, lethality: "HIGH",
      });
      expect(result.name).toBe("SA-6 Gainful");
    });
  });

  describe("list", () => {
    it("returns all threats", async () => {
      (prisma.threat.findMany as jest.Mock).mockResolvedValue([mockThreat]);
      const result = await threatService.list();
      expect(result).toHaveLength(1);
    });
  });

  describe("listByMission", () => {
    it("returns threats for a mission", async () => {
      (prisma.missionThreat.findMany as jest.Mock).mockResolvedValue([
        { threat: mockThreat, notes: "Primary threat" },
      ]);
      const result = await threatService.listByMission("mission-1");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("SA-6 Gainful");
    });
  });
});
