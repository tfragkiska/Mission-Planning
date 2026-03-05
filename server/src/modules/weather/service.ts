import { prisma } from "../../infra/database";
import { NotFoundError } from "../../shared/errors";

interface CreateWeatherInput {
  stationId: string;
  type: string;
  rawReport: string;
  temperature?: number;
  windSpeed?: number;
  windDir?: number;
  visibility?: number;
  ceiling?: number;
  conditions?: string;
  isManual?: boolean;
  observedAt: string;
}

export const weatherService = {
  async addReport(missionId: string, input: CreateWeatherInput) {
    return prisma.weatherReport.create({
      data: {
        missionId,
        stationId: input.stationId,
        type: input.type,
        rawReport: input.rawReport,
        temperature: input.temperature,
        windSpeed: input.windSpeed,
        windDir: input.windDir,
        visibility: input.visibility,
        ceiling: input.ceiling,
        conditions: input.conditions,
        isManual: input.isManual ?? false,
        observedAt: new Date(input.observedAt),
      },
    });
  },

  async listByMission(missionId: string) {
    return prisma.weatherReport.findMany({
      where: { missionId },
      orderBy: { observedAt: "desc" },
    });
  },

  async deleteReport(id: string) {
    const report = await prisma.weatherReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundError("Weather report");
    await prisma.weatherReport.delete({ where: { id } });
  },

  // Parse a raw METAR string into structured data
  parseMetar(raw: string): Partial<CreateWeatherInput> {
    const parts = raw.trim().split(/\s+/);
    const result: Partial<CreateWeatherInput> = {
      rawReport: raw,
      type: "METAR",
      stationId: parts[0] || "UNKNOWN",
    };

    // Extract wind: format like 27015KT or 27015G25KT
    const windMatch = raw.match(/(\d{3})(\d{2,3})(G\d{2,3})?KT/);
    if (windMatch) {
      result.windDir = parseInt(windMatch[1], 10);
      result.windSpeed = parseInt(windMatch[2], 10);
    }

    // Extract visibility in SM
    const visMatch = raw.match(/(\d+)SM/);
    if (visMatch) {
      result.visibility = parseInt(visMatch[1], 10);
    }

    // Extract temperature: format like 15/08 or M02/M05
    const tempMatch = raw.match(/\s(M?\d{2})\/(M?\d{2})\s/);
    if (tempMatch) {
      const temp = tempMatch[1].startsWith("M")
        ? -parseInt(tempMatch[1].slice(1), 10)
        : parseInt(tempMatch[1], 10);
      result.temperature = temp;
    }

    return result;
  },
};
