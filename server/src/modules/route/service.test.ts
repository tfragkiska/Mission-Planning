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

jest.mock("../../infra/socket", () => ({
  emitMissionUpdate: jest.fn(),
  emitActivity: jest.fn(),
}));

jest.mock("../audit/service", () => ({
  auditService: {
    logAction: jest.fn().mockResolvedValue({}),
  },
}));

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

describe("waypointService", () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── create ─────────────────────────────────────────────────────

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
      expect(prisma.waypoint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          missionId: "mission-1",
          sequenceOrder: 1,
          lat: 34.05,
          lon: -118.25,
        }),
      });
    });

    it("increments sequence order based on existing count", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ id: "mission-1", status: "DRAFT" });
      (prisma.waypoint.count as jest.Mock).mockResolvedValue(3);
      (prisma.waypoint.create as jest.Mock).mockResolvedValue({ ...mockWaypoint, sequenceOrder: 4 });

      await waypointService.create("mission-1", { lat: 35.0, lon: -119.0 });

      expect(prisma.waypoint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ sequenceOrder: 4 }),
      });
    });

    it("throws NotFoundError when mission does not exist", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        waypointService.create("bad-id", { lat: 34.0, lon: -118.0 }),
      ).rejects.toThrow("Mission not found");
    });

    it("throws ValidationError when mission is not in DRAFT status", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({
        id: "mission-1",
        status: "APPROVED",
      });

      await expect(
        waypointService.create("mission-1", { lat: 34.0, lon: -118.0 }),
      ).rejects.toThrow("Can only add waypoints to DRAFT missions");
    });

    it("defaults type to WAYPOINT when not specified", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ id: "mission-1", status: "DRAFT" });
      (prisma.waypoint.count as jest.Mock).mockResolvedValue(0);
      (prisma.waypoint.create as jest.Mock).mockResolvedValue({ ...mockWaypoint, type: "WAYPOINT" });

      await waypointService.create("mission-1", { lat: 34.0, lon: -118.0 });

      expect(prisma.waypoint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: "WAYPOINT" }),
      });
    });

    it("stores timeOnTarget as Date when provided", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ id: "mission-1", status: "DRAFT" });
      (prisma.waypoint.count as jest.Mock).mockResolvedValue(0);
      (prisma.waypoint.create as jest.Mock).mockResolvedValue(mockWaypoint);

      await waypointService.create("mission-1", {
        lat: 34.0,
        lon: -118.0,
        timeOnTarget: "2026-03-10T09:00:00Z",
      });

      const callData = (prisma.waypoint.create as jest.Mock).mock.calls[0][0].data;
      expect(callData.timeOnTarget).toBeInstanceOf(Date);
    });

    it("sets timeOnTarget to null when not provided", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ id: "mission-1", status: "DRAFT" });
      (prisma.waypoint.count as jest.Mock).mockResolvedValue(0);
      (prisma.waypoint.create as jest.Mock).mockResolvedValue(mockWaypoint);

      await waypointService.create("mission-1", { lat: 34.0, lon: -118.0 });

      const callData = (prisma.waypoint.create as jest.Mock).mock.calls[0][0].data;
      expect(callData.timeOnTarget).toBeNull();
    });
  });

  // ─── listByMission ─────────────────────────────────────────────

  describe("listByMission", () => {
    it("returns waypoints ordered by sequenceOrder ascending", async () => {
      const waypoints = [
        { ...mockWaypoint, sequenceOrder: 1 },
        { ...mockWaypoint, id: "wp-2", sequenceOrder: 2 },
      ];
      (prisma.waypoint.findMany as jest.Mock).mockResolvedValue(waypoints);

      const result = await waypointService.listByMission("mission-1");

      expect(result).toHaveLength(2);
      expect(prisma.waypoint.findMany).toHaveBeenCalledWith({
        where: { missionId: "mission-1" },
        orderBy: { sequenceOrder: "asc" },
      });
    });

    it("returns empty array when mission has no waypoints", async () => {
      (prisma.waypoint.findMany as jest.Mock).mockResolvedValue([]);

      const result = await waypointService.listByMission("mission-1");
      expect(result).toEqual([]);
    });
  });

  // ─── update ─────────────────────────────────────────────────────

  describe("update", () => {
    it("updates waypoint fields", async () => {
      (prisma.waypoint.findUnique as jest.Mock).mockResolvedValue(mockWaypoint);
      (prisma.waypoint.update as jest.Mock).mockResolvedValue({
        ...mockWaypoint,
        lat: 35.0,
        lon: -119.0,
        altitude: 10000,
      });

      const result = await waypointService.update("wp-1", {
        lat: 35.0,
        lon: -119.0,
        altitude: 10000,
      });

      expect(result.lat).toBe(35.0);
      expect(result.altitude).toBe(10000);
    });

    it("throws NotFoundError for non-existent waypoint", async () => {
      (prisma.waypoint.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(waypointService.update("bad-id", { lat: 35.0 })).rejects.toThrow(
        "Waypoint not found",
      );
    });

    it("allows updating sequence order", async () => {
      (prisma.waypoint.findUnique as jest.Mock).mockResolvedValue(mockWaypoint);
      (prisma.waypoint.update as jest.Mock).mockResolvedValue({ ...mockWaypoint, sequenceOrder: 3 });

      await waypointService.update("wp-1", { sequenceOrder: 3 });

      expect(prisma.waypoint.update).toHaveBeenCalledWith({
        where: { id: "wp-1" },
        data: expect.objectContaining({ sequenceOrder: 3 }),
      });
    });
  });

  // ─── delete ─────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes an existing waypoint", async () => {
      (prisma.waypoint.findUnique as jest.Mock).mockResolvedValue(mockWaypoint);
      (prisma.waypoint.delete as jest.Mock).mockResolvedValue(mockWaypoint);

      await waypointService.delete("wp-1");
      expect(prisma.waypoint.delete).toHaveBeenCalledWith({ where: { id: "wp-1" } });
    });

    it("throws NotFoundError for non-existent waypoint", async () => {
      (prisma.waypoint.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(waypointService.delete("bad-id")).rejects.toThrow("Waypoint not found");
    });
  });

  // ─── reorder ────────────────────────────────────────────────────

  describe("reorder", () => {
    it("reorders waypoints according to provided IDs", async () => {
      const waypoints = [
        { ...mockWaypoint, id: "wp-1", sequenceOrder: 1 },
        { ...mockWaypoint, id: "wp-2", sequenceOrder: 2 },
        { ...mockWaypoint, id: "wp-3", sequenceOrder: 3 },
      ];
      (prisma.waypoint.findMany as jest.Mock).mockResolvedValue(waypoints);
      (prisma.waypoint.update as jest.Mock).mockImplementation(({ where, data }: any) =>
        Promise.resolve({ id: where.id, sequenceOrder: data.sequenceOrder }),
      );

      // After transaction, listByMission is called
      (prisma.waypoint.findMany as jest.Mock)
        .mockResolvedValueOnce(waypoints) // first call: validation
        .mockResolvedValueOnce([ // second call: return reordered
          { ...mockWaypoint, id: "wp-3", sequenceOrder: 1 },
          { ...mockWaypoint, id: "wp-1", sequenceOrder: 2 },
          { ...mockWaypoint, id: "wp-2", sequenceOrder: 3 },
        ]);

      const result = await waypointService.reorder("mission-1", ["wp-3", "wp-1", "wp-2"]);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(3);
    });

    it("throws ValidationError when ID count does not match waypoint count", async () => {
      const waypoints = [
        { id: "wp-1", sequenceOrder: 1 },
        { id: "wp-2", sequenceOrder: 2 },
      ];
      (prisma.waypoint.findMany as jest.Mock).mockResolvedValue(waypoints);

      await expect(
        waypointService.reorder("mission-1", ["wp-1"]),
      ).rejects.toThrow("Must include all waypoint IDs");
    });

    it("throws ValidationError when extra IDs are provided", async () => {
      const waypoints = [{ id: "wp-1", sequenceOrder: 1 }];
      (prisma.waypoint.findMany as jest.Mock).mockResolvedValue(waypoints);

      await expect(
        waypointService.reorder("mission-1", ["wp-1", "wp-2"]),
      ).rejects.toThrow("Must include all waypoint IDs");
    });
  });
});
