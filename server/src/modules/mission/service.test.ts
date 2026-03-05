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
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    crewMember: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock("../../infra/socket", () => ({
  emitMissionUpdate: jest.fn(),
  emitActivity: jest.fn(),
}));

jest.mock("./version-service", () => ({
  versionService: {
    createSnapshot: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("../audit/service", () => ({
  auditService: {
    logAction: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("../notification/service", () => ({
  notificationService: {
    notifyStatusChange: jest.fn().mockResolvedValue(undefined),
    notifyMissionAssignment: jest.fn().mockResolvedValue(undefined),
  },
}));

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

describe("missionService", () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── create ─────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a mission in DRAFT status", async () => {
      (prisma.mission.create as jest.Mock).mockResolvedValue(mockMission);

      const result = await missionService.create(
        { name: "Alpha Strike", type: "TRAINING", priority: "MEDIUM" },
        "user-1",
      );

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

    it("defaults priority to MEDIUM when not provided", async () => {
      (prisma.mission.create as jest.Mock).mockResolvedValue({ ...mockMission, priority: "MEDIUM" });

      await missionService.create({ name: "Test", type: "TRAINING" }, "user-1");

      expect(prisma.mission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ priority: "MEDIUM" }),
        }),
      );
    });

    it("parses scheduledStart and scheduledEnd as Date objects", async () => {
      (prisma.mission.create as jest.Mock).mockResolvedValue(mockMission);

      await missionService.create(
        {
          name: "Timed Mission",
          type: "OPERATIONAL",
          scheduledStart: "2026-03-10T08:00:00Z",
          scheduledEnd: "2026-03-10T10:00:00Z",
        },
        "user-1",
      );

      const callData = (prisma.mission.create as jest.Mock).mock.calls[0][0].data;
      expect(callData.scheduledStart).toBeInstanceOf(Date);
      expect(callData.scheduledEnd).toBeInstanceOf(Date);
    });

    it("sets scheduledStart/End to null when not provided", async () => {
      (prisma.mission.create as jest.Mock).mockResolvedValue(mockMission);

      await missionService.create({ name: "No Schedule", type: "TRAINING" }, "user-1");

      const callData = (prisma.mission.create as jest.Mock).mock.calls[0][0].data;
      expect(callData.scheduledStart).toBeNull();
      expect(callData.scheduledEnd).toBeNull();
    });
  });

  // ─── getById ────────────────────────────────────────────────────

  describe("getById", () => {
    it("returns a mission when found", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockMission);

      const result = await missionService.getById("mission-1");
      expect(result.id).toBe("mission-1");
    });

    it("throws NotFoundError when mission does not exist", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(missionService.getById("bad-id")).rejects.toThrow("Mission not found");
    });
  });

  // ─── list ───────────────────────────────────────────────────────

  describe("list", () => {
    it("returns all missions ordered by updatedAt desc", async () => {
      (prisma.mission.findMany as jest.Mock).mockResolvedValue([mockMission]);

      const result = await missionService.list();
      expect(result).toHaveLength(1);
      expect(prisma.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { updatedAt: "desc" } }),
      );
    });

    it("passes filters to the query", async () => {
      (prisma.mission.findMany as jest.Mock).mockResolvedValue([]);

      await missionService.list({ status: "PLANNED" as any });
      expect(prisma.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "PLANNED" } }),
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────────

  describe("update", () => {
    it("updates a DRAFT mission by its creator", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockMission);
      (prisma.mission.update as jest.Mock).mockResolvedValue({ ...mockMission, name: "Bravo Strike" });

      const result = await missionService.update("mission-1", { name: "Bravo Strike" }, "user-1");
      expect(result.name).toBe("Bravo Strike");
    });

    it("throws NotFoundError for non-existent mission", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(missionService.update("bad-id", { name: "X" }, "user-1")).rejects.toThrow(
        "Mission not found",
      );
    });

    it("throws ForbiddenError when non-creator tries to edit", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockMission);
      await expect(missionService.update("mission-1", { name: "X" }, "other-user")).rejects.toThrow(
        "Only the mission creator can edit",
      );
    });

    it("throws ValidationError when editing non-DRAFT mission", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({
        ...mockMission,
        status: "PLANNED",
      });
      await expect(missionService.update("mission-1", { name: "X" }, "user-1")).rejects.toThrow(
        "Can only edit missions in DRAFT status",
      );
    });
  });

  // ─── delete ─────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes a DRAFT mission by its creator", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockMission);
      (prisma.mission.delete as jest.Mock).mockResolvedValue(mockMission);

      await missionService.delete("mission-1", "user-1");
      expect(prisma.mission.delete).toHaveBeenCalledWith({ where: { id: "mission-1" } });
    });

    it("throws NotFoundError for non-existent mission", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(missionService.delete("bad-id", "user-1")).rejects.toThrow("Mission not found");
    });

    it("throws ForbiddenError when non-creator tries to delete", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockMission);
      await expect(missionService.delete("mission-1", "other-user")).rejects.toThrow(
        "Only the mission creator can delete",
      );
    });

    it("throws ValidationError when deleting non-DRAFT mission", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({
        ...mockMission,
        status: "APPROVED",
      });
      await expect(missionService.delete("mission-1", "user-1")).rejects.toThrow(
        "Can only delete missions in DRAFT status",
      );
    });
  });

  // ─── transition ─────────────────────────────────────────────────

  describe("transition", () => {
    it("transitions from DRAFT to PLANNED", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockMission);
      (prisma.mission.update as jest.Mock).mockResolvedValue({ ...mockMission, status: "PLANNED" });

      const result = await missionService.transition("mission-1", "PLANNED", "user-1", "PLANNER");
      expect(result.status).toBe("PLANNED");
    });

    it("transitions from PLANNED to UNDER_REVIEW", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ ...mockMission, status: "PLANNED" });
      (prisma.mission.update as jest.Mock).mockResolvedValue({ ...mockMission, status: "UNDER_REVIEW" });

      const result = await missionService.transition("mission-1", "UNDER_REVIEW", "user-1", "PLANNER");
      expect(result.status).toBe("UNDER_REVIEW");
    });

    it("allows COMMANDER to approve (UNDER_REVIEW -> APPROVED)", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ ...mockMission, status: "UNDER_REVIEW" });
      (prisma.mission.update as jest.Mock).mockResolvedValue({ ...mockMission, status: "APPROVED" });

      const result = await missionService.transition("mission-1", "APPROVED", "cmd-1", "COMMANDER");
      expect(result.status).toBe("APPROVED");
      expect(prisma.mission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ approvedById: "cmd-1" }),
        }),
      );
    });

    it("allows COMMANDER to reject with comments", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ ...mockMission, status: "UNDER_REVIEW" });
      (prisma.mission.update as jest.Mock).mockResolvedValue({ ...mockMission, status: "REJECTED" });

      await missionService.transition("mission-1", "REJECTED", "cmd-1", "COMMANDER", "Needs more detail");

      expect(prisma.mission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "REJECTED",
            commanderComments: "Needs more detail",
          }),
        }),
      );
    });

    it("rejects DRAFT -> APPROVED (invalid transition)", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockMission);

      await expect(
        missionService.transition("mission-1", "APPROVED", "cmd-1", "COMMANDER"),
      ).rejects.toThrow("Cannot transition from DRAFT to APPROVED");
    });

    it("rejects DRAFT -> EXECUTING (invalid transition)", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockMission);

      await expect(
        missionService.transition("mission-1", "EXECUTING", "user-1", "PLANNER"),
      ).rejects.toThrow("Cannot transition from DRAFT to EXECUTING");
    });

    it("rejects DEBRIEFED -> any (terminal state)", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ ...mockMission, status: "DEBRIEFED" });

      await expect(
        missionService.transition("mission-1", "DRAFT", "user-1", "PLANNER"),
      ).rejects.toThrow("Cannot transition from DEBRIEFED to DRAFT");
    });

    it("rejects non-COMMANDER trying to approve", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ ...mockMission, status: "UNDER_REVIEW" });

      await expect(
        missionService.transition("mission-1", "APPROVED", "user-1", "PLANNER"),
      ).rejects.toThrow("Only COMMANDER can set status to APPROVED");
    });

    it("rejects non-COMMANDER trying to reject", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ ...mockMission, status: "UNDER_REVIEW" });

      await expect(
        missionService.transition("mission-1", "REJECTED", "user-1", "PILOT"),
      ).rejects.toThrow("Only COMMANDER can set status to REJECTED");
    });

    it("throws NotFoundError for non-existent mission", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        missionService.transition("bad-id", "PLANNED", "user-1", "PLANNER"),
      ).rejects.toThrow("Mission not found");
    });

    it("allows REJECTED -> DRAFT transition", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ ...mockMission, status: "REJECTED" });
      (prisma.mission.update as jest.Mock).mockResolvedValue({ ...mockMission, status: "DRAFT" });

      const result = await missionService.transition("mission-1", "DRAFT", "user-1", "PLANNER");
      expect(result.status).toBe("DRAFT");
    });

    it("allows full lifecycle: APPROVED -> BRIEFED -> EXECUTING -> DEBRIEFED", async () => {
      // APPROVED -> BRIEFED
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ ...mockMission, status: "APPROVED" });
      (prisma.mission.update as jest.Mock).mockResolvedValue({ ...mockMission, status: "BRIEFED" });
      let result = await missionService.transition("mission-1", "BRIEFED", "user-1", "PLANNER");
      expect(result.status).toBe("BRIEFED");

      // BRIEFED -> EXECUTING
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ ...mockMission, status: "BRIEFED" });
      (prisma.mission.update as jest.Mock).mockResolvedValue({ ...mockMission, status: "EXECUTING" });
      result = await missionService.transition("mission-1", "EXECUTING", "user-1", "PLANNER");
      expect(result.status).toBe("EXECUTING");

      // EXECUTING -> DEBRIEFED
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ ...mockMission, status: "EXECUTING" });
      (prisma.mission.update as jest.Mock).mockResolvedValue({ ...mockMission, status: "DEBRIEFED" });
      result = await missionService.transition("mission-1", "DEBRIEFED", "user-1", "PLANNER");
      expect(result.status).toBe("DEBRIEFED");
    });
  });
});
