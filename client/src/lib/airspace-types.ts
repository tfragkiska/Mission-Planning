export interface Airspace {
  id: string;
  name: string;
  type: "RESTRICTED" | "PROHIBITED" | "MOA" | "WARNING" | "ALERT" | "TFR";
  minAltitude?: number;
  maxAltitude?: number;
  active: boolean;
  coordinates: number[][];
  notes?: string;
}
