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

const mockNotification = {
  id: "notif-1",
  userId: testUsers.planner.userId,
  type: "MISSION_STATUS",
  title: "Mission Approved",
  message: "Mission Alpha Strike has been approved",
  missionId: "mission-1",
  read: false,
  createdAt: new Date().toISOString(),
};

describe("Notification integration tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- GET /api/notifications ----------

  describe("GET /api/notifications", () => {
    it("should return 200 with list of notifications", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification]);

      const res = await agent
        .get("/api/notifications")
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe("Mission Approved");
    });

    it("should return 401 without auth", async () => {
      const res = await agent.get("/api/notifications");
      expect(res.status).toBe(401);
    });

    it("should support unread filter", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification]);

      const res = await agent
        .get("/api/notifications?unread=true")
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(200);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ read: false }),
        }),
      );
    });

    it("should support limit parameter", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);

      const res = await agent
        .get("/api/notifications?limit=10")
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(200);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it("should return empty array when no notifications", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);

      const res = await agent
        .get("/api/notifications")
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // ---------- PATCH /api/notifications/:id/read ----------

  describe("PATCH /api/notifications/:id/read", () => {
    it("should return 200 when marking notification as read", async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrisma.notification.update.mockResolvedValue({ ...mockNotification, read: true });

      const res = await agent
        .patch("/api/notifications/notif-1/read")
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(200);
      expect(res.body.read).toBe(true);
    });

    it("should return 404 for non-existent notification", async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      const res = await agent
        .patch("/api/notifications/non-existent/read")
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Notification not found");
    });

    it("should return 401 without auth", async () => {
      const res = await agent.patch("/api/notifications/notif-1/read");
      expect(res.status).toBe(401);
    });
  });

  // ---------- POST /api/notifications/read-all ----------

  describe("POST /api/notifications/read-all", () => {
    it("should return 204 when marking all as read", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const res = await agent
        .post("/api/notifications/read-all")
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(204);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: testUsers.planner.userId, read: false },
          data: { read: true },
        }),
      );
    });

    it("should return 401 without auth", async () => {
      const res = await agent.post("/api/notifications/read-all");
      expect(res.status).toBe(401);
    });
  });
});
