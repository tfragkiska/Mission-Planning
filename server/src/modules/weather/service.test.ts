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

describe("weatherService", () => {
  describe("addReport", () => {
    it("creates a weather report", async () => {
      const mock = { id: "wr-1", stationId: "KLAX", type: "METAR", rawReport: "KLAX 270KT", missionId: "m-1" };
      (prisma.weatherReport.create as jest.Mock).mockResolvedValue(mock);
      const result = await weatherService.addReport("m-1", {
        stationId: "KLAX", type: "METAR", rawReport: "KLAX 270KT",
        observedAt: "2026-03-05T12:00:00Z",
      });
      expect(result.stationId).toBe("KLAX");
    });
  });

  describe("parseMetar", () => {
    it("parses wind from METAR", () => {
      const result = weatherService.parseMetar("KLAX 051853Z 27015KT 10SM FEW025 15/08 A2992");
      expect(result.windDir).toBe(270);
      expect(result.windSpeed).toBe(15);
      expect(result.visibility).toBe(10);
      expect(result.temperature).toBe(15);
      expect(result.stationId).toBe("KLAX");
    });

    it("handles negative temperature", () => {
      const result = weatherService.parseMetar("KDEN 051853Z 36010KT 10SM SCT040 M02/M05 A3012");
      expect(result.temperature).toBe(-2);
    });
  });
});
