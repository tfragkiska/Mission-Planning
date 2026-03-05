import { deconflictionService } from "./service";
import { prisma } from "../../infra/database";

jest.mock("../../infra/database", () => ({
  prisma: {
    mission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    deconflictionResult: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    aircraft: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

describe("deconflictionService", () => {
  describe("runCheck", () => {
    it("flags missing waypoints", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({
        id: "m-1", waypoints: [], aircraft: [], crewMembers: [],
        scheduledStart: null, scheduledEnd: null,
      });
      (prisma.deconflictionResult.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.deconflictionResult.create as jest.Mock).mockImplementation(
        ({ data }: any) => Promise.resolve({ id: "dr-1", ...data })
      );

      const results = await deconflictionService.runCheck("m-1");
      const waypointWarning = results.find((r: any) => r.description.includes("no waypoints"));
      expect(waypointWarning).toBeDefined();
    });

    it("flags missing schedule", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({
        id: "m-1", waypoints: [{ id: "w1" }, { id: "w2" }], aircraft: [], crewMembers: [],
        scheduledStart: null, scheduledEnd: null,
      });
      (prisma.deconflictionResult.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
      (prisma.deconflictionResult.create as jest.Mock).mockImplementation(
        ({ data }: any) => Promise.resolve({ id: "dr-1", ...data })
      );

      const results = await deconflictionService.runCheck("m-1");
      const timingWarning = results.find((r: any) => r.description.includes("no scheduled"));
      expect(timingWarning).toBeDefined();
    });
  });

  describe("hasUnresolvedCritical", () => {
    it("returns true when critical conflicts exist", async () => {
      (prisma.deconflictionResult.count as jest.Mock).mockResolvedValue(2);
      const result = await deconflictionService.hasUnresolvedCritical("m-1");
      expect(result).toBe(true);
    });

    it("returns false when no critical conflicts", async () => {
      (prisma.deconflictionResult.count as jest.Mock).mockResolvedValue(0);
      const result = await deconflictionService.hasUnresolvedCritical("m-1");
      expect(result).toBe(false);
    });
  });
});
