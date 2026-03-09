import { PrismaClient, ThreatCategory, Lethality, AirspaceType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ── Greek / Aegean Airspaces ─────────────────────────────────────
  const airspaces = [
    {
      name: "LGD-61 Andravida Range",
      type: AirspaceType.RESTRICTED,
      minAltitude: 0,
      maxAltitude: 46000,
      active: true,
      coordinates: [[21.2, 38.0], [21.5, 38.0], [21.5, 37.75], [21.2, 37.75], [21.2, 38.0]],
      notes: "Andravida weapons range — active during exercises",
    },
    {
      name: "LGD-62 Araxos TMA",
      type: AirspaceType.RESTRICTED,
      minAltitude: 0,
      maxAltitude: 25000,
      active: true,
      coordinates: [[21.3, 38.25], [21.55, 38.25], [21.55, 38.1], [21.3, 38.1], [21.3, 38.25]],
      notes: "Araxos AFB terminal area — military traffic only",
    },
    {
      name: "LGAT Athens TMA",
      type: AirspaceType.RESTRICTED,
      minAltitude: 0,
      maxAltitude: 20000,
      active: true,
      coordinates: [[23.6, 38.1], [24.1, 38.1], [24.1, 37.8], [23.6, 37.8], [23.6, 38.1]],
      notes: "Athens International Airport TMA — civil/military coordination required",
    },
    {
      name: "LGP-71 Aegean FIR Boundary",
      type: AirspaceType.WARNING,
      minAltitude: 0,
      maxAltitude: 60000,
      active: true,
      coordinates: [[25.0, 39.5], [26.0, 39.5], [26.0, 37.0], [25.0, 37.0], [25.0, 39.5]],
      notes: "Aegean FIR boundary zone — heightened awareness, IFF required",
    },
    {
      name: "LGD-63 Souda Bay MOA",
      type: AirspaceType.MOA,
      minAltitude: 5000,
      maxAltitude: 50000,
      active: true,
      coordinates: [[23.8, 35.7], [24.5, 35.7], [24.5, 35.3], [23.8, 35.3], [23.8, 35.7]],
      notes: "Souda Bay NATO base — allied training area",
    },
    {
      name: "LGR-40 Central Aegean ACMI",
      type: AirspaceType.MOA,
      minAltitude: 10000,
      maxAltitude: 50000,
      active: true,
      coordinates: [[24.5, 38.0], [25.5, 38.0], [25.5, 37.0], [24.5, 37.0], [24.5, 38.0]],
      notes: "Air Combat Maneuvering Instrumented range — BVR/WVR training",
    },
    {
      name: "LTBA Istanbul TMA",
      type: AirspaceType.RESTRICTED,
      minAltitude: 0,
      maxAltitude: 15000,
      active: true,
      coordinates: [[28.5, 41.1], [29.5, 41.1], [29.5, 40.8], [28.5, 40.8], [28.5, 41.1]],
      notes: "Istanbul airport complex — avoid without clearance",
    },
    {
      name: "LGP-80 Turkey ADIZ Buffer",
      type: AirspaceType.WARNING,
      minAltitude: 0,
      maxAltitude: 60000,
      active: true,
      coordinates: [[26.5, 39.0], [27.5, 39.0], [27.5, 37.5], [26.5, 37.5], [26.5, 39.0]],
      notes: "ADIZ buffer zone — expect intercept, maintain IFF squawk",
    },
    {
      name: "LGD-70 Skyros Range",
      type: AirspaceType.RESTRICTED,
      minAltitude: 0,
      maxAltitude: 40000,
      active: true,
      coordinates: [[24.3, 39.0], [24.7, 39.0], [24.7, 38.7], [24.3, 38.7], [24.3, 39.0]],
      notes: "Skyros live-fire range — check NOTAMs",
    },
    {
      name: "LGD-64 Crete South Range",
      type: AirspaceType.MOA,
      minAltitude: 0,
      maxAltitude: 55000,
      active: true,
      coordinates: [[24.0, 34.8], [25.5, 34.8], [25.5, 34.2], [24.0, 34.2], [24.0, 34.8]],
      notes: "South of Crete — naval/air exercise area",
    },
  ];

  for (const a of airspaces) {
    const existing = await prisma.airspace.findFirst({ where: { name: a.name } });
    if (!existing) {
      await prisma.airspace.create({ data: a });
    }
  }
  console.log(`Seeded ${airspaces.length} Greek/Aegean airspaces`);

  // ── Regional Threats (training scenario) ───────────────────────────
  const threats = [
    { name: "SA-10 Grumble (Aegean East)", category: ThreatCategory.SAM, lat: 26.8, lon: 38.2, rangeNm: 40, lethality: Lethality.CRITICAL, minAltitude: 50, maxAltitude: 90000, notes: "Long-range SAM covering eastern Aegean" },
    { name: "SA-15 Gauntlet (Chios)", category: ThreatCategory.SAM, lat: 26.1, lon: 38.4, rangeNm: 7, lethality: Lethality.HIGH, minAltitude: 10, maxAltitude: 20000, notes: "Short-range point defense" },
    { name: "S-400 Triumf (Ankara Fwd)", category: ThreatCategory.SAM, lat: 27.5, lon: 37.5, rangeNm: 120, lethality: Lethality.CRITICAL, minAltitude: 0, maxAltitude: 100000, notes: "Strategic SAM — covers deep into Aegean from Turkish coast" },
    { name: "57mm AAA Battery (Lesvos)", category: ThreatCategory.AAA, lat: 26.5, lon: 39.1, rangeNm: 3, lethality: Lethality.MEDIUM, minAltitude: 0, maxAltitude: 12000, notes: "Towed AAA emplacement" },
    { name: "MANPAD Team Alpha (Samos)", category: ThreatCategory.MANPAD, lat: 26.9, lon: 37.7, rangeNm: 3, lethality: Lethality.MEDIUM, minAltitude: 0, maxAltitude: 10000, notes: "SA-18 team, low-altitude threat" },
    { name: "EWR Radar (Izmir)", category: ThreatCategory.RADAR, lat: 27.1, lon: 38.4, rangeNm: 150, lethality: Lethality.LOW, minAltitude: 0, maxAltitude: 80000, notes: "Long-range search radar — early warning for scramble" },
    { name: "F-16 CAP (Bandirma)", category: ThreatCategory.FIGHTER, lat: 28.0, lon: 40.3, rangeNm: 40, lethality: Lethality.HIGH, minAltitude: 0, maxAltitude: 55000, notes: "2-ship CAP out of Bandirma AB, armed with AIM-120" },
    { name: "Koral EW System (Bodrum)", category: ThreatCategory.RADAR, lat: 27.4, lon: 37.0, rangeNm: 90, lethality: Lethality.LOW, minAltitude: 0, maxAltitude: 60000, notes: "Electronic warfare / jamming system — degrades radar & comms" },
    { name: "SA-6 Gainful (Datca)", category: ThreatCategory.SAM, lat: 27.7, lon: 36.7, rangeNm: 13, lethality: Lethality.HIGH, minAltitude: 100, maxAltitude: 40000, notes: "Mobile SAM on Datca peninsula" },
    { name: "Hawk Battery (Rhodes)", category: ThreatCategory.SAM, lat: 28.2, lon: 36.4, rangeNm: 20, lethality: Lethality.HIGH, minAltitude: 50, maxAltitude: 45000, notes: "MIM-23 Hawk — medium range" },
  ];

  for (const t of threats) {
    const existing = await prisma.threat.findFirst({ where: { name: t.name } });
    if (!existing) {
      // Note: seed data has lon/lat swapped vs schema (schema is lat, lon)
      await prisma.threat.create({
        data: {
          name: t.name,
          category: t.category,
          lat: t.lon,  // schema: lat field
          lon: t.lat,  // schema: lon field
          rangeNm: t.rangeNm,
          lethality: t.lethality,
          minAltitude: t.minAltitude,
          maxAltitude: t.maxAltitude,
          notes: t.notes,
        },
      });
    }
  }
  console.log(`Seeded ${threats.length} regional threats`);

  console.log("\n=== Greece/Aegean data seeded ===");
  console.log("Airspaces and threats are now available to assign to your OPS1 mission.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
