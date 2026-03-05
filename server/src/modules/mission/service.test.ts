import { missionService } from "./service";
import { prisma } from "../../infra/database";

jest.mock("../../infra/database", () => ({
  prisma: {
    mission: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe("missionService", () => {
  const mockMission = {
    id: "mission-1",
    name: "Alpha Strike",
    type: "TRAINING",
    status: "DRAFT",
    priority: "MEDIUM",
    scheduledStart: null,
    scheduledEnd: null,
    commanderComments: null,
    createdById: "user-1",
    approvedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("create", () => {
    it("creates a mission in DRAFT status", async () => {
      (prisma.mission.create as jest.Mock).mockResolvedValue(mockMission);

      const result = await missionService.create({
        name: "Alpha Strike",
        type: "TRAINING",
        priority: "MEDIUM",
      }, "user-1");

      expect(prisma.mission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Alpha Strike",
          status: "DRAFT",
          createdById: "user-1",
        }),
        include: expect.any(Object),
      });
      expect(result.name).toBe("Alpha Strike");
    });
  });

  describe("transition", () => {
    it("transitions from DRAFT to PLANNED", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockMission);
      (prisma.mission.update as jest.Mock).mockResolvedValue({
        ...mockMission,
        status: "PLANNED",
      });

      const result = await missionService.transition("mission-1", "PLANNED", "user-1", "PLANNER");

      expect(result.status).toBe("PLANNED");
    });

    it("rejects invalid transition", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockMission);

      await expect(
        missionService.transition("mission-1", "APPROVED", "user-1", "PLANNER"),
      ).rejects.toThrow();
    });
  });

  describe("list", () => {
    it("returns all missions", async () => {
      (prisma.mission.findMany as jest.Mock).mockResolvedValue([mockMission]);

      const result = await missionService.list();

      expect(result).toHaveLength(1);
    });
  });
});
