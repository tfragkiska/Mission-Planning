import { WaypointType } from "@prisma/client";
import { prisma } from "../../infra/database";
import { NotFoundError, ValidationError } from "../../shared/errors";
import { emitMissionUpdate } from "../../infra/socket";

interface CreateWaypointInput {
  name?: string;
  lat: number;
  lon: number;
  altitude?: number;
  speed?: number;
  timeOnTarget?: string;
  type?: WaypointType | string;
}

interface UpdateWaypointInput extends Partial<CreateWaypointInput> {
  sequenceOrder?: number;
}

export const waypointService = {
  async create(missionId: string, input: CreateWaypointInput) {
    const mission = await prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) throw new NotFoundError("Mission");
    if (mission.status !== "DRAFT") {
      throw new ValidationError("Can only add waypoints to DRAFT missions");
    }

    const count = await prisma.waypoint.count({ where: { missionId } });

    const waypoint = await prisma.waypoint.create({
      data: {
        missionId,
        sequenceOrder: count + 1,
        name: input.name,
        lat: input.lat,
        lon: input.lon,
        altitude: input.altitude,
        speed: input.speed,
        timeOnTarget: input.timeOnTarget ? new Date(input.timeOnTarget) : null,
        type: (input.type as WaypointType) || WaypointType.WAYPOINT,
      },
    });
    try { emitMissionUpdate(missionId, "waypoints:changed", { missionId }); } catch {}
    return waypoint;
  },

  async listByMission(missionId: string) {
    return prisma.waypoint.findMany({
      where: { missionId },
      orderBy: { sequenceOrder: "asc" },
    });
  },

  async update(id: string, input: UpdateWaypointInput) {
    const waypoint = await prisma.waypoint.findUnique({ where: { id } });
    if (!waypoint) throw new NotFoundError("Waypoint");

    const updated = await prisma.waypoint.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.lat !== undefined && { lat: input.lat }),
        ...(input.lon !== undefined && { lon: input.lon }),
        ...(input.altitude !== undefined && { altitude: input.altitude }),
        ...(input.speed !== undefined && { speed: input.speed }),
        ...(input.type && { type: input.type as WaypointType }),
        ...(input.sequenceOrder !== undefined && { sequenceOrder: input.sequenceOrder }),
      },
    });
    try { emitMissionUpdate(waypoint.missionId, "waypoints:changed", { missionId: waypoint.missionId }); } catch {}
    return updated;
  },

  async delete(id: string) {
    const waypoint = await prisma.waypoint.findUnique({ where: { id } });
    if (!waypoint) throw new NotFoundError("Waypoint");
    await prisma.waypoint.delete({ where: { id } });
    try { emitMissionUpdate(waypoint.missionId, "waypoints:changed", { missionId: waypoint.missionId }); } catch {}
  },

  async reorder(missionId: string, waypointIds: string[]) {
    const waypoints = await prisma.waypoint.findMany({ where: { missionId } });
    if (waypoints.length !== waypointIds.length) {
      throw new ValidationError("Must include all waypoint IDs");
    }

    await prisma.$transaction(
      waypointIds.map((id, index) =>
        prisma.waypoint.update({
          where: { id },
          data: { sequenceOrder: index + 1 },
        }),
      ),
    );

    return waypointService.listByMission(missionId);
  },
};
