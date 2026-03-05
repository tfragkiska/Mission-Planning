import { waypointService } from "./service";
import { prisma } from "../../infra/database";

jest.mock("../../infra/database", () => ({
  prisma: {
    waypoint: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    mission: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callbacks: Promise<unknown>[]) => Promise.all(callbacks)),
  },
}));

describe("waypointService", () => {
  const mockWaypoint = {
    id: "wp-1",
    missionId: "mission-1",
    sequenceOrder: 1,
    name: "IP Alpha",
    lat: 34.05,
    lon: -118.25,
    altitude: 5000,
    speed: 250,
    timeOnTarget: null,
    type: "INITIAL_POINT",
  };

  describe("create", () => {
    it("creates a waypoint with next sequence order", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ id: "mission-1", status: "DRAFT" });
      (prisma.waypoint.count as jest.Mock).mockResolvedValue(0);
      (prisma.waypoint.create as jest.Mock).mockResolvedValue(mockWaypoint);

      const result = await waypointService.create("mission-1", {
        name: "IP Alpha",
        lat: 34.05,
        lon: -118.25,
        altitude: 5000,
        speed: 250,
        type: "INITIAL_POINT",
      });

      expect(result.name).toBe("IP Alpha");
    });
  });

  describe("listByMission", () => {
    it("returns ordered waypoints", async () => {
      (prisma.waypoint.findMany as jest.Mock).mockResolvedValue([mockWaypoint]);

      const result = await waypointService.listByMission("mission-1");

      expect(result).toHaveLength(1);
      expect(prisma.waypoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { missionId: "mission-1" },
          orderBy: { sequenceOrder: "asc" },
        }),
      );
    });
  });
});
