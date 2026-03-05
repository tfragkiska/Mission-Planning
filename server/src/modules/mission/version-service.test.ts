import { versionService } from "./version-service";
import { prisma } from "../../infra/database";

jest.mock("../../infra/database", () => ({
  prisma: {
    mission: { findUnique: jest.fn() },
    missionVersion: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

describe("versionService", () => {
  const mockMission = {
    id: "m-1", name: "Test", type: "TRAINING", status: "DRAFT",
    aircraft: [], crewMembers: [], waypoints: [], missionThreats: [],
    createdBy: { id: "u-1", name: "Test", email: "test@test.com", role: "PLANNER" },
    approvedBy: null,
  };

  describe("createSnapshot", () => {
    it("creates version 1 for first snapshot", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockMission);
      (prisma.missionVersion.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.missionVersion.create as jest.Mock).mockResolvedValue({
        id: "v-1", missionId: "m-1", version: 1, changeType: "created", changedBy: "u-1",
      });

      const result = await versionService.createSnapshot("m-1", "u-1", "created");
      expect(result.version).toBe(1);
      expect(prisma.missionVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ version: 1 }) })
      );
    });

    it("increments version number", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockMission);
      (prisma.missionVersion.findFirst as jest.Mock).mockResolvedValue({ version: 3 });
      (prisma.missionVersion.create as jest.Mock).mockResolvedValue({
        id: "v-2", missionId: "m-1", version: 4, changeType: "updated", changedBy: "u-1",
      });

      const result = await versionService.createSnapshot("m-1", "u-1", "updated");
      expect(result.version).toBe(4);
    });
  });

  describe("listVersions", () => {
    it("returns versions in descending order", async () => {
      (prisma.missionVersion.findMany as jest.Mock).mockResolvedValue([
        { id: "v-2", version: 2, changeType: "updated" },
        { id: "v-1", version: 1, changeType: "created" },
      ]);
      const result = await versionService.listVersions("m-1");
      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2);
    });
  });
});
