import { deconflictionService } from "./service";
import { prisma } from "../../infra/database";

jest.mock("../../infra/database", () => ({
  prisma: {
    mission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    deconflictionResult: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    aircraft: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock("../../infra/socket", () => ({
  emitMissionUpdate: jest.fn(),
}));

// Helper: build a mission fixture
function buildMission(overrides: Record<string, unknown> = {}) {
  return {
    id: "m-1",
    name: "Test Mission",
    status: "PLANNED",
    waypoints: [],
    aircraft: [],
    crewMembers: [],
    scheduledStart: null,
    scheduledEnd: null,
    ...overrides,
  };
}

describe("deconflictionService", () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── runCheck ───────────────────────────────────────────────────

  describe("runCheck", () => {
    it("throws NotFoundError when mission does not exist", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(deconflictionService.runCheck("bad-id")).rejects.toThrow("Mission not found");
    });

    it("clears previous results before checking", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(buildMission());
      (prisma.deconflictionResult.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.deconflictionResult.create as jest.Mock).mockImplementation(
        ({ data }: any) => Promise.resolve({ id: "dr-x", ...data }),
      );

      await deconflictionService.runCheck("m-1");

      expect(prisma.deconflictionResult.deleteMany).toHaveBeenCalledWith({
        where: { missionId: "m-1" },
      });
    });

    it("flags missing waypoints as WARNING", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(
        buildMission({ waypoints: [], scheduledStart: null, scheduledEnd: null }),
      );
      (prisma.deconflictionResult.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.deconflictionResult.create as jest.Mock).mockImplementation(
        ({ data }: any) => Promise.resolve({ id: "dr-1", ...data }),
      );

      const results = await deconflictionService.runCheck("m-1");
      const waypointWarning = results.find((r: any) => r.description.includes("no waypoints"));
      expect(waypointWarning).toBeDefined();
      expect(waypointWarning!.severity).toBe("WARNING");
      expect(waypointWarning!.conflictType).toBe("AIRSPACE");
    });

    it("flags missing schedule as TIMING WARNING", async () => {
      const wp = [{ id: "w1" }, { id: "w2" }];
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(
        buildMission({ waypoints: wp, scheduledStart: null, scheduledEnd: null }),
      );
      (prisma.deconflictionResult.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
      (prisma.deconflictionResult.create as jest.Mock).mockImplementation(
        ({ data }: any) => Promise.resolve({ id: "dr-2", ...data }),
      );

      const results = await deconflictionService.runCheck("m-1");
      const timingWarning = results.find((r: any) => r.description.includes("no scheduled"));
      expect(timingWarning).toBeDefined();
      expect(timingWarning!.conflictType).toBe("TIMING");
    });

    it("detects airspace conflicts with overlapping missions", async () => {
      const start = new Date("2026-03-10T08:00:00Z");
      const end = new Date("2026-03-10T10:00:00Z");
      const wp = [{ id: "w1" }, { id: "w2" }];

      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(
        buildMission({ waypoints: wp, scheduledStart: start, scheduledEnd: end }),
      );
      (prisma.deconflictionResult.deleteMany as jest.Mock).mockResolvedValue({});

      // Overlapping mission with intersecting route
      (prisma.mission.findMany as jest.Mock).mockResolvedValue([
        {
          id: "m-2",
          name: "Other Mission",
          waypoints: [{ id: "w3" }, { id: "w4" }],
        },
      ]);

      // PostGIS returns intersection = true
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ intersects: true }]);
      // Threat proximity check returns empty
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);
      // Restricted airspace check returns empty
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);

      (prisma.deconflictionResult.create as jest.Mock).mockImplementation(
        ({ data }: any) => Promise.resolve({ id: "dr-3", ...data }),
      );

      const results = await deconflictionService.runCheck("m-1");
      const airspaceConflict = results.find(
        (r: any) => r.conflictType === "AIRSPACE" && r.description.includes("Other Mission"),
      );
      expect(airspaceConflict).toBeDefined();
      expect(airspaceConflict!.severity).toBe("CRITICAL");
    });

    it("does not flag airspace when routes do not intersect", async () => {
      const start = new Date("2026-03-10T08:00:00Z");
      const end = new Date("2026-03-10T10:00:00Z");
      const wp = [{ id: "w1" }, { id: "w2" }];

      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(
        buildMission({ waypoints: wp, scheduledStart: start, scheduledEnd: end }),
      );
      (prisma.deconflictionResult.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.mission.findMany as jest.Mock).mockResolvedValue([
        { id: "m-2", name: "Far Mission", waypoints: [{ id: "w3" }, { id: "w4" }] },
      ]);

      // No intersection
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ intersects: false }]);
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);

      (prisma.deconflictionResult.create as jest.Mock).mockImplementation(
        ({ data }: any) => Promise.resolve({ id: "dr-4", ...data }),
      );

      const results = await deconflictionService.runCheck("m-1");
      const airspaceConflict = results.find(
        (r: any) => r.conflictType === "AIRSPACE" && r.description.includes("Far Mission"),
      );
      expect(airspaceConflict).toBeUndefined();
    });

    it("skips airspace check when overlapping mission has fewer than 2 waypoints", async () => {
      const start = new Date("2026-03-10T08:00:00Z");
      const end = new Date("2026-03-10T10:00:00Z");
      const wp = [{ id: "w1" }, { id: "w2" }];

      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(
        buildMission({ waypoints: wp, scheduledStart: start, scheduledEnd: end }),
      );
      (prisma.deconflictionResult.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.mission.findMany as jest.Mock).mockResolvedValue([
        { id: "m-2", name: "No Route", waypoints: [{ id: "w3" }] },
      ]);

      // Only threat + restricted airspace queries (no intersection query for the single-wp mission)
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
      (prisma.deconflictionResult.create as jest.Mock).mockImplementation(
        ({ data }: any) => Promise.resolve({ id: "dr-5", ...data }),
      );

      const results = await deconflictionService.runCheck("m-1");
      // The $queryRaw should only be called for threats + restricted airspace, not for intersection
      const airspaceConflict = results.find(
        (r: any) => r.description.includes("No Route"),
      );
      expect(airspaceConflict).toBeUndefined();
    });

    it("detects resource conflicts (double-booked aircraft)", async () => {
      const start = new Date("2026-03-10T08:00:00Z");
      const end = new Date("2026-03-10T10:00:00Z");

      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(
        buildMission({
          waypoints: [],
          scheduledStart: start,
          scheduledEnd: end,
          aircraft: [{ tailNumber: "AF-100", callsign: "Viper 1" }],
        }),
      );
      (prisma.deconflictionResult.deleteMany as jest.Mock).mockResolvedValue({});

      (prisma.aircraft.findMany as jest.Mock).mockResolvedValue([
        { tailNumber: "AF-100", mission: { id: "m-2", name: "Conflicting" } },
      ]);

      (prisma.deconflictionResult.create as jest.Mock).mockImplementation(
        ({ data }: any) => Promise.resolve({ id: "dr-6", ...data }),
      );

      const results = await deconflictionService.runCheck("m-1");
      const resourceConflict = results.find((r: any) => r.conflictType === "RESOURCE");
      expect(resourceConflict).toBeDefined();
      expect(resourceConflict!.severity).toBe("CRITICAL");
      expect(resourceConflict!.description).toContain("AF-100");
    });

    it("detects threat proximity within 5 NM as conflict", async () => {
      const start = new Date("2026-03-10T08:00:00Z");
      const end = new Date("2026-03-10T10:00:00Z");
      const wp = [{ id: "w1" }, { id: "w2" }];

      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(
        buildMission({ waypoints: wp, scheduledStart: start, scheduledEnd: end }),
      );
      (prisma.deconflictionResult.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.mission.findMany as jest.Mock).mockResolvedValue([]);

      // Threat proximity
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([{ name: "SA-6 Battery", distance_nm: 3.2, lethality: "HIGH" }])
        .mockResolvedValueOnce([]);

      (prisma.deconflictionResult.create as jest.Mock).mockImplementation(
        ({ data }: any) => Promise.resolve({ id: "dr-7", ...data }),
      );

      const results = await deconflictionService.runCheck("m-1");
      const threatConflict = results.find((r: any) => r.description.includes("SA-6 Battery"));
      expect(threatConflict).toBeDefined();
      expect(threatConflict!.severity).toBe("CRITICAL");
    });

    it("treats LOW lethality threat within 5 NM as WARNING", async () => {
      const start = new Date("2026-03-10T08:00:00Z");
      const end = new Date("2026-03-10T10:00:00Z");
      const wp = [{ id: "w1" }, { id: "w2" }];

      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(
        buildMission({ waypoints: wp, scheduledStart: start, scheduledEnd: end }),
      );
      (prisma.deconflictionResult.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.mission.findMany as jest.Mock).mockResolvedValue([]);

      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([{ name: "MANPAD", distance_nm: 2.0, lethality: "LOW" }])
        .mockResolvedValueOnce([]);

      (prisma.deconflictionResult.create as jest.Mock).mockImplementation(
        ({ data }: any) => Promise.resolve({ id: "dr-8", ...data }),
      );

      const results = await deconflictionService.runCheck("m-1");
      const threatConflict = results.find((r: any) => r.description.includes("MANPAD"));
      expect(threatConflict).toBeDefined();
      expect(threatConflict!.severity).toBe("WARNING");
    });

    it("ignores threats beyond 5 NM from route", async () => {
      const start = new Date("2026-03-10T08:00:00Z");
      const end = new Date("2026-03-10T10:00:00Z");
      const wp = [{ id: "w1" }, { id: "w2" }];

      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(
        buildMission({ waypoints: wp, scheduledStart: start, scheduledEnd: end }),
      );
      (prisma.deconflictionResult.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.mission.findMany as jest.Mock).mockResolvedValue([]);

      // Threat at 10 NM — beyond the 5 NM threshold
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([{ name: "Far SAM", distance_nm: 10.0, lethality: "HIGH" }])
        .mockResolvedValueOnce([]);

      (prisma.deconflictionResult.create as jest.Mock).mockImplementation(
        ({ data }: any) => Promise.resolve({ id: "dr-9", ...data }),
      );

      const results = await deconflictionService.runCheck("m-1");
      const threatConflict = results.find((r: any) => r.description.includes("Far SAM"));
      expect(threatConflict).toBeUndefined();
    });

    it("detects restricted airspace violations", async () => {
      const start = new Date("2026-03-10T08:00:00Z");
      const end = new Date("2026-03-10T10:00:00Z");
      const wp = [{ id: "w1" }, { id: "w2" }];

      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(
        buildMission({ waypoints: wp, scheduledStart: start, scheduledEnd: end }),
      );
      (prisma.deconflictionResult.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.mission.findMany as jest.Mock).mockResolvedValue([]);

      // No threats
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ name: "R-2508 Complex", type: "RESTRICTED" }]);

      (prisma.deconflictionResult.create as jest.Mock).mockImplementation(
        ({ data }: any) => Promise.resolve({ id: "dr-10", ...data }),
      );

      const results = await deconflictionService.runCheck("m-1");
      const airspace = results.find((r: any) => r.conflictType === "RESTRICTED_AIRSPACE");
      expect(airspace).toBeDefined();
      expect(airspace!.description).toContain("R-2508 Complex");
    });

    it("marks PROHIBITED airspace as CRITICAL severity", async () => {
      const wp = [{ id: "w1" }, { id: "w2" }];
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(
        buildMission({
          waypoints: wp,
          scheduledStart: new Date("2026-03-10T08:00:00Z"),
          scheduledEnd: new Date("2026-03-10T10:00:00Z"),
        }),
      );
      (prisma.deconflictionResult.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.mission.findMany as jest.Mock).mockResolvedValue([]);

      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ name: "P-56 White House", type: "PROHIBITED" }]);

      (prisma.deconflictionResult.create as jest.Mock).mockImplementation(
        ({ data }: any) => Promise.resolve({ id: "dr-11", ...data }),
      );

      const results = await deconflictionService.runCheck("m-1");
      const prohibited = results.find((r: any) => r.description.includes("P-56"));
      expect(prohibited).toBeDefined();
      expect(prohibited!.severity).toBe("CRITICAL");
    });

    it("returns empty array when mission is clean", async () => {
      const wp = [{ id: "w1" }, { id: "w2" }];
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(
        buildMission({
          waypoints: wp,
          scheduledStart: new Date("2026-03-10T08:00:00Z"),
          scheduledEnd: new Date("2026-03-10T10:00:00Z"),
        }),
      );
      (prisma.deconflictionResult.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.mission.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const results = await deconflictionService.runCheck("m-1");
      expect(results).toEqual([]);
      expect(prisma.deconflictionResult.create).not.toHaveBeenCalled();
    });
  });

  // ─── listByMission ─────────────────────────────────────────────

  describe("listByMission", () => {
    it("returns results ordered by severity then createdAt", async () => {
      const mockResults = [
        { id: "dr-1", severity: "CRITICAL" },
        { id: "dr-2", severity: "WARNING" },
      ];
      (prisma.deconflictionResult.findMany as jest.Mock).mockResolvedValue(mockResults);

      const results = await deconflictionService.listByMission("m-1");
      expect(results).toEqual(mockResults);
      expect(prisma.deconflictionResult.findMany).toHaveBeenCalledWith({
        where: { missionId: "m-1" },
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      });
    });

    it("returns empty array when no conflicts exist", async () => {
      (prisma.deconflictionResult.findMany as jest.Mock).mockResolvedValue([]);
      const results = await deconflictionService.listByMission("m-1");
      expect(results).toEqual([]);
    });
  });

  // ─── resolve ────────────────────────────────────────────────────

  describe("resolve", () => {
    it("marks a conflict as resolved with user info", async () => {
      (prisma.deconflictionResult.findUnique as jest.Mock).mockResolvedValue({
        id: "dr-1",
        missionId: "m-1",
      });
      const resolved = {
        id: "dr-1",
        missionId: "m-1",
        resolution: "RESOLVED",
        resolvedBy: "user-1",
        resolvedAt: expect.any(Date),
      };
      (prisma.deconflictionResult.update as jest.Mock).mockResolvedValue(resolved);

      const result = await deconflictionService.resolve("dr-1", "user-1");
      expect(result.resolution).toBe("RESOLVED");
      expect(prisma.deconflictionResult.update).toHaveBeenCalledWith({
        where: { id: "dr-1" },
        data: {
          resolution: "RESOLVED",
          resolvedBy: "user-1",
          resolvedAt: expect.any(Date),
        },
      });
    });

    it("throws NotFoundError for non-existent result", async () => {
      (prisma.deconflictionResult.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(deconflictionService.resolve("bad-id", "user-1")).rejects.toThrow(
        "Deconfliction result not found",
      );
    });
  });

  // ─── hasUnresolvedCritical ──────────────────────────────────────

  describe("hasUnresolvedCritical", () => {
    it("returns true when critical unresolved conflicts exist", async () => {
      (prisma.deconflictionResult.count as jest.Mock).mockResolvedValue(2);
      expect(await deconflictionService.hasUnresolvedCritical("m-1")).toBe(true);
    });

    it("returns false when count is zero", async () => {
      (prisma.deconflictionResult.count as jest.Mock).mockResolvedValue(0);
      expect(await deconflictionService.hasUnresolvedCritical("m-1")).toBe(false);
    });

    it("queries with correct filters", async () => {
      (prisma.deconflictionResult.count as jest.Mock).mockResolvedValue(0);
      await deconflictionService.hasUnresolvedCritical("m-1");
      expect(prisma.deconflictionResult.count).toHaveBeenCalledWith({
        where: {
          missionId: "m-1",
          severity: "CRITICAL",
          resolution: "UNRESOLVED",
        },
      });
    });
  });
});
