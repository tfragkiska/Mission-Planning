import { weatherService } from "./service";
import { prisma } from "../../infra/database";

jest.mock("../../infra/database", () => ({
  prisma: {
    weatherReport: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("../../infra/socket", () => ({
  emitMissionUpdate: jest.fn(),
}));

const mockReport = {
  id: "wr-1",
  missionId: "m-1",
  stationId: "KLAX",
  type: "METAR",
  rawReport: "KLAX 051853Z 27015KT 10SM FEW025 15/08 A2992",
  temperature: 15,
  windSpeed: 15,
  windDir: 270,
  visibility: 10,
  ceiling: null,
  conditions: null,
  isManual: false,
  observedAt: new Date("2026-03-05T18:53:00Z"),
};

describe("weatherService", () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── addReport ──────────────────────────────────────────────────

  describe("addReport", () => {
    it("creates a weather report with all fields", async () => {
      (prisma.weatherReport.create as jest.Mock).mockResolvedValue(mockReport);

      const result = await weatherService.addReport("m-1", {
        stationId: "KLAX",
        type: "METAR",
        rawReport: "KLAX 051853Z 27015KT 10SM FEW025 15/08 A2992",
        temperature: 15,
        windSpeed: 15,
        windDir: 270,
        visibility: 10,
        observedAt: "2026-03-05T18:53:00Z",
      });

      expect(result.stationId).toBe("KLAX");
      expect(prisma.weatherReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          missionId: "m-1",
          stationId: "KLAX",
          type: "METAR",
          temperature: 15,
          isManual: false,
        }),
      });
    });

    it("defaults isManual to false when not provided", async () => {
      (prisma.weatherReport.create as jest.Mock).mockResolvedValue(mockReport);

      await weatherService.addReport("m-1", {
        stationId: "KLAX",
        type: "METAR",
        rawReport: "KLAX 27015KT",
        observedAt: "2026-03-05T18:53:00Z",
      });

      const data = (prisma.weatherReport.create as jest.Mock).mock.calls[0][0].data;
      expect(data.isManual).toBe(false);
    });

    it("respects isManual when set to true", async () => {
      (prisma.weatherReport.create as jest.Mock).mockResolvedValue({ ...mockReport, isManual: true });

      await weatherService.addReport("m-1", {
        stationId: "KLAX",
        type: "METAR",
        rawReport: "manual entry",
        isManual: true,
        observedAt: "2026-03-05T18:53:00Z",
      });

      const data = (prisma.weatherReport.create as jest.Mock).mock.calls[0][0].data;
      expect(data.isManual).toBe(true);
    });

    it("converts observedAt string to Date", async () => {
      (prisma.weatherReport.create as jest.Mock).mockResolvedValue(mockReport);

      await weatherService.addReport("m-1", {
        stationId: "KLAX",
        type: "METAR",
        rawReport: "raw",
        observedAt: "2026-03-05T18:53:00Z",
      });

      const data = (prisma.weatherReport.create as jest.Mock).mock.calls[0][0].data;
      expect(data.observedAt).toBeInstanceOf(Date);
    });
  });

  // ─── listByMission ─────────────────────────────────────────────

  describe("listByMission", () => {
    it("returns reports ordered by observedAt descending", async () => {
      (prisma.weatherReport.findMany as jest.Mock).mockResolvedValue([mockReport]);

      const result = await weatherService.listByMission("m-1");

      expect(result).toHaveLength(1);
      expect(prisma.weatherReport.findMany).toHaveBeenCalledWith({
        where: { missionId: "m-1" },
        orderBy: { observedAt: "desc" },
      });
    });

    it("returns empty array when no reports exist", async () => {
      (prisma.weatherReport.findMany as jest.Mock).mockResolvedValue([]);
      const result = await weatherService.listByMission("m-1");
      expect(result).toEqual([]);
    });
  });

  // ─── deleteReport ───────────────────────────────────────────────

  describe("deleteReport", () => {
    it("deletes an existing report", async () => {
      (prisma.weatherReport.findUnique as jest.Mock).mockResolvedValue(mockReport);
      (prisma.weatherReport.delete as jest.Mock).mockResolvedValue(mockReport);

      await weatherService.deleteReport("wr-1");

      expect(prisma.weatherReport.delete).toHaveBeenCalledWith({ where: { id: "wr-1" } });
    });

    it("throws NotFoundError for non-existent report", async () => {
      (prisma.weatherReport.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(weatherService.deleteReport("bad-id")).rejects.toThrow(
        "Weather report not found",
      );
    });
  });

  // ─── parseMetar ─────────────────────────────────────────────────

  describe("parseMetar", () => {
    it("parses station ID from METAR string", () => {
      const result = weatherService.parseMetar("KLAX 051853Z 27015KT 10SM FEW025 15/08 A2992");
      expect(result.stationId).toBe("KLAX");
    });

    it("parses wind direction and speed", () => {
      const result = weatherService.parseMetar("KLAX 051853Z 27015KT 10SM FEW025 15/08 A2992");
      expect(result.windDir).toBe(270);
      expect(result.windSpeed).toBe(15);
    });

    it("parses visibility in statute miles", () => {
      const result = weatherService.parseMetar("KLAX 051853Z 27015KT 10SM FEW025 15/08 A2992");
      expect(result.visibility).toBe(10);
    });

    it("parses positive temperature", () => {
      const result = weatherService.parseMetar("KLAX 051853Z 27015KT 10SM FEW025 15/08 A2992");
      expect(result.temperature).toBe(15);
    });

    it("parses negative (M-prefixed) temperature", () => {
      const result = weatherService.parseMetar("KDEN 051853Z 36010KT 10SM SCT040 M02/M05 A3012");
      expect(result.temperature).toBe(-2);
    });

    it("handles gusting winds format", () => {
      const result = weatherService.parseMetar("KJFK 051853Z 18025G35KT 5SM RA 22/18 A2980");
      expect(result.windDir).toBe(180);
      expect(result.windSpeed).toBe(25);
    });

    it("sets type to METAR", () => {
      const result = weatherService.parseMetar("KLAX 27015KT");
      expect(result.type).toBe("METAR");
    });

    it("preserves raw report string", () => {
      const raw = "KLAX 051853Z 27015KT 10SM FEW025 15/08 A2992";
      const result = weatherService.parseMetar(raw);
      expect(result.rawReport).toBe(raw);
    });

    it("returns UNKNOWN station when string is empty", () => {
      const result = weatherService.parseMetar("");
      expect(result.stationId).toBe("UNKNOWN");
    });

    it("handles METAR without wind info", () => {
      const result = weatherService.parseMetar("KLAX 051853Z 10SM FEW025 15/08 A2992");
      expect(result.windDir).toBeUndefined();
      expect(result.windSpeed).toBeUndefined();
    });

    it("handles METAR without visibility", () => {
      const result = weatherService.parseMetar("KLAX 051853Z 27015KT FEW025 15/08 A2992");
      expect(result.visibility).toBeUndefined();
    });

    it("handles METAR without temperature", () => {
      const result = weatherService.parseMetar("KLAX 051853Z 27015KT 10SM FEW025 A2992");
      expect(result.temperature).toBeUndefined();
    });

    it("parses three-digit wind speed", () => {
      const result = weatherService.parseMetar("KORD 051853Z 270105KT 10SM 15/08 A2992");
      expect(result.windSpeed).toBe(105);
    });
  });
});
