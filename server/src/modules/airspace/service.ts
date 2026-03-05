import { AirspaceType } from "@prisma/client";
import { prisma } from "../../infra/database";
import { NotFoundError } from "../../shared/errors";

interface CreateAirspaceInput {
  name: string;
  type: AirspaceType | string;
  minAltitude?: number;
  maxAltitude?: number;
  active?: boolean;
  coordinates: number[][]; // Array of [lon, lat] pairs
  notes?: string;
}

export const airspaceService = {
  async create(input: CreateAirspaceInput) {
    // Ensure polygon is closed
    const coords = [...input.coordinates];
    if (coords.length > 0 && (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1])) {
      coords.push([...coords[0]]);
    }
    return prisma.airspace.create({
      data: {
        name: input.name,
        type: input.type as AirspaceType,
        minAltitude: input.minAltitude,
        maxAltitude: input.maxAltitude,
        active: input.active ?? true,
        coordinates: coords,
        notes: input.notes,
      },
    });
  },

  async list(filters?: { active?: boolean; type?: AirspaceType }) {
    return prisma.airspace.findMany({
      where: filters,
      orderBy: { name: "asc" },
    });
  },

  async getById(id: string) {
    const airspace = await prisma.airspace.findUnique({ where: { id } });
    if (!airspace) throw new NotFoundError("Airspace");
    return airspace;
  },

  async update(id: string, data: Partial<CreateAirspaceInput>) {
    const airspace = await prisma.airspace.findUnique({ where: { id } });
    if (!airspace) throw new NotFoundError("Airspace");

    let coords = data.coordinates;
    if (coords && coords.length > 0) {
      if (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1]) {
        coords = [...coords, [...coords[0]]];
      }
    }

    return prisma.airspace.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type && { type: data.type as AirspaceType }),
        ...(data.minAltitude !== undefined && { minAltitude: data.minAltitude }),
        ...(data.maxAltitude !== undefined && { maxAltitude: data.maxAltitude }),
        ...(data.active !== undefined && { active: data.active }),
        ...(coords && { coordinates: coords }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  },

  async delete(id: string) {
    const airspace = await prisma.airspace.findUnique({ where: { id } });
    if (!airspace) throw new NotFoundError("Airspace");
    await prisma.airspace.delete({ where: { id } });
  },

  async findAirspacesAlongRoute(missionId: string) {
    return prisma.$queryRaw`
      SELECT a.id, a.name, a.type, a.min_altitude, a.max_altitude, a.coordinates, a.notes
      FROM airspaces a
      WHERE a.active = true
      AND ST_Intersects(
        a.geom,
        ST_Buffer(
          ST_MakeLine(ARRAY(SELECT geom FROM waypoints WHERE mission_id = ${missionId} ORDER BY sequence_order))::geography,
          1000
        )::geometry
      )
    `;
  },
};
