import { prisma } from "../../infra/database";
import { NotFoundError } from "../../shared/errors";

export const versionService = {
  async createSnapshot(missionId: string, userId: string, changeType: string) {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        approvedBy: { select: { id: true, name: true, email: true, role: true } },
        aircraft: true,
        crewMembers: true,
        waypoints: { orderBy: { sequenceOrder: "asc" } },
        missionThreats: { include: { threat: true } },
      },
    });
    if (!mission) throw new NotFoundError("Mission");

    // Get next version number
    const lastVersion = await prisma.missionVersion.findFirst({
      where: { missionId },
      orderBy: { version: "desc" },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    return prisma.missionVersion.create({
      data: {
        missionId,
        version: nextVersion,
        snapshot: JSON.parse(JSON.stringify(mission)),
        changedBy: userId,
        changeType,
      },
    });
  },

  async listVersions(missionId: string) {
    return prisma.missionVersion.findMany({
      where: { missionId },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        changedBy: true,
        changeType: true,
        createdAt: true,
      },
    });
  },

  async getVersion(missionId: string, version: number) {
    const v = await prisma.missionVersion.findUnique({
      where: { missionId_version: { missionId, version } },
    });
    if (!v) throw new NotFoundError("Version");
    return v;
  },
};
