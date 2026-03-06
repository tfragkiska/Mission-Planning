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

const agent = createAgent();

const mockAuditLog = {
  id: "audit-1",
  userId: testUsers.planner.userId,
  action: "CREATE_MISSION",
  entityType: "MISSION",
  entityId: "mission-1",
  details: { name: "Alpha Strike" },
  ipAddress: null,
  createdAt: new Date().toISOString(),
  user: {
    id: testUsers.planner.userId,
    name: "Test Planner",
    email: "planner@test.mil",
    role: "PLANNER",
  },
};

describe("Audit integration tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- GET /api/audit ----------

  describe("GET /api/audit", () => {
    it("should return 200 for commander with audit logs", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const res = await agent
        .get("/api/audit")
        .set("Authorization", `Bearer ${tokens.commander}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("logs");
      expect(res.body).toHaveProperty("total");
      expect(res.body.logs).toHaveLength(1);
      expect(res.body.logs[0].action).toBe("CREATE_MISSION");
    });

    it("should return 200 for planner with audit logs", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const res = await agent
        .get("/api/audit")
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("logs");
    });

    it("should return 403 for pilot (not authorized)", async () => {
      const res = await agent
        .get("/api/audit")
        .set("Authorization", `Bearer ${tokens.pilot}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Insufficient permissions");
    });

    it("should return 401 without auth", async () => {
      const res = await agent.get("/api/audit");
      expect(res.status).toBe(401);
    });

    it("should restrict planner to own audit logs only", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      await agent
        .get("/api/audit?userId=someone-else")
        .set("Authorization", `Bearer ${tokens.planner}`);

      // The route should force effectiveUserId to the planner's own id
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: testUsers.planner.userId,
          }),
        }),
      );
    });

    it("should allow commander to view any user audit logs", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await agent
        .get(`/api/audit?userId=${testUsers.planner.userId}`)
        .set("Authorization", `Bearer ${tokens.commander}`);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: testUsers.planner.userId,
          }),
        }),
      );
    });

    it("should support pagination parameters", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const res = await agent
        .get("/api/audit?page=2&limit=10")
        .set("Authorization", `Bearer ${tokens.commander}`);

      expect(res.status).toBe(200);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 10, // (page 2 - 1) * 10
        }),
      );
    });
  });

  // ---------- GET /api/audit/mission/:id ----------

  describe("GET /api/audit/mission/:id", () => {
    it("should return 200 with mission-specific audit trail for commander", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([mockAuditLog]);

      const res = await agent
        .get("/api/audit/mission/mission-1")
        .set("Authorization", `Bearer ${tokens.commander}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
    });

    it("should return 200 for planner accessing mission audit trail", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([mockAuditLog]);

      const res = await agent
        .get("/api/audit/mission/mission-1")
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(200);
    });

    it("should return 403 for pilot accessing mission audit trail", async () => {
      const res = await agent
        .get("/api/audit/mission/mission-1")
        .set("Authorization", `Bearer ${tokens.pilot}`);

      expect(res.status).toBe(403);
    });

    it("should return 401 without auth", async () => {
      const res = await agent.get("/api/audit/mission/mission-1");
      expect(res.status).toBe(401);
    });
  });
});
