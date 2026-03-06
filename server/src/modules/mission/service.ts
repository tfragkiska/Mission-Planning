import crypto from "crypto";
import { MissionStatus, MissionType, Priority, Role, Prisma } from "@prisma/client";
import { prisma } from "../../infra/database";
import { NotFoundError, ForbiddenError, ValidationError } from "../../shared/errors";
import { versionService } from "./version-service";
import { emitMissionUpdate, emitActivity } from "../../infra/socket";
import { auditService } from "../audit/service";
import { notificationService } from "../notification/service";

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

// Fire-and-forget notification helper
async function notifyTransition(
  missionName: string,
  missionId: string,
  fromStatus: MissionStatus,
  toStatus: MissionStatus,
  actorId: string,
  createdById: string,
  comments?: string,
) {
  try {
    const statusLabel = toStatus.replace(/_/g, " ");

    // Notify the mission creator about status changes (unless they triggered it)
    if (createdById !== actorId) {
      const typeMap: Partial<Record<MissionStatus, string>> = {
        APPROVED: "APPROVAL",
        REJECTED: "REJECTION",
        UNDER_REVIEW: "REVIEW_REQUESTED",
      };
      const notifType = typeMap[toStatus] || "MISSION_STATUS";
      const message =
        toStatus === MissionStatus.REJECTED && comments
          ? `Mission "${missionName}" was rejected: ${comments}`
          : `Mission "${missionName}" status changed to ${statusLabel}`;

      await notificationService.createNotification({
        userId: createdById,
        type: notifType,
        title: `Mission ${statusLabel}`,
        message,
        missionId,
      });
    }

    // When submitted for review, notify all commanders
    if (toStatus === MissionStatus.UNDER_REVIEW) {
      const commanders = await prisma.user.findMany({ where: { role: Role.COMMANDER } });
      for (const commander of commanders) {
        if (commander.id === actorId) continue;
        await notificationService.createNotification({
          userId: commander.id,
          type: "REVIEW_REQUESTED",
          title: "Review Requested",
          message: `Mission "${missionName}" has been submitted for review`,
          missionId,
        });
      }
    }

    // When approved/briefed, notify assigned crew (pilots)
    if (toStatus === MissionStatus.APPROVED || toStatus === MissionStatus.BRIEFED) {
      const crew = await prisma.crewMember.findMany({ where: { missionId } });
      const pilots = await prisma.user.findMany({ where: { role: Role.PILOT } });
      const crewNames = new Set(crew.map((c) => c.name.toLowerCase()));
      for (const pilot of pilots) {
        if (crewNames.has(pilot.name.toLowerCase()) && pilot.id !== actorId) {
          await notificationService.createNotification({
            userId: pilot.id,
            type: "MISSION_STATUS",
            title: `Mission ${statusLabel}`,
            message: `Mission "${missionName}" you are assigned to is now ${statusLabel}`,
            missionId,
          });
        }
      }
    }
  } catch {
    // Notifications are best-effort
  }
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
    auditService.logAction({
      userId,
      action: "CREATE_MISSION",
      entityType: "MISSION",
      entityId: mission.id,
      details: { name: input.name, type: input.type },
    });
    return mission;
  },

  async list(filters?: { status?: MissionStatus; createdById?: string; assignedTo?: string }) {
    const where: Prisma.MissionWhereInput = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.createdById) where.createdById = filters.createdById;
    if (filters?.assignedTo) {
      // Find the user to match crew by name
      const user = await prisma.user.findUnique({ where: { id: filters.assignedTo } });
      if (user) {
        where.crewMembers = { some: { name: { equals: user.name, mode: "insensitive" } } };
      }
    }
    return prisma.mission.findMany({
      where,
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
    auditService.logAction({
      userId,
      action: "UPDATE_MISSION",
      entityType: "MISSION",
      entityId: id,
      details: { changes: data },
    });
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
    try { emitMissionUpdate(id, "mission:updated", transitioned); } catch {}
    try { emitActivity(id, { type: "status_changed", message: `changed status from ${mission.status} to ${target}`, userId }); } catch {}
    auditService.logAction({
      userId,
      action: "TRANSITION_STATUS",
      entityType: "MISSION",
      entityId: id,
      details: { from: mission.status, to: target, comments },
    });
    // Fire-and-forget notifications for the transition
    notifyTransition(mission.name, id, mission.status, target, userId, mission.createdById, comments);
    return transitioned;
  },

  async enableSharing(missionId: string, userId: string) {
    const mission = await prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) throw new NotFoundError("Mission");
    if (mission.createdById !== userId) {
      // Allow commanders too
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== Role.COMMANDER) {
        throw new ForbiddenError("Only the mission creator or a commander can manage sharing");
      }
    }

    const shareToken = crypto.randomUUID();
    const updated = await prisma.mission.update({
      where: { id: missionId },
      data: { shareToken, shareEnabled: true },
    });

    auditService.logAction({
      userId,
      action: "ENABLE_SHARING",
      entityType: "MISSION",
      entityId: missionId,
      details: { shareToken },
    });

    return { shareToken: updated.shareToken!, shareEnabled: true };
  },

  async disableSharing(missionId: string, userId: string) {
    const mission = await prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) throw new NotFoundError("Mission");
    if (mission.createdById !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== Role.COMMANDER) {
        throw new ForbiddenError("Only the mission creator or a commander can manage sharing");
      }
    }

    await prisma.mission.update({
      where: { id: missionId },
      data: { shareToken: null, shareEnabled: false },
    });

    auditService.logAction({
      userId,
      action: "DISABLE_SHARING",
      entityType: "MISSION",
      entityId: missionId,
      details: {},
    });

    return { shareEnabled: false };
  },

  async getByShareToken(token: string) {
    const mission = await prisma.mission.findUnique({
      where: { shareToken: token },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        waypoints: { orderBy: { sequenceOrder: "asc" as const } },
        missionThreats: { include: { threat: true } },
        weatherReports: true,
        aircraft: true,
        crewMembers: true,
      },
    });
    if (!mission || !mission.shareEnabled) {
      throw new NotFoundError("Shared mission");
    }
    return mission;
  },

  async getShareStatus(missionId: string) {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      select: { shareToken: true, shareEnabled: true },
    });
    if (!mission) throw new NotFoundError("Mission");
    return { shareToken: mission.shareToken, shareEnabled: mission.shareEnabled };
  },
};
