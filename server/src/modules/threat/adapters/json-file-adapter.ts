import fs from "fs";
import path from "path";
import { ThreatFeedAdapter, ThreatFeedItem } from "./threat-feed-adapter";

export class JsonFileFeedAdapter implements ThreatFeedAdapter {
  name = "json-file";
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), "data", "threat-feed.json");
  }

  async isAvailable(): Promise<boolean> {
    return fs.existsSync(this.filePath);
  }

  async fetchThreats(): Promise<ThreatFeedItem[]> {
    if (!await this.isAvailable()) return [];
    const raw = fs.readFileSync(this.filePath, "utf-8");
    const data = JSON.parse(raw);
    return (data.threats || data || []).map((t: any) => ({
      externalId: t.id || t.externalId || `json-${t.name}`,
      name: t.name,
      category: t.category || "OTHER",
      lat: t.lat || t.latitude,
      lon: t.lon || t.longitude,
      rangeNm: t.rangeNm || t.range_nm || 5,
      lethality: t.lethality || "MEDIUM",
      minAltitude: t.minAltitude || t.min_altitude,
      maxAltitude: t.maxAltitude || t.max_altitude,
      notes: t.notes,
      source: "json-file",
    }));
  }
}
