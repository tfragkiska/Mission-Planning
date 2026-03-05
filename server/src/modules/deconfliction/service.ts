import { ConflictType, ConflictSeverity, ConflictResolution, MissionStatus, Prisma } from "@prisma/client";
import { prisma } from "../../infra/database";
import { NotFoundError, ValidationError } from "../../shared/errors";
import { emitMissionUpdate } from "../../infra/socket";

export const deconflictionService = {
  async runCheck(missionId: string) {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        waypoints: { orderBy: { sequenceOrder: "asc" } },
        aircraft: true,
        crewMembers: true,
      },
    });
    if (!mission) throw new NotFoundError("Mission");

    // Clear previous results for this mission
    await prisma.deconflictionResult.deleteMany({ where: { missionId } });

    const conflicts: Array<{
      conflictType: ConflictType;
      severity: ConflictSeverity;
      description: string;
      details?: Record<string, unknown>;
    }> = [];

    // Check 1: Airspace conflicts with other active missions
    if (mission.waypoints.length >= 2 && mission.scheduledStart && mission.scheduledEnd) {
      const overlappingMissions = await prisma.mission.findMany({
        where: {
          id: { not: missionId },
          status: { in: [MissionStatus.PLANNED, MissionStatus.APPROVED, MissionStatus.BRIEFED, MissionStatus.EXECUTING] },
          scheduledStart: { lt: mission.scheduledEnd },
          scheduledEnd: { gt: mission.scheduledStart },
        },
        include: { waypoints: true },
      });

      for (const other of overlappingMissions) {
        if (other.waypoints.length >= 2) {
          // PostGIS spatial intersection check
          const intersection = await prisma.$queryRaw<Array<{ intersects: boolean }>>`
            SELECT ST_Intersects(
              ST_Buffer(
                ST_MakeLine(ARRAY(SELECT geom FROM waypoints WHERE mission_id = ${missionId} ORDER BY sequence_order))::geography,
                5000  -- 5km buffer
              ),
              ST_Buffer(
                ST_MakeLine(ARRAY(SELECT geom FROM waypoints WHERE mission_id = ${other.id} ORDER BY sequence_order))::geography,
                5000
              )
            ) as intersects
          `;

          if (intersection[0]?.intersects) {
            conflicts.push({
              conflictType: ConflictType.AIRSPACE,
              severity: ConflictSeverity.CRITICAL,
              description: `Airspace conflict with mission "${other.name}" — routes intersect within 5km buffer during overlapping time window`,
              details: { conflictingMissionId: other.id, conflictingMissionName: other.name },
            });
          }
        }
      }
    }

    // Check 2: Resource conflicts (aircraft/crew double-booked)
    if (mission.scheduledStart && mission.scheduledEnd) {
      for (const aircraft of mission.aircraft) {
        const doubleBooked = await prisma.aircraft.findMany({
          where: {
            tailNumber: aircraft.tailNumber,
            mission: {
              id: { not: missionId },
              status: { in: [MissionStatus.PLANNED, MissionStatus.APPROVED, MissionStatus.BRIEFED, MissionStatus.EXECUTING] },
              scheduledStart: { lt: mission.scheduledEnd },
              scheduledEnd: { gt: mission.scheduledStart },
            },
          },
          include: { mission: { select: { id: true, name: true } } },
        });

        for (const conflict of doubleBooked) {
          conflicts.push({
            conflictType: ConflictType.RESOURCE,
            severity: ConflictSeverity.CRITICAL,
            description: `Aircraft ${aircraft.tailNumber} (${aircraft.callsign}) is also assigned to mission "${conflict.mission.name}"`,
            details: { aircraftTailNumber: aircraft.tailNumber, conflictingMissionId: conflict.mission.id },
          });
        }
      }
    }

    // Check 3: Threat proximity warnings
    if (mission.waypoints.length >= 2) {
      const nearbyThreats = await prisma.$queryRaw<Array<{ name: string; distance_nm: number; lethality: string }>>`
        SELECT t.name, t.lethality,
          ST_Distance(
            t.geom::geography,
            ST_MakeLine(ARRAY(SELECT geom FROM waypoints WHERE mission_id = ${missionId} ORDER BY sequence_order))::geography
          ) / 1852.0 as distance_nm
        FROM threats t
        WHERE t.active = true
        AND ST_DWithin(
          t.geom::geography,
          ST_MakeLine(ARRAY(SELECT geom FROM waypoints WHERE mission_id = ${missionId} ORDER BY sequence_order))::geography,
          ${50 * 1852}
        )
        ORDER BY distance_nm ASC
      `;

      for (const threat of nearbyThreats) {
        if (threat.distance_nm < 5) {
          conflicts.push({
            conflictType: ConflictType.AIRSPACE,
            severity: threat.lethality === "CRITICAL" || threat.lethality === "HIGH"
              ? ConflictSeverity.CRITICAL
              : ConflictSeverity.WARNING,
            description: `Route passes within ${threat.distance_nm.toFixed(1)} NM of ${threat.name} (${threat.lethality} lethality)`,
            details: { threatName: threat.name, distanceNm: threat.distance_nm },
          });
        }
      }
    }

    // Check 4: No waypoints warning
    if (mission.waypoints.length === 0) {
      conflicts.push({
        conflictType: ConflictType.AIRSPACE,
        severity: ConflictSeverity.WARNING,
        description: "Mission has no waypoints defined",
      });
    }

    // Check 5: No scheduled time warning
    if (!mission.scheduledStart || !mission.scheduledEnd) {
      conflicts.push({
        conflictType: ConflictType.TIMING,
        severity: ConflictSeverity.WARNING,
        description: "Mission has no scheduled start/end time — cannot check timing conflicts",
      });
    }

    // Save all conflicts
    const results = [];
    for (const conflict of conflicts) {
      const result = await prisma.deconflictionResult.create({
        data: {
          missionId,
          conflictType: conflict.conflictType,
          severity: conflict.severity,
          description: conflict.description,
          details: (conflict.details as Prisma.InputJsonValue) || undefined,
        },
      });
      results.push(result);
    }

    try { emitMissionUpdate(missionId, "deconfliction:changed", { missionId }); } catch {}
    return results;
  },

  async listByMission(missionId: string) {
    return prisma.deconflictionResult.findMany({
      where: { missionId },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    });
  },

  async resolve(id: string, userId: string) {
    const result = await prisma.deconflictionResult.findUnique({ where: { id } });
    if (!result) throw new NotFoundError("Deconfliction result");
    const missionId = result.missionId;
    const updated = await prisma.deconflictionResult.update({
      where: { id },
      data: {
        resolution: ConflictResolution.RESOLVED,
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
    });
    try { emitMissionUpdate(missionId, "deconfliction:changed", { missionId }); } catch {}
    return updated;
  },

  async hasUnresolvedCritical(missionId: string): Promise<boolean> {
    const count = await prisma.deconflictionResult.count({
      where: {
        missionId,
        severity: ConflictSeverity.CRITICAL,
        resolution: ConflictResolution.UNRESOLVED,
      },
    });
    return count > 0;
  },
};
