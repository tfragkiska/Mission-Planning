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

const mockThreat = {
  id: "threat-1",
  name: "SA-6 Gainful",
  category: "SAM",
  lat: 33.5,
  lon: 44.4,
  rangeNm: 15,
  lethality: "HIGH",
  minAltitude: null,
  maxAltitude: null,
  active: true,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const missionId = "mission-1";

describe("Threat integration tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- GET /api/threats ----------

  describe("GET /api/threats", () => {
    it("should return 200 with list of threats", async () => {
      mockPrisma.threat.findMany.mockResolvedValue([mockThreat]);

      const res = await agent
        .get("/api/threats")
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("SA-6 Gainful");
    });

    it("should return 401 without auth", async () => {
      const res = await agent.get("/api/threats");
      expect(res.status).toBe(401);
    });

    it("should allow pilot to list threats", async () => {
      mockPrisma.threat.findMany.mockResolvedValue([]);

      const res = await agent
        .get("/api/threats")
        .set("Authorization", `Bearer ${tokens.pilot}`);

      expect(res.status).toBe(200);
    });
  });

  // ---------- POST /api/threats ----------

  describe("POST /api/threats", () => {
    const validThreat = {
      name: "ZSU-23",
      category: "AAA",
      lat: 33.0,
      lon: 44.0,
      rangeNm: 3,
      lethality: "MEDIUM",
    };

    it("should return 201 when planner creates a threat", async () => {
      mockPrisma.threat.create.mockResolvedValue({ ...mockThreat, ...validThreat, id: "threat-2" });

      const res = await agent
        .post("/api/threats")
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send(validThreat);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("ZSU-23");
      expect(res.body.category).toBe("AAA");
    });

    it("should return 403 when pilot tries to create a threat", async () => {
      const res = await agent
        .post("/api/threats")
        .set("Authorization", `Bearer ${tokens.pilot}`)
        .send(validThreat);

      expect(res.status).toBe(403);
    });

    it("should return 400 when name is missing", async () => {
      const res = await agent
        .post("/api/threats")
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ category: "SAM", lat: 33.0, lon: 44.0, rangeNm: 10, lethality: "HIGH" });

      expect(res.status).toBe(400);
    });

    it("should return 400 when category is invalid", async () => {
      const res = await agent
        .post("/api/threats")
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ name: "Test", category: "INVALID", lat: 33.0, lon: 44.0, rangeNm: 10, lethality: "HIGH" });

      expect(res.status).toBe(400);
    });

    it("should return 400 when rangeNm is negative", async () => {
      const res = await agent
        .post("/api/threats")
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ name: "Test", category: "SAM", lat: 33.0, lon: 44.0, rangeNm: -5, lethality: "HIGH" });

      expect(res.status).toBe(400);
    });
  });

  // ---------- POST /api/missions/:id/threats ----------

  describe("POST /api/missions/:missionId/threats", () => {
    it("should return 201 when adding threat to mission", async () => {
      const missionThreat = { id: "mt-1", missionId, threatId: "threat-1", notes: null };
      mockPrisma.missionThreat.create.mockResolvedValue(missionThreat);

      const res = await agent
        .post(`/api/missions/${missionId}/threats`)
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ threatId: "00000000-0000-0000-0000-000000000001" });

      expect(res.status).toBe(201);
    });

    it("should return 403 when pilot tries to add threat to mission", async () => {
      const res = await agent
        .post(`/api/missions/${missionId}/threats`)
        .set("Authorization", `Bearer ${tokens.pilot}`)
        .send({ threatId: "00000000-0000-0000-0000-000000000001" });

      expect(res.status).toBe(403);
    });

    it("should return 400 when threatId is not a valid UUID", async () => {
      const res = await agent
        .post(`/api/missions/${missionId}/threats`)
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ threatId: "not-a-uuid" });

      expect(res.status).toBe(400);
    });
  });

  // ---------- DELETE /api/missions/:id/threats/:threatId ----------

  describe("DELETE /api/missions/:missionId/threats/:threatId", () => {
    it("should return 204 when removing threat from mission", async () => {
      mockPrisma.missionThreat.delete.mockResolvedValue({});

      const res = await agent
        .delete(`/api/missions/${missionId}/threats/threat-1`)
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(204);
    });

    it("should return 403 when pilot tries to remove threat", async () => {
      const res = await agent
        .delete(`/api/missions/${missionId}/threats/threat-1`)
        .set("Authorization", `Bearer ${tokens.pilot}`);

      expect(res.status).toBe(403);
    });

    it("should return 401 without auth", async () => {
      const res = await agent.delete(`/api/missions/${missionId}/threats/threat-1`);
      expect(res.status).toBe(401);
    });
  });
});
