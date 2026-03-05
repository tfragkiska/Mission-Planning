import { ThreatFeedAdapter, ThreatFeedItem } from "./threat-feed-adapter";

interface HttpFeedConfig {
  name: string;
  url: string;
  headers?: Record<string, string>;
  mapResponse: (data: any) => ThreatFeedItem[];
}

export class HttpFeedAdapter implements ThreatFeedAdapter {
  name: string;
  private config: HttpFeedConfig;

  constructor(config: HttpFeedConfig) {
    this.name = config.name;
    this.config = config;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(this.config.url, {
        method: "HEAD",
        headers: this.config.headers,
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async fetchThreats(): Promise<ThreatFeedItem[]> {
    try {
      const res = await fetch(this.config.url, {
        headers: {
          "Accept": "application/json",
          ...this.config.headers,
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return this.config.mapResponse(data);
    } catch {
      return [];
    }
  }
}
