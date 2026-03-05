export interface ThreatFeedItem {
  externalId: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  rangeNm: number;
  lethality: string;
  minAltitude?: number;
  maxAltitude?: number;
  notes?: string;
  source: string;
}

export interface ThreatFeedAdapter {
  name: string;
  fetchThreats(): Promise<ThreatFeedItem[]>;
  isAvailable(): Promise<boolean>;
}
