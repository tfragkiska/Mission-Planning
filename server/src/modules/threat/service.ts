import { ThreatCategory, Lethality } from "@prisma/client";
import { prisma } from "../../infra/database";
import { NotFoundError } from "../../shared/errors";

interface CreateThreatInput {
  name: string;
  category: ThreatCategory | string;
  lat: number;
  lon: number;
  rangeNm: number;
  lethality: Lethality | string;
  minAltitude?: number;
  maxAltitude?: number;
  active?: boolean;
  notes?: string;
}

export const threatService = {
  async create(input: CreateThreatInput) {
    return prisma.threat.create({
      data: {
        name: input.name,
        category: input.category as ThreatCategory,
        lat: input.lat,
        lon: input.lon,
        rangeNm: input.rangeNm,
        lethality: input.lethality as Lethality,
        minAltitude: input.minAltitude,
        maxAltitude: input.maxAltitude,
        active: input.active ?? true,
        notes: input.notes,
      },
    });
  },

  async list(filters?: { active?: boolean; category?: ThreatCategory }) {
    return prisma.threat.findMany({
      where: filters,
      orderBy: { name: "asc" },
    });
  },

  async getById(id: string) {
    const threat = await prisma.threat.findUnique({ where: { id } });
    if (!threat) throw new NotFoundError("Threat");
    return threat;
  },

  async update(id: string, data: Partial<CreateThreatInput>) {
    const threat = await prisma.threat.findUnique({ where: { id } });
    if (!threat) throw new NotFoundError("Threat");
    return prisma.threat.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category && { category: data.category as ThreatCategory }),
        ...(data.lat !== undefined && { lat: data.lat }),
        ...(data.lon !== undefined && { lon: data.lon }),
        ...(data.rangeNm !== undefined && { rangeNm: data.rangeNm }),
        ...(data.lethality && { lethality: data.lethality as Lethality }),
        ...(data.minAltitude !== undefined && { minAltitude: data.minAltitude }),
        ...(data.maxAltitude !== undefined && { maxAltitude: data.maxAltitude }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  },

  async delete(id: string) {
    const threat = await prisma.threat.findUnique({ where: { id } });
    if (!threat) throw new NotFoundError("Threat");
    await prisma.threat.delete({ where: { id } });
  },

  async addToMission(missionId: string, threatId: string, notes?: string) {
    return prisma.missionThreat.create({
      data: { missionId, threatId, notes },
      include: { threat: true },
    });
  },

  async removeFromMission(missionId: string, threatId: string) {
    await prisma.missionThreat.delete({
      where: { missionId_threatId: { missionId, threatId } },
    });
  },

  async listByMission(missionId: string) {
    const missionThreats = await prisma.missionThreat.findMany({
      where: { missionId },
      include: { threat: true },
    });
    return missionThreats.map((mt) => ({ ...mt.threat, notes: mt.notes }));
  },

  async findThreatsNearRoute(missionId: string, bufferNm: number = 5) {
    // Uses PostGIS to find threats whose envelopes intersect with the mission route
    const result = await prisma.$queryRaw`
      SELECT t.*, ST_Distance(
        t.geom::geography,
        ST_MakeLine(
          ARRAY(SELECT geom FROM waypoints WHERE mission_id = ${missionId} ORDER BY sequence_order)
        )::geography
      ) / 1852.0 as distance_nm
      FROM threats t
      WHERE t.active = true
      AND ST_DWithin(
        t.geom::geography,
        ST_MakeLine(
          ARRAY(SELECT geom FROM waypoints WHERE mission_id = ${missionId} ORDER BY sequence_order)
        )::geography,
        ${(bufferNm + 50) * 1852}
      )
      ORDER BY distance_nm ASC
    `;
    return result;
  },
};
