import { prisma } from "../../infra/database";
import { NotFoundError, ValidationError } from "../../shared/errors";

interface CreateAircraftInput {
  type: string;
  tailNumber: string;
  callsign: string;
}

interface CreateCrewInput {
  name: string;
  role: string;
  aircraftId?: string;
}

export const aircraftService = {
  async addAircraft(missionId: string, input: CreateAircraftInput) {
    const mission = await prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) throw new NotFoundError("Mission");
    if (mission.status !== "DRAFT") {
      throw new ValidationError("Can only modify aircraft in DRAFT missions");
    }
    return prisma.aircraft.create({
      data: { missionId, type: input.type, tailNumber: input.tailNumber, callsign: input.callsign },
    });
  },

  async removeAircraft(id: string) {
    const aircraft = await prisma.aircraft.findUnique({ where: { id } });
    if (!aircraft) throw new NotFoundError("Aircraft");
    await prisma.aircraft.delete({ where: { id } });
  },

  async listAircraft(missionId: string) {
    return prisma.aircraft.findMany({ where: { missionId }, include: { crewMembers: true } });
  },

  async addCrew(missionId: string, input: CreateCrewInput) {
    const mission = await prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) throw new NotFoundError("Mission");
    if (mission.status !== "DRAFT") {
      throw new ValidationError("Can only modify crew in DRAFT missions");
    }
    return prisma.crewMember.create({
      data: { missionId, name: input.name, role: input.role, aircraftId: input.aircraftId || null },
    });
  },

  async removeCrew(id: string) {
    const crew = await prisma.crewMember.findUnique({ where: { id } });
    if (!crew) throw new NotFoundError("Crew member");
    await prisma.crewMember.delete({ where: { id } });
  },

  async listCrew(missionId: string) {
    return prisma.crewMember.findMany({ where: { missionId } });
  },
};
