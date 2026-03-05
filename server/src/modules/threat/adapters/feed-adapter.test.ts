import { JsonFileFeedAdapter } from "./json-file-adapter";
import path from "path";

describe("JsonFileFeedAdapter", () => {
  it("should read threats from a valid JSON file", async () => {
    const adapter = new JsonFileFeedAdapter(path.join(__dirname, "../../../../data/threat-feed.json"));
    const available = await adapter.isAvailable();
    expect(available).toBe(true);
    const threats = await adapter.fetchThreats();
    expect(threats.length).toBeGreaterThan(0);
    expect(threats[0]).toHaveProperty("name");
    expect(threats[0]).toHaveProperty("lat");
    expect(threats[0]).toHaveProperty("lon");
    expect(threats[0].source).toBe("json-file");
  });

  it("should return empty array for non-existent file", async () => {
    const adapter = new JsonFileFeedAdapter("/nonexistent/path.json");
    const available = await adapter.isAvailable();
    expect(available).toBe(false);
    const threats = await adapter.fetchThreats();
    expect(threats).toEqual([]);
  });
});
