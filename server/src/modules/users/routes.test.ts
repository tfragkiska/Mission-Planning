import { createMockPrisma, createAgent, tokens, testUsers, generateExpiredToken } from "../../test/integration-setup";

const mockPrisma = createMockPrisma();

jest.mock("../../infra/database", () => ({ prisma: mockPrisma }));
jest.mock("../../infra/socket", () => ({
  initSocketServer: jest.fn(),
  emitMissionUpdate: jest.fn(),
  emitActivity: jest.fn(),
  emitToUser: jest.fn(),
  getIO: jest.fn(() => ({ to: () => ({ emit: jest.fn() }) })),
}));

import bcrypt from "bcryptjs";

const agent = createAgent();

describe("Auth integration tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- POST /api/auth/login ----------

  describe("POST /api/auth/login", () => {
    const mockUser = {
      id: "user-1",
      email: "planner@test.mil",
      name: "Test Planner",
      role: "PLANNER",
      passwordHash: bcrypt.hashSync("secret123", 10),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should return 200 with token and user on valid credentials", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const res = await agent
        .post("/api/auth/login")
        .send({ email: "planner@test.mil", password: "secret123" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(typeof res.body.token).toBe("string");
      expect(res.body.user).toMatchObject({
        id: "user-1",
        email: "planner@test.mil",
        role: "PLANNER",
      });
    });

    it("should return 401 for invalid password", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const res = await agent
        .post("/api/auth/login")
        .send({ email: "planner@test.mil", password: "wrongpassword" });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 401 for non-existent user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await agent
        .post("/api/auth/login")
        .send({ email: "nobody@test.mil", password: "secret123" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid credentials");
    });

    it("should return 400 for missing email", async () => {
      const res = await agent
        .post("/api/auth/login")
        .send({ password: "secret123" });

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing password", async () => {
      const res = await agent
        .post("/api/auth/login")
        .send({ email: "planner@test.mil" });

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid email format", async () => {
      const res = await agent
        .post("/api/auth/login")
        .send({ email: "not-an-email", password: "secret123" });

      expect(res.status).toBe(400);
    });
  });

  // ---------- GET /api/auth/me ----------

  describe("GET /api/auth/me", () => {
    it("should return 200 with user profile for valid token", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.planner.userId,
        email: testUsers.planner.email,
        name: testUsers.planner.name,
        role: testUsers.planner.role,
      });

      const res = await agent
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${tokens.planner}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: testUsers.planner.userId,
        email: testUsers.planner.email,
        role: "PLANNER",
      });
    });

    it("should return 401 without token", async () => {
      const res = await agent.get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing token");
    });

    it("should return 401 with expired token", async () => {
      const expiredToken = generateExpiredToken(testUsers.planner);
      // Small delay to ensure token is expired
      await new Promise((r) => setTimeout(r, 50));

      const res = await agent
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid token");
    });

    it("should return 401 with malformed token", async () => {
      const res = await agent
        .get("/api/auth/me")
        .set("Authorization", "Bearer totally.invalid.token");

      expect(res.status).toBe(401);
    });

    it("should return 401 with missing Bearer prefix", async () => {
      const res = await agent
        .get("/api/auth/me")
        .set("Authorization", tokens.planner);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing token");
    });
  });
});
