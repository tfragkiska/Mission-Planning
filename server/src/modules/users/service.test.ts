import { authService } from "./service";
import { prisma } from "../../infra/database";
import bcrypt from "bcryptjs";

jest.mock("../../infra/database", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("authService", () => {
  describe("login", () => {
    it("returns token and user for valid credentials", async () => {
      const hash = await bcrypt.hash("password123", 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "planner@mission.mil",
        passwordHash: hash,
        name: "Alex Planner",
        role: "PLANNER",
      });

      const result = await authService.login("planner@mission.mil", "password123");

      expect(result.user.email).toBe("planner@mission.mil");
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe("string");
    });

    it("throws for invalid email", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.login("bad@email.com", "password123"))
        .rejects.toThrow("Invalid credentials");
    });

    it("throws for wrong password", async () => {
      const hash = await bcrypt.hash("password123", 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "planner@mission.mil",
        passwordHash: hash,
        name: "Alex Planner",
        role: "PLANNER",
      });

      await expect(authService.login("planner@mission.mil", "wrongpassword"))
        .rejects.toThrow("Invalid credentials");
    });
  });
});
