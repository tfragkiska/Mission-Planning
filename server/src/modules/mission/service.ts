import { MissionStatus, MissionType, Priority, Role } from "@prisma/client";
import { prisma } from "../../infra/database";
import { NotFoundError, ForbiddenError, ValidationError } from "../../shared/errors";
import { versionService } from "./version-service";

const VALID_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  DRAFT: [MissionStatus.PLANNED],
  PLANNED: [MissionStatus.UNDER_REVIEW, MissionStatus.DRAFT],
  UNDER_REVIEW: [MissionStatus.APPROVED, MissionStatus.REJECTED],
  APPROVED: [MissionStatus.BRIEFED],
  REJECTED: [MissionStatus.DRAFT],
  BRIEFED: [MissionStatus.EXECUTING],
  EXECUTING: [MissionStatus.DEBRIEFED],
  DEBRIEFED: [],
};

const TRANSITION_ROLE_REQUIREMENTS: Partial<Record<MissionStatus, Role[]>> = {
  APPROVED: [Role.COMMANDER],
  REJECTED: [Role.COMMANDER],
};

const missionIncludes = {
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  approvedBy: { select: { id: true, name: true, email: true, role: true } },
  aircraft: true,
  crewMembers: true,
  waypoints: { orderBy: { sequenceOrder: "asc" as const } },
};

interface CreateMissionInput {
  name: string;
  type: MissionType | string;
  priority?: Priority | string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export const missionService = {
  async create(input: CreateMissionInput, userId: string) {
    const mission = await prisma.mission.create({
      data: {
        name: input.name,
        type: input.type as MissionType,
        priority: (input.priority as Priority) || Priority.MEDIUM,
        status: MissionStatus.DRAFT,
        scheduledStart: input.scheduledStart ? new Date(input.scheduledStart) : null,
        scheduledEnd: input.scheduledEnd ? new Date(input.scheduledEnd) : null,
        createdById: userId,
      },
      include: missionIncludes,
    });
    try {
      await versionService.createSnapshot(mission.id, userId, "created");
    } catch {
      // Version tracking is best-effort, don't fail the operation
    }
    return mission;
  },

  async list(filters?: { status?: MissionStatus; createdById?: string }) {
    return prisma.mission.findMany({
      where: filters,
      include: missionIncludes,
      orderBy: { updatedAt: "desc" },
    });
  },

  async getById(id: string) {
    const mission = await prisma.mission.findUnique({
      where: { id },
      include: missionIncludes,
    });
    if (!mission) throw new NotFoundError("Mission");
    return mission;
  },

  async update(id: string, data: Partial<CreateMissionInput>, userId: string) {
    const mission = await prisma.mission.findUnique({ where: { id } });
    if (!mission) throw new NotFoundError("Mission");
    if (mission.createdById !== userId) {
      throw new ForbiddenError("Only the mission creator can edit");
    }
    if (mission.status !== MissionStatus.DRAFT) {
      throw new ValidationError("Can only edit missions in DRAFT status");
    }

    const updated = await prisma.mission.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type as MissionType }),
        ...(data.priority && { priority: data.priority as Priority }),
        ...(data.scheduledStart && { scheduledStart: new Date(data.scheduledStart) }),
        ...(data.scheduledEnd && { scheduledEnd: new Date(data.scheduledEnd) }),
      },
      include: missionIncludes,
    });
    try {
      await versionService.createSnapshot(id, userId, "updated");
    } catch {
      // Version tracking is best-effort, don't fail the operation
    }
    return updated;
  },

  async delete(id: string, userId: string) {
    const mission = await prisma.mission.findUnique({ where: { id } });
    if (!mission) throw new NotFoundError("Mission");
    if (mission.createdById !== userId) {
      throw new ForbiddenError("Only the mission creator can delete");
    }
    if (mission.status !== MissionStatus.DRAFT) {
      throw new ValidationError("Can only delete missions in DRAFT status");
    }
    await prisma.mission.delete({ where: { id } });
  },

  async transition(
    id: string,
    targetStatus: MissionStatus | string,
    userId: string,
    userRole: Role | string,
    comments?: string,
  ) {
    const mission = await prisma.mission.findUnique({ where: { id } });
    if (!mission) throw new NotFoundError("Mission");

    const target = targetStatus as MissionStatus;
    const allowed = VALID_TRANSITIONS[mission.status];
    if (!allowed.includes(target)) {
      throw new ValidationError(
        `Cannot transition from ${mission.status} to ${target}`,
      );
    }

    const requiredRoles = TRANSITION_ROLE_REQUIREMENTS[target];
    if (requiredRoles && !requiredRoles.includes(userRole as Role)) {
      throw new ForbiddenError(`Only ${requiredRoles.join("/")} can set status to ${target}`);
    }

    const updateData: Record<string, unknown> = { status: target };
    if (target === MissionStatus.APPROVED) {
      updateData.approvedById = userId;
    }
    if (target === MissionStatus.REJECTED && comments) {
      updateData.commanderComments = comments;
    }

    const transitioned = await prisma.mission.update({
      where: { id },
      data: updateData,
      include: missionIncludes,
    });
    try {
      await versionService.createSnapshot(id, userId, `transition:${target}`);
    } catch {
      // Version tracking is best-effort, don't fail the operation
    }
    return transitioned;
  },
};
