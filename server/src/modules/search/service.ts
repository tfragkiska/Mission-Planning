import { Role } from "@prisma/client";
import { prisma } from "../../infra/database";

type SearchEntityType = "missions" | "waypoints" | "threats" | "users";

interface SearchOptions {
  limit?: number;
  types?: SearchEntityType[];
}

interface ScoredResult<T> {
  item: T;
  score: number;
}

interface SearchResults {
  missions: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    priority: string;
    createdBy: { id: string; name: string };
    score: number;
  }>;
  waypoints: Array<{
    id: string;
    name: string | null;
    lat: number;
    lon: number;
    type: string;
    missionId: string;
    missionName: string;
    score: number;
  }>;
  threats: Array<{
    id: string;
    name: string;
    category: string;
    lethality: string;
    active: boolean;
    score: number;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    score: number;
  }>;
  totalCount: number;
}

function computeRelevanceScore(fieldValue: string, query: string): number {
  const lower = fieldValue.toLowerCase();
  const q = query.toLowerCase();

  if (lower === q) return 100; // exact match
  if (lower.startsWith(q)) return 75; // starts with
  if (lower.includes(q)) return 50; // contains
  return 0;
}

function bestScore(fields: (string | null | undefined)[], query: string): number {
  let best = 0;
  for (const field of fields) {
    if (!field) continue;
    const score = computeRelevanceScore(field, query);
    if (score > best) best = score;
  }
  return best;
}

export const searchService = {
  async globalSearch(
    query: string,
    userId: string,
    userRole: Role,
    options: SearchOptions = {},
  ): Promise<SearchResults> {
    const limit = options.limit ?? 20;
    const types = options.types ?? ["missions", "waypoints", "threats", "users"];
    const q = query.trim();

    if (!q) {
      return { missions: [], waypoints: [], threats: [], users: [], totalCount: 0 };
    }

    const perTypeLimit = Math.max(limit, 50);

    const [missions, waypoints, threats, users] = await Promise.all([
      types.includes("missions") ? this.searchMissions(q, userId, userRole, perTypeLimit) : [],
      types.includes("waypoints") ? this.searchWaypoints(q, userId, userRole, perTypeLimit) : [],
      types.includes("threats") ? this.searchThreats(q, userRole, perTypeLimit) : [],
      types.includes("users") ? this.searchUsers(q, perTypeLimit) : [],
    ]);

    const totalCount = missions.length + waypoints.length + threats.length + users.length;

    return {
      missions: missions.slice(0, limit),
      waypoints: waypoints.slice(0, limit),
      threats: threats.slice(0, limit),
      users: users.slice(0, limit),
      totalCount,
    };
  },

  async searchMissions(query: string, userId: string, userRole: Role, limit: number) {
    const whereClause: Record<string, unknown> = {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { type: { contains: query, mode: "insensitive" } },
        { status: { contains: query, mode: "insensitive" } },
      ],
    };

    // PLANNERs only see their own missions; COMMANDERs see all
    if (userRole === Role.PLANNER) {
      whereClause.createdById = userId;
    } else if (userRole === Role.PILOT) {
      // Pilots see missions they are assigned to (crew match by user name)
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        whereClause.OR = [
          {
            AND: [
              { crewMembers: { some: { name: { equals: user.name, mode: "insensitive" } } } },
              {
                OR: [
                  { name: { contains: query, mode: "insensitive" } },
                  { type: { contains: query, mode: "insensitive" } },
                  { status: { contains: query, mode: "insensitive" } },
                ],
              },
            ],
          },
        ];
      }
    }

    const results = await prisma.mission.findMany({
      where: whereClause,
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    return results
      .map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        status: m.status,
        priority: m.priority,
        createdBy: m.createdBy,
        score: bestScore([m.name, m.type, m.status], query),
      }))
      .sort((a, b) => b.score - a.score);
  },

  async searchWaypoints(query: string, userId: string, userRole: Role, limit: number) {
    const whereClause: Record<string, unknown> = {
      name: { contains: query, mode: "insensitive" },
    };

    // Scope to missions the user can see
    if (userRole === Role.PLANNER) {
      whereClause.mission = { createdById: userId };
    } else if (userRole === Role.PILOT) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        whereClause.mission = {
          crewMembers: { some: { name: { equals: user.name, mode: "insensitive" } } },
        };
      }
    }

    const results = await prisma.waypoint.findMany({
      where: whereClause,
      include: {
        mission: { select: { id: true, name: true } },
      },
      take: limit,
    });

    return results
      .map((w) => ({
        id: w.id,
        name: w.name,
        lat: w.lat,
        lon: w.lon,
        type: w.type,
        missionId: w.missionId,
        missionName: w.mission.name,
        score: bestScore([w.name], query),
      }))
      .sort((a, b) => b.score - a.score);
  },

  async searchThreats(query: string, userRole: Role, limit: number) {
    // All roles can see threats (they are public data)
    const results = await prisma.threat.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { category: { equals: query.toUpperCase() as any } },
        ],
      },
      take: limit,
    });

    return results
      .map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        lethality: t.lethality,
        active: t.active,
        score: bestScore([t.name, t.category], query),
      }))
      .sort((a, b) => b.score - a.score);
  },

  async searchUsers(query: string, limit: number) {
    const results = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      take: limit,
    });

    return results
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        score: bestScore([u.name, u.email], query),
      }))
      .sort((a, b) => b.score - a.score);
  },
};
