import { createMockPrisma, createAgent, tokens, testUsers } from "../../test/integration-setup";

const mockPrisma = createMockPrisma();

jest.mock("../../infra/database", () => ({ prisma: mockPrisma }));
jest.mock("../../infra/socket", () => ({
  initSocketServer: jest.fn(),
  emitMissionUpdate: jest.fn(),
  emitActivity: jest.fn(),
  emitToUser: jest.fn(),
  getIO: jest.fn(() => ({ to: () => ({ emit: jest.fn() }) })),
}));

const mockCloneService = {
  cloneMission: jest.fn(),
  listTemplates: jest.fn(),
  saveAsTemplate: jest.fn(),
  createFromTemplate: jest.fn(),
};
jest.mock("./clone-service", () => ({
  cloneService: mockCloneService,
}));

const agent = createAgent();

const mockMission = {
  id: "mission-1",
  name: "Alpha Strike",
  type: "TRAINING",
  status: "DRAFT",
  priority: "MEDIUM",
  scheduledStart: null,
  scheduledEnd: null,
  commanderComments: null,
  createdById: testUsers.planner.userId,
  approvedById: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: { id: testUsers.planner.userId, name: "Test Planner", email: "planner@test.mil", role: "PLANNER" },
  approvedBy: null,
  aircraft: [],
  crewMembers: [],
  waypoints: [],
};

describe("Mission integration tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- GET /api/missions ----------

  describe("GET /api/missions", () => {
    it("should return 200 with list of missions", async () => {
      mockPrisma.mission.findMany.mockResolvedValue([mockMission]);

      const res = await agent
        .get("/api/missions")
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Alpha Strike");
    });

    it("should return 401 without auth", async () => {
      const res = await agent.get("/api/missions");
      expect(res.status).toBe(401);
    });

    it("should return empty array when no missions exist", async () => {
      mockPrisma.mission.findMany.mockResolvedValue([]);

      const res = await agent
        .get("/api/missions")
        .set("Authorization", `Bearer ${tokens.pilot}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // ---------- POST /api/missions ----------

  describe("POST /api/missions", () => {
    const validPayload = { name: "Bravo Strike", type: "TRAINING" };

    it("should return 201 when planner creates a mission", async () => {
      mockPrisma.mission.create.mockResolvedValue({ ...mockMission, name: "Bravo Strike" });
      mockPrisma.missionVersion.findFirst.mockResolvedValue(null);
      mockPrisma.missionVersion.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await agent
        .post("/api/missions")
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Bravo Strike");
    });

    it("should return 403 when pilot tries to create a mission", async () => {
      const res = await agent
        .post("/api/missions")
        .set("Authorization", `Bearer ${tokens.pilot}`)
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Insufficient permissions");
    });

    it("should return 400 when name is missing", async () => {
      const res = await agent
        .post("/api/missions")
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ type: "TRAINING" });

      expect(res.status).toBe(400);
    });

    it("should return 400 when type is missing", async () => {
      const res = await agent
        .post("/api/missions")
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ name: "No Type Mission" });

      expect(res.status).toBe(400);
    });

    it("should return 400 when type is invalid", async () => {
      const res = await agent
        .post("/api/missions")
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ name: "Bad Type", type: "INVALID" });

      expect(res.status).toBe(400);
    });
  });

  // ---------- GET /api/missions/:id ----------

  describe("GET /api/missions/:id", () => {
    it("should return 200 with mission details", async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);

      const res = await agent
        .get("/api/missions/mission-1")
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("mission-1");
      expect(res.body.name).toBe("Alpha Strike");
    });

    it("should return 404 for non-existent mission", async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(null);

      const res = await agent
        .get("/api/missions/non-existent")
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Mission not found");
    });
  });

  // ---------- PUT /api/missions/:id ----------

  describe("PUT /api/missions/:id", () => {
    it("should return 200 when owner updates a draft mission", async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);
      mockPrisma.mission.update.mockResolvedValue({ ...mockMission, name: "Updated" });
      mockPrisma.missionVersion.findFirst.mockResolvedValue(null);
      mockPrisma.missionVersion.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await agent
        .put("/api/missions/mission-1")
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ name: "Updated" });

      expect(res.status).toBe(200);
    });

    it("should return 403 when non-owner tries to update", async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);

      const res = await agent
        .put("/api/missions/mission-1")
        .set("Authorization", `Bearer ${tokens.pilot}`)
        .send({ name: "Hacked" });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Only the mission creator can edit");
    });
  });

  // ---------- POST /api/missions/:id/transition ----------

  describe("POST /api/missions/:id/transition", () => {
    it("should return 200 for valid transition DRAFT -> PLANNED", async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);
      mockPrisma.mission.update.mockResolvedValue({ ...mockMission, status: "PLANNED" });
      mockPrisma.missionVersion.findFirst.mockResolvedValue(null);
      mockPrisma.missionVersion.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.crewMember.findMany.mockResolvedValue([]);

      const res = await agent
        .post("/api/missions/mission-1/transition")
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ status: "PLANNED" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("PLANNED");
    });

    it("should return 400 for invalid transition DRAFT -> APPROVED", async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);

      const res = await agent
        .post("/api/missions/mission-1/transition")
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ status: "APPROVED" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Cannot transition");
    });

    it("should return 403 when non-commander tries to approve", async () => {
      const underReview = { ...mockMission, status: "UNDER_REVIEW" };
      mockPrisma.mission.findUnique.mockResolvedValue(underReview);

      const res = await agent
        .post("/api/missions/mission-1/transition")
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ status: "APPROVED" });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("COMMANDER");
    });

    it("should allow commander to approve UNDER_REVIEW mission", async () => {
      const underReview = { ...mockMission, status: "UNDER_REVIEW" };
      mockPrisma.mission.findUnique.mockResolvedValue(underReview);
      mockPrisma.mission.update.mockResolvedValue({ ...underReview, status: "APPROVED", approvedById: testUsers.commander.userId });
      mockPrisma.missionVersion.findFirst.mockResolvedValue(null);
      mockPrisma.missionVersion.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.crewMember.findMany.mockResolvedValue([]);

      const res = await agent
        .post("/api/missions/mission-1/transition")
        .set("Authorization", `Bearer ${tokens.commander}`)
        .send({ status: "APPROVED" });

      expect(res.status).toBe(200);
    });
  });

  // ---------- POST /api/missions/:id/clone ----------

  describe("POST /api/missions/:id/clone", () => {
    it("should return 201 when planner clones a mission", async () => {
      const cloned = { ...mockMission, id: "mission-2", name: "Alpha Strike (copy)" };
      mockCloneService.cloneMission.mockResolvedValue(cloned);

      const res = await agent
        .post("/api/missions/mission-1/clone")
        .set("Authorization", `Bearer ${tokens.planner}`)
        .send({ name: "Alpha Strike (copy)" });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Alpha Strike (copy)");
    });

    it("should return 403 when pilot tries to clone", async () => {
      const res = await agent
        .post("/api/missions/mission-1/clone")
        .set("Authorization", `Bearer ${tokens.pilot}`)
        .send({});

      expect(res.status).toBe(403);
    });
  });
});
