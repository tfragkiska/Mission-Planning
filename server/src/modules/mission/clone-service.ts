import { prisma } from "../../infra/database";
import { NotFoundError } from "../../shared/errors";
import { MissionStatus, Priority } from "@prisma/client";

const missionIncludes = {
  aircraft: true,
  crewMembers: true,
  waypoints: { orderBy: { sequenceOrder: "asc" as const } },
  missionThreats: true,
};

export const cloneService = {
  async cloneMission(sourceId: string, userId: string, newName?: string) {
    const source = await prisma.mission.findUnique({
      where: { id: sourceId },
      include: missionIncludes,
    });
    if (!source) throw new NotFoundError("Mission");

    // Create new mission as DRAFT
    const cloned = await prisma.mission.create({
      data: {
        name: newName || `${source.name} (Copy)`,
        type: source.type,
        priority: source.priority,
        status: MissionStatus.DRAFT,
        scheduledStart: source.scheduledStart,
        scheduledEnd: source.scheduledEnd,
        createdById: userId,
        isTemplate: false,
      },
    });

    // Copy waypoints
    if (source.waypoints.length > 0) {
      await prisma.waypoint.createMany({
        data: source.waypoints.map((wp) => ({
          missionId: cloned.id,
          sequenceOrder: wp.sequenceOrder,
          name: wp.name,
          lat: wp.lat,
          lon: wp.lon,
          altitude: wp.altitude,
          speed: wp.speed,
          timeOnTarget: wp.timeOnTarget,
          type: wp.type,
        })),
      });
    }

    // Copy aircraft
    for (const ac of source.aircraft) {
      const newAc = await prisma.aircraft.create({
        data: {
          missionId: cloned.id,
          type: ac.type,
          tailNumber: ac.tailNumber,
          callsign: ac.callsign,
        },
      });

      // Copy crew assigned to this aircraft
      const crew = source.crewMembers.filter((c) => c.aircraftId === ac.id);
      if (crew.length > 0) {
        await prisma.crewMember.createMany({
          data: crew.map((c) => ({
            missionId: cloned.id,
            aircraftId: newAc.id,
            name: c.name,
            role: c.role,
          })),
        });
      }
    }

    // Copy unassigned crew
    const unassignedCrew = source.crewMembers.filter((c) => !c.aircraftId);
    if (unassignedCrew.length > 0) {
      await prisma.crewMember.createMany({
        data: unassignedCrew.map((c) => ({
          missionId: cloned.id,
          name: c.name,
          role: c.role,
        })),
      });
    }

    // Copy threat associations
    if (source.missionThreats.length > 0) {
      await prisma.missionThreat.createMany({
        data: source.missionThreats.map((mt) => ({
          missionId: cloned.id,
          threatId: mt.threatId,
          notes: mt.notes,
        })),
      });
    }

    // Return full cloned mission
    return prisma.mission.findUnique({
      where: { id: cloned.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        approvedBy: { select: { id: true, name: true, email: true, role: true } },
        aircraft: true,
        crewMembers: true,
        waypoints: { orderBy: { sequenceOrder: "asc" } },
        missionThreats: { include: { threat: true } },
      },
    });
  },

  async saveAsTemplate(missionId: string, templateName: string, description?: string) {
    const mission = await prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) throw new NotFoundError("Mission");

    return prisma.mission.update({
      where: { id: missionId },
      data: {
        isTemplate: true,
        templateName,
        templateDescription: description || null,
      },
    });
  },

  async listTemplates() {
    return prisma.mission.findMany({
      where: { isTemplate: true },
      select: {
        id: true,
        name: true,
        templateName: true,
        templateDescription: true,
        type: true,
        priority: true,
        createdBy: { select: { id: true, name: true } },
        _count: { select: { waypoints: true, aircraft: true } },
      },
      orderBy: { templateName: "asc" },
    });
  },

  async createFromTemplate(templateId: string, userId: string, missionName: string) {
    const template = await prisma.mission.findUnique({ where: { id: templateId } });
    if (!template || !template.isTemplate) throw new NotFoundError("Template");
    return this.cloneMission(templateId, userId, missionName);
  },
};
