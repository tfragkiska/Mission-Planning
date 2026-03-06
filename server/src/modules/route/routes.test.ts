import { createMockPrisma, createAgent, tokens } from "../../test/integration-setup";

const mockPrisma = createMockPrisma();

jest.mock("../../infra/database", () => ({ prisma: mockPrisma }));
jest.mock("../../infra/socket", () => ({
  initSocketServer: jest.fn(),
  emitMissionUpdate: jest.fn(),
  emitActivity: jest.fn(),
  emitToUser: jest.fn(),
  getIO: jest.fn(() => ({ to: () => ({ emit: jest.fn() }) })),
}));
jest.mock("../audit/service", () => ({
  auditService: { logAction: jest.fn() },
}));

const agent = createAgent();

const missionId = "mission-1";
const waypointId = "wp-1";

const mockWaypoint = {
  id: waypointId,
  missionId,
  sequenceOrder: 1,
  name: "WP Alpha",
  lat: 34.05,
  lon: -118.25,
  altitude: 25000,
  speed: 450,
  timeOnTarget: null,
  type: "WAYPOINT",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("Waypoint integration tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- GET /api/missions/:id/waypoints ----------

  describe("GET /api/missions/:missionId/waypoints", () => {
    it("should return 200 with list of waypoints", async () => {
      mockPrisma.waypoint.findMany.mockResolvedValue([mockWaypoint]);

      const res = await agent
        .get(`/api/missions/${missionId}/waypoints`)
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("WP Alpha");
    });

    it("should return 401 without auth", async () => {
      const res = await agent.get(`/api/missions/${missionId}/waypoints`);
      expect(res.status).toBe(401);
    });

    it("should return empty array for mission with no waypoints", async () => {
      mockPrisma.waypoint.findMany.mockResolvedValue([]);

      const res = await agent
        .get(`/api/missions/${missionId}/waypoints`)
        .set("Authorization", `Bearer ${tokens.pilot}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // ---------- POST /api/missions/:id/waypoints ----------

  describe("POST /api/missions/:missionId/waypoints", () => {
    const validPayload = { lat: 34.05, lon: -118.25, name: "WP Bravo", altitude: 20000 };

    it("should return 201 when creating a valid waypoint", async () => {
      mockPrisma.mission.findUnique.mockResolvedValue({
        id: missionId,
        status: "DRAFT",
        createdById: "planner-user-id",
      });
      mockPrisma.waypoint.count.mockResolvedValue(0);
      mockPrisma.waypoint.create.mockResolvedValue({
        ...mockWaypoint,
        ...validPayload,
        id: "wp-2",
        sequenceOrder: 1,
      });

      const res = await agent
        .post(`/api/missions/${missionId}/waypoints`)
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("WP Bravo");
      expect(res.body.lat).toBe(34.05);
    });

    it("should return 400 when lat is missing", async () => {
      const res = await agent
        .post(`/api/missions/${missionId}/waypoints`)
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ lon: -118.25 });

      expect(res.status).toBe(400);
    });

    it("should return 400 when lon is missing", async () => {
      const res = await agent
        .post(`/api/missions/${missionId}/waypoints`)
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ lat: 34.05 });

      expect(res.status).toBe(400);
    });

    it("should return 400 when lat is out of range", async () => {
      const res = await agent
        .post(`/api/missions/${missionId}/waypoints`)
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ lat: 100, lon: -118.25 });

      expect(res.status).toBe(400);
    });

    it("should return 400 when lon is out of range", async () => {
      const res = await agent
        .post(`/api/missions/${missionId}/waypoints`)
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ lat: 34.05, lon: 200 });

      expect(res.status).toBe(400);
    });
  });

  // ---------- DELETE /api/missions/:id/waypoints/:wpId ----------

  describe("DELETE /api/missions/:missionId/waypoints/:id", () => {
    it("should return 204 when deleting an existing waypoint", async () => {
      mockPrisma.waypoint.findUnique.mockResolvedValue(mockWaypoint);
      mockPrisma.waypoint.delete.mockResolvedValue(mockWaypoint);

      const res = await agent
        .delete(`/api/missions/${missionId}/waypoints/${waypointId}`)
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(204);
    });

    it("should return 404 when waypoint does not exist", async () => {
      mockPrisma.waypoint.findUnique.mockResolvedValue(null);

      const res = await agent
        .delete(`/api/missions/${missionId}/waypoints/non-existent`)
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(404);
    });

    it("should return 401 without auth", async () => {
      const res = await agent.delete(`/api/missions/${missionId}/waypoints/${waypointId}`);
      expect(res.status).toBe(401);
    });
  });
});
