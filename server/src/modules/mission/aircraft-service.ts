import { prisma } from "../../infra/database";
import { NotFoundError, ValidationError } from "../../shared/errors";
import { emitMissionUpdate } from "../../infra/socket";

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
    const aircraft = await prisma.aircraft.create({
      data: { missionId, type: input.type, tailNumber: input.tailNumber, callsign: input.callsign },
    });
    try { emitMissionUpdate(missionId, "aircraft:changed", { missionId }); } catch {}
    return aircraft;
  },

  async removeAircraft(id: string) {
    const aircraft = await prisma.aircraft.findUnique({ where: { id } });
    if (!aircraft) throw new NotFoundError("Aircraft");
    const missionId = aircraft.missionId;
    await prisma.aircraft.delete({ where: { id } });
    try { emitMissionUpdate(missionId, "aircraft:changed", { missionId }); } catch {}
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
    const crew = await prisma.crewMember.create({
      data: { missionId, name: input.name, role: input.role, aircraftId: input.aircraftId || null },
    });
    try { emitMissionUpdate(missionId, "aircraft:changed", { missionId }); } catch {}
    return crew;
  },

  async removeCrew(id: string) {
    const crew = await prisma.crewMember.findUnique({ where: { id } });
    if (!crew) throw new NotFoundError("Crew member");
    const missionId = crew.missionId;
    await prisma.crewMember.delete({ where: { id } });
    try { emitMissionUpdate(missionId, "aircraft:changed", { missionId }); } catch {}
  },

  async listCrew(missionId: string) {
    return prisma.crewMember.findMany({ where: { missionId } });
  },
};
