import { ThreatFeedAdapter, ThreatFeedItem } from "./threat-feed-adapter";
import { JsonFileFeedAdapter } from "./json-file-adapter";
import { prisma } from "../../../infra/database";
import { ThreatCategory, Lethality } from "@prisma/client";

export { ThreatFeedAdapter, ThreatFeedItem } from "./threat-feed-adapter";
export { JsonFileFeedAdapter } from "./json-file-adapter";
export { HttpFeedAdapter } from "./http-feed-adapter";

class ThreatFeedRegistry {
  private adapters: ThreatFeedAdapter[] = [];

  register(adapter: ThreatFeedAdapter) {
    this.adapters.push(adapter);
    console.log(`Registered threat feed adapter: ${adapter.name}`);
  }

  getAdapters(): ThreatFeedAdapter[] {
    return [...this.adapters];
  }

  async ingestAll(): Promise<{ adapter: string; ingested: number; errors: number }[]> {
    const results = [];

    for (const adapter of this.adapters) {
      let ingested = 0;
      let errors = 0;

      try {
        const available = await adapter.isAvailable();
        if (!available) {
          results.push({ adapter: adapter.name, ingested: 0, errors: 0 });
          continue;
        }

        const threats = await adapter.fetchThreats();

        for (const item of threats) {
          try {
            // Validate category and lethality
            const category = Object.values(ThreatCategory).includes(item.category as ThreatCategory)
              ? (item.category as ThreatCategory)
              : ThreatCategory.OTHER;
            const lethality = Object.values(Lethality).includes(item.lethality as Lethality)
              ? (item.lethality as Lethality)
              : Lethality.MEDIUM;

            // Upsert by source + externalId combination (use name + source as unique key)
            const existing = await prisma.threat.findFirst({
              where: {
                name: item.name,
                source: item.source,
              },
            });

            if (existing) {
              await prisma.threat.update({
                where: { id: existing.id },
                data: {
                  category,
                  lat: item.lat,
                  lon: item.lon,
                  rangeNm: item.rangeNm,
                  lethality,
                  minAltitude: item.minAltitude,
                  maxAltitude: item.maxAltitude,
                  notes: item.notes,
                  active: true,
                },
              });
            } else {
              await prisma.threat.create({
                data: {
                  name: item.name,
                  category,
                  lat: item.lat,
                  lon: item.lon,
                  rangeNm: item.rangeNm,
                  lethality,
                  minAltitude: item.minAltitude,
                  maxAltitude: item.maxAltitude,
                  notes: item.notes,
                  source: item.source,
                  active: true,
                },
              });
            }
            ingested++;
          } catch {
            errors++;
          }
        }
      } catch {
        errors++;
      }

      results.push({ adapter: adapter.name, ingested, errors });
    }

    return results;
  }
}

export const threatFeedRegistry = new ThreatFeedRegistry();

// Auto-register the JSON file adapter
threatFeedRegistry.register(new JsonFileFeedAdapter());
