import { Prisma } from "@prisma/client";
import { prisma } from "../../infra/database";

interface LogActionParams {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

interface GetAuditLogsParams {
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export const auditService = {
  async logAction({
    userId,
    action,
    entityType,
    entityId,
    details,
    ipAddress,
  }: LogActionParams) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId: entityId ?? null,
          details: (details ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          ipAddress: ipAddress ?? null,
        },
      });
    } catch {
      // Audit logging is best-effort; never fail the primary operation
      console.error("Failed to write audit log", { action, entityType, entityId });
    }
  },

  async getAuditLogs({
    userId,
    entityType,
    entityId,
    action,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  }: GetAuditLogsParams) {
    const where: Prisma.AuditLogWhereInput = {};

    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, limit, offset };
  },

  async getAuditLogsForMission(missionId: string) {
    return prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: "MISSION", entityId: missionId },
          {
            entityType: { in: ["WAYPOINT", "THREAT", "AIRCRAFT", "CREW"] },
            details: { path: ["missionId"], equals: missionId },
          },
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
