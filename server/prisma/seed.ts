import {
  PrismaClient,
  Role,
  MissionType,
  MissionStatus,
  Priority,
  WaypointType,
  ThreatCategory,
  Lethality,
  ConflictType,
  ConflictSeverity,
  ConflictResolution,
  AirspaceType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clean existing data (in reverse dependency order)
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.missionVersion.deleteMany();
  await prisma.deconflictionResult.deleteMany();
  await prisma.weatherReport.deleteMany();
  await prisma.missionThreat.deleteMany();
  await prisma.waypoint.deleteMany();
  await prisma.crewMember.deleteMany();
  await prisma.aircraft.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.threat.deleteMany();
  await prisma.airspace.deleteMany();
  await prisma.user.deleteMany();

  console.log("Cleared existing data");

  // ── Users ──────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 10);

  const planner = await prisma.user.create({
    data: { email: "planner@mission.mil", passwordHash, name: "Alex Planner", role: Role.PLANNER },
  });
  const planner2 = await prisma.user.create({
    data: { email: "planner2@mission.mil", passwordHash, name: "Riley Strategist", role: Role.PLANNER },
  });
  const pilot = await prisma.user.create({
    data: { email: "pilot@mission.mil", passwordHash, name: "Jordan Pilot", role: Role.PILOT },
  });
  const pilot2 = await prisma.user.create({
    data: { email: "pilot2@mission.mil", passwordHash, name: "Casey Aviator", role: Role.PILOT },
  });
  const commander = await prisma.user.create({
    data: { email: "commander@mission.mil", passwordHash, name: "Sam Commander", role: Role.COMMANDER },
  });

  console.log("Seeded 5 users");

  // ── Threats ────────────────────────────────────────────────────────
  const threats = await Promise.all([
    prisma.threat.create({ data: { name: "SA-6 Gainful", category: ThreatCategory.SAM, lat: 34.10, lon: -118.20, rangeNm: 13, lethality: Lethality.HIGH, minAltitude: 100, maxAltitude: 40000, notes: "Mobile SAM battery, relocates every 48h" } }),
    prisma.threat.create({ data: { name: "ZSU-23-4 Shilka", category: ThreatCategory.AAA, lat: 34.08, lon: -118.15, rangeNm: 1.5, lethality: Lethality.MEDIUM, minAltitude: 0, maxAltitude: 5000, notes: "Self-propelled anti-aircraft gun" } }),
    prisma.threat.create({ data: { name: "SA-18 Igla", category: ThreatCategory.MANPAD, lat: 34.12, lon: -118.30, rangeNm: 3, lethality: Lethality.MEDIUM, minAltitude: 0, maxAltitude: 11000 } }),
    prisma.threat.create({ data: { name: "EWR Radar Station", category: ThreatCategory.RADAR, lat: 34.05, lon: -118.10, rangeNm: 50, lethality: Lethality.LOW, minAltitude: 0, maxAltitude: 60000, notes: "Long-range early warning radar, 360-degree coverage" } }),
    prisma.threat.create({ data: { name: "MiG-29 CAP", category: ThreatCategory.FIGHTER, lat: 34.20, lon: -118.35, rangeNm: 25, lethality: Lethality.CRITICAL, minAltitude: 0, maxAltitude: 55000, notes: "Combat air patrol, 2-ship formation" } }),
    prisma.threat.create({ data: { name: "SA-11 Buk", category: ThreatCategory.SAM, lat: 34.15, lon: -118.25, rangeNm: 20, lethality: Lethality.CRITICAL, minAltitude: 50, maxAltitude: 72000, notes: "Medium-range SAM, high threat to all altitude ops" } }),
    prisma.threat.create({ data: { name: "SA-7 Grail", category: ThreatCategory.MANPAD, lat: 34.06, lon: -118.28, rangeNm: 2.5, lethality: Lethality.LOW, minAltitude: 0, maxAltitude: 8000, notes: "Infrared homing, limited to low-altitude" } }),
    prisma.threat.create({ data: { name: "S-300 Battery", category: ThreatCategory.SAM, lat: 34.22, lon: -118.12, rangeNm: 75, lethality: Lethality.CRITICAL, minAltitude: 25, maxAltitude: 98000, notes: "Long-range strategic SAM, primary area denial" } }),
  ]);

  console.log(`Seeded ${threats.length} threats`);

  // ── Airspaces ──────────────────────────────────────────────────────
  await Promise.all([
    prisma.airspace.create({
      data: {
        name: "R-2508 Edwards AFB Complex",
        type: AirspaceType.RESTRICTED,
        minAltitude: 0,
        maxAltitude: 50000,
        active: true,
        coordinates: [[-118.5, 34.5], [-117.5, 34.5], [-117.5, 34.0], [-118.5, 34.0], [-118.5, 34.5]],
        notes: "Active Mon-Fri, contact Edwards Approach",
      },
    }),
    prisma.airspace.create({
      data: {
        name: "P-56 Washington DC",
        type: AirspaceType.PROHIBITED,
        minAltitude: 0,
        maxAltitude: 18000,
        active: true,
        coordinates: [[-77.05, 38.92], [-77.0, 38.92], [-77.0, 38.88], [-77.05, 38.88], [-77.05, 38.92]],
        notes: "Prohibited at all times — White House / Capitol",
      },
    }),
    prisma.airspace.create({
      data: {
        name: "W-289 Pacific Offshore",
        type: AirspaceType.WARNING,
        minAltitude: 0,
        maxAltitude: 60000,
        active: true,
        coordinates: [[-119.0, 34.3], [-118.5, 34.3], [-118.5, 33.8], [-119.0, 33.8], [-119.0, 34.3]],
        notes: "Naval exercises, check NOTAMs",
      },
    }),
    prisma.airspace.create({
      data: {
        name: "MOA-Condor East",
        type: AirspaceType.MOA,
        minAltitude: 5000,
        maxAltitude: 18000,
        active: true,
        coordinates: [[-118.3, 34.4], [-117.9, 34.4], [-117.9, 34.1], [-118.3, 34.1], [-118.3, 34.4]],
        notes: "Fighter training area, high-speed ops",
      },
    }),
    prisma.airspace.create({
      data: {
        name: "TFR-VIP Movement",
        type: AirspaceType.TFR,
        minAltitude: 0,
        maxAltitude: 3000,
        active: false,
        coordinates: [[-118.4, 34.07], [-118.35, 34.07], [-118.35, 34.03], [-118.4, 34.03], [-118.4, 34.07]],
        notes: "Temporary flight restriction — VIP transit (expired)",
      },
    }),
  ]);

  console.log("Seeded 5 airspaces");

  // ── Missions ───────────────────────────────────────────────────────
  const now = new Date();
  const hours = (h: number) => new Date(now.getTime() + h * 3600000);

  // Mission 1: APPROVED combat mission with full data
  const m1 = await prisma.mission.create({
    data: {
      name: "STEEL RAIN - CAS Package Alpha",
      type: MissionType.OPERATIONAL,
      status: MissionStatus.APPROVED,
      priority: Priority.CRITICAL,
      scheduledStart: hours(6),
      scheduledEnd: hours(10),
      createdById: planner.id,
      approvedById: commander.id,
    },
  });

  // Mission 2: PLANNED training mission
  const m2 = await prisma.mission.create({
    data: {
      name: "EAGLE EYE - ISR Training Sortie",
      type: MissionType.TRAINING,
      status: MissionStatus.PLANNED,
      priority: Priority.MEDIUM,
      scheduledStart: hours(24),
      scheduledEnd: hours(27),
      createdById: planner.id,
    },
  });

  // Mission 3: UNDER_REVIEW
  const m3 = await prisma.mission.create({
    data: {
      name: "NIGHT HAWK - Deep Strike Package",
      type: MissionType.OPERATIONAL,
      status: MissionStatus.UNDER_REVIEW,
      priority: Priority.HIGH,
      scheduledStart: hours(48),
      scheduledEnd: hours(53),
      createdById: planner.id,
    },
  });

  // Mission 4: DRAFT
  const m4 = await prisma.mission.create({
    data: {
      name: "IRON SHIELD - Air Defense Exercise",
      type: MissionType.TRAINING,
      status: MissionStatus.DRAFT,
      priority: Priority.LOW,
      scheduledStart: hours(72),
      scheduledEnd: hours(75),
      createdById: planner2.id,
    },
  });

  // Mission 5: BRIEFED
  const m5 = await prisma.mission.create({
    data: {
      name: "THUNDER RUN - Interdiction Mission",
      type: MissionType.OPERATIONAL,
      status: MissionStatus.BRIEFED,
      priority: Priority.HIGH,
      scheduledStart: hours(2),
      scheduledEnd: hours(5),
      createdById: planner.id,
      approvedById: commander.id,
    },
  });

  // Mission 6: EXECUTING
  const m6 = await prisma.mission.create({
    data: {
      name: "SHADOW STRIKE - SEAD Package",
      type: MissionType.OPERATIONAL,
      status: MissionStatus.EXECUTING,
      priority: Priority.CRITICAL,
      scheduledStart: hours(-1),
      scheduledEnd: hours(2),
      createdById: planner.id,
      approvedById: commander.id,
    },
  });

  // Mission 7: DEBRIEFED
  const m7 = await prisma.mission.create({
    data: {
      name: "SWIFT SWORD - Tactical Recon",
      type: MissionType.OPERATIONAL,
      status: MissionStatus.DEBRIEFED,
      priority: Priority.MEDIUM,
      scheduledStart: hours(-48),
      scheduledEnd: hours(-44),
      createdById: planner2.id,
      approvedById: commander.id,
    },
  });

  // Mission 8: REJECTED
  const m8 = await prisma.mission.create({
    data: {
      name: "LONE WOLF - Solo Recon Flight",
      type: MissionType.OPERATIONAL,
      status: MissionStatus.REJECTED,
      priority: Priority.MEDIUM,
      scheduledStart: hours(36),
      scheduledEnd: hours(39),
      commanderComments: "Unacceptable risk level — route passes through active S-300 engagement zone. Replan with southern approach corridor.",
      createdById: planner.id,
      approvedById: commander.id,
    },
  });

  // Mission 9: DRAFT training
  const m9 = await prisma.mission.create({
    data: {
      name: "RED FLAG - Aggressor Training",
      type: MissionType.TRAINING,
      status: MissionStatus.DRAFT,
      priority: Priority.MEDIUM,
      scheduledStart: hours(96),
      scheduledEnd: hours(100),
      createdById: planner.id,
    },
  });

  // Mission 10: PLANNED operational
  const m10 = await prisma.mission.create({
    data: {
      name: "DESERT FALCON - Strike Escort",
      type: MissionType.OPERATIONAL,
      status: MissionStatus.PLANNED,
      priority: Priority.HIGH,
      scheduledStart: hours(12),
      scheduledEnd: hours(16),
      createdById: planner2.id,
    },
  });

  const allMissions = [m1, m2, m3, m4, m5, m6, m7, m8, m9, m10];
  console.log(`Seeded ${allMissions.length} missions`);

  // ── Aircraft & Crew ────────────────────────────────────────────────
  const aircraftData: { missionId: string; type: string; tailNumber: string; callsign: string; crew: { role: string; name: string }[] }[] = [
    { missionId: m1.id, type: "F-16C Viper", tailNumber: "AF-88-0421", callsign: "VIPER 1-1", crew: [{ role: "Pilot", name: "Capt Jordan Pilot" }, { role: "WSO", name: "1Lt Mike Torres" }] },
    { missionId: m1.id, type: "F-16C Viper", tailNumber: "AF-88-0435", callsign: "VIPER 1-2", crew: [{ role: "Pilot", name: "Capt Sarah Chen" }] },
    { missionId: m2.id, type: "MQ-9 Reaper", tailNumber: "AF-12-4501", callsign: "SHADOW 2-1", crew: [{ role: "Pilot (RPA)", name: "1Lt Casey Aviator" }, { role: "Sensor Operator", name: "SSgt Davis" }] },
    { missionId: m3.id, type: "F-15E Strike Eagle", tailNumber: "AF-91-0312", callsign: "STRIKE 3-1", crew: [{ role: "Pilot", name: "Maj Tom Bradley" }, { role: "WSO", name: "Capt Lisa Park" }] },
    { missionId: m3.id, type: "F-15E Strike Eagle", tailNumber: "AF-91-0318", callsign: "STRIKE 3-2", crew: [{ role: "Pilot", name: "Capt Nate Hicks" }, { role: "WSO", name: "1Lt Anna Ruiz" }] },
    { missionId: m5.id, type: "F-35A Lightning II", tailNumber: "AF-18-5501", callsign: "RAPTOR 5-1", crew: [{ role: "Pilot", name: "Maj James Kirk" }] },
    { missionId: m5.id, type: "F-35A Lightning II", tailNumber: "AF-18-5508", callsign: "RAPTOR 5-2", crew: [{ role: "Pilot", name: "Capt Emily Zhao" }] },
    { missionId: m6.id, type: "F-16CJ Wild Weasel", tailNumber: "AF-95-0220", callsign: "WEASEL 6-1", crew: [{ role: "Pilot", name: "Lt Col Pete Mitchell" }] },
    { missionId: m6.id, type: "EA-18G Growler", tailNumber: "NE-168-930", callsign: "SPARK 6-2", crew: [{ role: "Pilot", name: "Cdr Jake Sullivan" }, { role: "EWO", name: "Lt Rachel Kim" }] },
    { missionId: m7.id, type: "RQ-4 Global Hawk", tailNumber: "AF-11-2045", callsign: "HAWK 7-1", crew: [{ role: "Pilot (RPA)", name: "Capt Olivia Grant" }, { role: "Mission Commander", name: "Maj Dan White" }] },
    { missionId: m10.id, type: "F-15C Eagle", tailNumber: "AF-85-0102", callsign: "EAGLE 10-1", crew: [{ role: "Pilot", name: "Capt Ryan Foster" }] },
    { missionId: m10.id, type: "F-15C Eagle", tailNumber: "AF-85-0118", callsign: "EAGLE 10-2", crew: [{ role: "Pilot", name: "1Lt Diana Brooks" }] },
  ];

  for (const ac of aircraftData) {
    const aircraft = await prisma.aircraft.create({
      data: { missionId: ac.missionId, type: ac.type, tailNumber: ac.tailNumber, callsign: ac.callsign },
    });
    for (const c of ac.crew) {
      await prisma.crewMember.create({
        data: { missionId: ac.missionId, aircraftId: aircraft.id, role: c.role, name: c.name },
      });
    }
  }

  console.log(`Seeded ${aircraftData.length} aircraft with crew`);

  // ── Waypoints ──────────────────────────────────────────────────────
  const waypointSets: { missionId: string; waypoints: { name: string; lat: number; lon: number; altitude: number; speed: number; type: WaypointType }[] }[] = [
    {
      missionId: m1.id,
      waypoints: [
        { name: "ALPHA (Departure)", lat: 34.00, lon: -118.50, altitude: 1500, speed: 250, type: WaypointType.INITIAL_POINT },
        { name: "BRAVO", lat: 34.05, lon: -118.40, altitude: 5000, speed: 350, type: WaypointType.WAYPOINT },
        { name: "CHARLIE (Push)", lat: 34.10, lon: -118.32, altitude: 8000, speed: 400, type: WaypointType.WAYPOINT },
        { name: "DELTA (IP)", lat: 34.13, lon: -118.22, altitude: 2000, speed: 420, type: WaypointType.WAYPOINT },
        { name: "TGT WAREHOUSE", lat: 34.15, lon: -118.18, altitude: 1500, speed: 450, type: WaypointType.TARGET },
        { name: "ECHO (Egress)", lat: 34.18, lon: -118.25, altitude: 5000, speed: 400, type: WaypointType.EGRESS_POINT },
        { name: "FOXTROT (RTB)", lat: 34.00, lon: -118.50, altitude: 3000, speed: 300, type: WaypointType.LANDING },
      ],
    },
    {
      missionId: m2.id,
      waypoints: [
        { name: "HOME PLATE", lat: 34.00, lon: -118.50, altitude: 8000, speed: 150, type: WaypointType.INITIAL_POINT },
        { name: "ORBIT NORTH", lat: 34.20, lon: -118.30, altitude: 15000, speed: 120, type: WaypointType.WAYPOINT },
        { name: "SCAN AREA", lat: 34.15, lon: -118.10, altitude: 18000, speed: 100, type: WaypointType.TARGET },
        { name: "ORBIT SOUTH", lat: 34.05, lon: -118.20, altitude: 15000, speed: 120, type: WaypointType.WAYPOINT },
        { name: "RTB", lat: 34.00, lon: -118.50, altitude: 8000, speed: 150, type: WaypointType.LANDING },
      ],
    },
    {
      missionId: m3.id,
      waypoints: [
        { name: "TAKEOFF", lat: 34.00, lon: -118.50, altitude: 2000, speed: 300, type: WaypointType.INITIAL_POINT },
        { name: "RALLY POINT WHISKEY", lat: 34.02, lon: -118.42, altitude: 500, speed: 420, type: WaypointType.RALLY_POINT },
        { name: "NAV FIX 1", lat: 34.08, lon: -118.35, altitude: 500, speed: 480, type: WaypointType.WAYPOINT },
        { name: "NAV FIX 2", lat: 34.14, lon: -118.28, altitude: 500, speed: 480, type: WaypointType.WAYPOINT },
        { name: "TGT BRIDGE", lat: 34.18, lon: -118.15, altitude: 1000, speed: 500, type: WaypointType.TARGET },
        { name: "TGT AMMO DEPOT", lat: 34.20, lon: -118.10, altitude: 1500, speed: 480, type: WaypointType.TARGET },
        { name: "EGRESS SOUTH", lat: 34.15, lon: -118.05, altitude: 5000, speed: 450, type: WaypointType.EGRESS_POINT },
        { name: "RECOVERY", lat: 34.00, lon: -118.50, altitude: 3000, speed: 300, type: WaypointType.LANDING },
      ],
    },
    {
      missionId: m5.id,
      waypoints: [
        { name: "DEPARTURE", lat: 34.00, lon: -118.50, altitude: 3000, speed: 350, type: WaypointType.INITIAL_POINT },
        { name: "FENCE IN", lat: 34.08, lon: -118.38, altitude: 20000, speed: 450, type: WaypointType.WAYPOINT },
        { name: "INTERDICTION ZONE", lat: 34.16, lon: -118.20, altitude: 25000, speed: 480, type: WaypointType.TARGET },
        { name: "FENCE OUT", lat: 34.10, lon: -118.10, altitude: 20000, speed: 450, type: WaypointType.EGRESS_POINT },
        { name: "LANDING", lat: 34.00, lon: -118.50, altitude: 3000, speed: 300, type: WaypointType.LANDING },
      ],
    },
    {
      missionId: m6.id,
      waypoints: [
        { name: "LAUNCH", lat: 34.00, lon: -118.50, altitude: 5000, speed: 400, type: WaypointType.INITIAL_POINT },
        { name: "JAMMER ORBIT", lat: 34.08, lon: -118.35, altitude: 22000, speed: 380, type: WaypointType.WAYPOINT },
        { name: "SA-6 SITE", lat: 34.10, lon: -118.20, altitude: 15000, speed: 500, type: WaypointType.TARGET },
        { name: "SA-11 SITE", lat: 34.15, lon: -118.25, altitude: 12000, speed: 500, type: WaypointType.TARGET },
        { name: "S-300 STANDOFF", lat: 34.18, lon: -118.15, altitude: 25000, speed: 420, type: WaypointType.TARGET },
        { name: "EGRESS WEST", lat: 34.12, lon: -118.45, altitude: 10000, speed: 450, type: WaypointType.EGRESS_POINT },
        { name: "RECOVERY", lat: 34.00, lon: -118.50, altitude: 3000, speed: 300, type: WaypointType.LANDING },
      ],
    },
  ];

  for (const ws of waypointSets) {
    for (let i = 0; i < ws.waypoints.length; i++) {
      const wp = ws.waypoints[i];
      await prisma.waypoint.create({
        data: {
          missionId: ws.missionId,
          sequenceOrder: i + 1,
          name: wp.name,
          lat: wp.lat,
          lon: wp.lon,
          altitude: wp.altitude,
          speed: wp.speed,
          type: wp.type,
        },
      });
    }
  }

  console.log("Seeded waypoints for 5 missions");

  // ── Mission-Threat associations ────────────────────────────────────
  const missionThreatLinks = [
    { missionId: m1.id, threatId: threats[0].id, notes: "Primary threat to ingress route" },
    { missionId: m1.id, threatId: threats[1].id, notes: "Low-level threat near target area" },
    { missionId: m1.id, threatId: threats[3].id, notes: "Provides early warning, expect fighter scramble" },
    { missionId: m3.id, threatId: threats[0].id },
    { missionId: m3.id, threatId: threats[4].id, notes: "CAP expected over target area" },
    { missionId: m3.id, threatId: threats[5].id, notes: "SA-11 coverage overlaps route" },
    { missionId: m3.id, threatId: threats[7].id, notes: "S-300 engagement zone — stay below radar horizon" },
    { missionId: m5.id, threatId: threats[0].id },
    { missionId: m5.id, threatId: threats[5].id },
    { missionId: m6.id, threatId: threats[0].id, notes: "Primary SEAD target" },
    { missionId: m6.id, threatId: threats[5].id, notes: "Secondary SEAD target" },
    { missionId: m6.id, threatId: threats[7].id, notes: "Standoff jamming required" },
    { missionId: m6.id, threatId: threats[3].id, notes: "EWR must be suppressed first" },
    { missionId: m10.id, threatId: threats[4].id, notes: "Expect MiG-29 opposition" },
    { missionId: m10.id, threatId: threats[3].id },
  ];

  for (const mt of missionThreatLinks) {
    await prisma.missionThreat.create({ data: mt });
  }

  console.log(`Seeded ${missionThreatLinks.length} mission-threat links`);

  // ── Weather Reports ────────────────────────────────────────────────
  const weatherData = [
    { missionId: m1.id, stationId: "KEDW", type: "METAR", rawReport: "KEDW 091200Z 24010KT 10SM FEW120 SCT250 22/08 A2992 RMK AO2", temperature: 22, windSpeed: 10, windDir: 240, visibility: 10, ceiling: 12000, conditions: "FEW" },
    { missionId: m1.id, stationId: "KEDW", type: "TAF", rawReport: "TAF KEDW 091100Z 0912/1012 25012KT P6SM FEW150 SCT250 BECMG 0918/0920 30015G25KT", temperature: 24, windSpeed: 12, windDir: 250, visibility: 10, ceiling: 15000, conditions: "FEW" },
    { missionId: m2.id, stationId: "KEDW", type: "METAR", rawReport: "KEDW 091200Z 18005KT 10SM CLR 20/06 A2995 RMK AO2", temperature: 20, windSpeed: 5, windDir: 180, visibility: 10, ceiling: null, conditions: "CLR" },
    { missionId: m3.id, stationId: "KNKX", type: "METAR", rawReport: "KNKX 091200Z 22008KT 8SM SCT060 BKN100 18/12 A2990", temperature: 18, windSpeed: 8, windDir: 220, visibility: 8, ceiling: 6000, conditions: "SCT" },
    { missionId: m5.id, stationId: "KEDW", type: "METAR", rawReport: "KEDW 091400Z 27015G22KT 10SM SCT080 24/07 A2988 RMK AO2 PK WND 28028/1352", temperature: 24, windSpeed: 15, windDir: 270, visibility: 10, ceiling: 8000, conditions: "SCT" },
    { missionId: m6.id, stationId: "KEDW", type: "METAR", rawReport: "KEDW 091500Z 30012KT 10SM FEW200 25/06 A2990 RMK AO2", temperature: 25, windSpeed: 12, windDir: 300, visibility: 10, ceiling: 20000, conditions: "FEW" },
    { missionId: m7.id, stationId: "KEDW", type: "METAR", rawReport: "KEDW 071200Z 20008KT 10SM CLR 19/05 A2998 RMK AO2", temperature: 19, windSpeed: 8, windDir: 200, visibility: 10, ceiling: null, conditions: "CLR" },
  ];

  for (const w of weatherData) {
    await prisma.weatherReport.create({
      data: { ...w, observedAt: new Date() },
    });
  }

  console.log(`Seeded ${weatherData.length} weather reports`);

  // ── Deconfliction Results ──────────────────────────────────────────
  const deconflictions = [
    { missionId: m1.id, conflictType: ConflictType.AIRSPACE, severity: ConflictSeverity.WARNING, description: "Route segment CHARLIE-DELTA passes within 2nm of R-2508 boundary", resolution: ConflictResolution.RESOLVED, resolvedBy: planner.id },
    { missionId: m1.id, conflictType: ConflictType.TIMING, severity: ConflictSeverity.INFO, description: "Mission overlaps with EAGLE EYE ISR orbit window by 30 minutes", resolution: ConflictResolution.ACCEPTED },
    { missionId: m3.id, conflictType: ConflictType.AIRSPACE, severity: ConflictSeverity.CRITICAL, description: "Low-level ingress route enters S-300 engagement envelope for 12nm", resolution: ConflictResolution.UNRESOLVED },
    { missionId: m3.id, conflictType: ConflictType.RESTRICTED_AIRSPACE, severity: ConflictSeverity.WARNING, description: "Egress route clips MOA-Condor East — coordination required", resolution: ConflictResolution.UNRESOLVED },
    { missionId: m5.id, conflictType: ConflictType.TIMING, severity: ConflictSeverity.WARNING, description: "THUNDER RUN timing conflicts with SHADOW STRIKE SEAD window — must depart after SEAD suppression", resolution: ConflictResolution.RESOLVED, resolvedBy: planner.id },
    { missionId: m6.id, conflictType: ConflictType.RESOURCE, severity: ConflictSeverity.INFO, description: "SPARK 6-2 (EA-18G) also tasked for DESERT FALCON escort — verify availability", resolution: ConflictResolution.ACCEPTED },
    { missionId: m8.id, conflictType: ConflictType.AIRSPACE, severity: ConflictSeverity.CRITICAL, description: "Solo route passes directly through S-300 engagement zone with no SEAD support", resolution: ConflictResolution.UNRESOLVED, details: { reason: "Commander rejection — unacceptable risk" } },
    { missionId: m10.id, conflictType: ConflictType.TIMING, severity: ConflictSeverity.WARNING, description: "Escort timing must sync with STEEL RAIN strike package", resolution: ConflictResolution.UNRESOLVED },
  ];

  for (const d of deconflictions) {
    await prisma.deconflictionResult.create({
      data: {
        ...d,
        resolvedAt: d.resolution !== ConflictResolution.UNRESOLVED ? new Date() : undefined,
        details: d.details ?? undefined,
      },
    });
  }

  console.log(`Seeded ${deconflictions.length} deconfliction results`);

  // ── Notifications ──────────────────────────────────────────────────
  const notifications = [
    { userId: planner.id, type: "APPROVAL", title: "Mission Approved", message: "STEEL RAIN - CAS Package Alpha has been approved by Sam Commander", missionId: m1.id },
    { userId: planner.id, type: "APPROVAL", title: "Mission Approved", message: "THUNDER RUN - Interdiction Mission has been approved", missionId: m5.id },
    { userId: planner.id, type: "REJECTION", title: "Mission Rejected", message: "LONE WOLF rejected: Unacceptable risk — route passes through S-300 zone", missionId: m8.id },
    { userId: planner.id, type: "DECONFLICTION_ALERT", title: "Critical Conflict Detected", message: "NIGHT HAWK ingress enters S-300 engagement envelope — immediate replan required", missionId: m3.id },
    { userId: pilot.id, type: "MISSION_ASSIGNED", title: "New Mission Assignment", message: "You are assigned to STEEL RAIN - CAS Package Alpha as VIPER 1-1", missionId: m1.id },
    { userId: pilot.id, type: "MISSION_STATUS", title: "Mission Now Briefed", message: "THUNDER RUN is now in BRIEFED status — report to briefing room", missionId: m5.id },
    { userId: pilot2.id, type: "MISSION_ASSIGNED", title: "New Mission Assignment", message: "You are assigned to EAGLE EYE - ISR Training as SHADOW 2-1", missionId: m2.id },
    { userId: commander.id, type: "REVIEW_REQUESTED", title: "Mission Awaiting Review", message: "NIGHT HAWK - Deep Strike Package submitted for your review", missionId: m3.id },
    { userId: commander.id, type: "MISSION_STATUS", title: "Mission Executing", message: "SHADOW STRIKE - SEAD Package is now EXECUTING", missionId: m6.id },
    { userId: commander.id, type: "DECONFLICTION_ALERT", title: "Unresolved Conflicts", message: "NIGHT HAWK has 2 unresolved conflicts including 1 CRITICAL", missionId: m3.id },
    { userId: planner2.id, type: "MISSION_STATUS", title: "Mission Debriefed", message: "SWIFT SWORD - Tactical Recon has been debriefed", missionId: m7.id },
  ];

  for (const n of notifications) {
    await prisma.notification.create({ data: n });
  }

  console.log(`Seeded ${notifications.length} notifications`);

  // ── Audit Logs ─────────────────────────────────────────────────────
  const auditLogs = [
    { userId: planner.id, action: "CREATE_MISSION", entityType: "MISSION", entityId: m1.id, details: { name: m1.name } },
    { userId: planner.id, action: "ADD_WAYPOINT", entityType: "WAYPOINT", entityId: m1.id, details: { count: 7, mission: m1.name } },
    { userId: planner.id, action: "ADD_AIRCRAFT", entityType: "AIRCRAFT", entityId: m1.id, details: { type: "F-16C Viper", callsign: "VIPER 1-1" } },
    { userId: planner.id, action: "ADD_THREAT", entityType: "THREAT", entityId: m1.id, details: { threat: "SA-6 Gainful" } },
    { userId: planner.id, action: "TRANSITION_STATUS", entityType: "MISSION", entityId: m1.id, details: { from: "DRAFT", to: "PLANNED", name: m1.name } },
    { userId: planner.id, action: "TRANSITION_STATUS", entityType: "MISSION", entityId: m1.id, details: { from: "PLANNED", to: "UNDER_REVIEW", name: m1.name } },
    { userId: commander.id, action: "TRANSITION_STATUS", entityType: "MISSION", entityId: m1.id, details: { from: "UNDER_REVIEW", to: "APPROVED", name: m1.name } },
    { userId: planner.id, action: "CREATE_MISSION", entityType: "MISSION", entityId: m3.id, details: { name: m3.name } },
    { userId: planner.id, action: "ADD_WAYPOINT", entityType: "WAYPOINT", entityId: m3.id, details: { count: 8, mission: m3.name } },
    { userId: planner.id, action: "TRANSITION_STATUS", entityType: "MISSION", entityId: m3.id, details: { from: "DRAFT", to: "UNDER_REVIEW", name: m3.name } },
    { userId: planner.id, action: "CREATE_MISSION", entityType: "MISSION", entityId: m6.id, details: { name: m6.name } },
    { userId: commander.id, action: "TRANSITION_STATUS", entityType: "MISSION", entityId: m6.id, details: { from: "UNDER_REVIEW", to: "APPROVED", name: m6.name } },
    { userId: planner.id, action: "TRANSITION_STATUS", entityType: "MISSION", entityId: m6.id, details: { from: "APPROVED", to: "EXECUTING", name: m6.name } },
    { userId: commander.id, action: "TRANSITION_STATUS", entityType: "MISSION", entityId: m8.id, details: { from: "UNDER_REVIEW", to: "REJECTED", name: m8.name, reason: "S-300 engagement zone" } },
    { userId: planner2.id, action: "CREATE_MISSION", entityType: "MISSION", entityId: m7.id, details: { name: m7.name } },
    { userId: commander.id, action: "TRANSITION_STATUS", entityType: "MISSION", entityId: m7.id, details: { from: "EXECUTING", to: "DEBRIEFED", name: m7.name } },
    { userId: planner.id, action: "LOGIN", entityType: "USER", entityId: planner.id, details: { ip: "10.0.1.42" } },
    { userId: commander.id, action: "LOGIN", entityType: "USER", entityId: commander.id, details: { ip: "10.0.1.10" } },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({ data: log });
  }

  console.log(`Seeded ${auditLogs.length} audit log entries`);

  // ── Mission Versions ───────────────────────────────────────────────
  await prisma.missionVersion.create({
    data: {
      missionId: m1.id,
      version: 1,
      snapshot: { name: m1.name, status: "DRAFT", priority: "HIGH", waypoints: 5 },
      changedBy: planner.id,
      changeType: "Initial creation",
    },
  });
  await prisma.missionVersion.create({
    data: {
      missionId: m1.id,
      version: 2,
      snapshot: { name: m1.name, status: "PLANNED", priority: "CRITICAL", waypoints: 7, aircraft: 2, threats: 3 },
      changedBy: planner.id,
      changeType: "Added aircraft, waypoints, elevated priority",
    },
  });
  await prisma.missionVersion.create({
    data: {
      missionId: m1.id,
      version: 3,
      snapshot: { name: m1.name, status: "APPROVED", priority: "CRITICAL", waypoints: 7, aircraft: 2, threats: 3 },
      changedBy: commander.id,
      changeType: "Commander approved",
    },
  });
  await prisma.missionVersion.create({
    data: {
      missionId: m3.id,
      version: 1,
      snapshot: { name: m3.name, status: "DRAFT", priority: "HIGH", waypoints: 8 },
      changedBy: planner.id,
      changeType: "Initial creation",
    },
  });
  await prisma.missionVersion.create({
    data: {
      missionId: m3.id,
      version: 2,
      snapshot: { name: m3.name, status: "UNDER_REVIEW", priority: "HIGH", waypoints: 8, aircraft: 2, threats: 4, conflicts: 2 },
      changedBy: planner.id,
      changeType: "Submitted for review with unresolved conflicts",
    },
  });

  console.log("Seeded 5 mission versions");

  console.log("\n=== Seed complete ===");
  console.log("Login credentials (all accounts): password123");
  console.log("  planner@mission.mil  (Alex Planner)");
  console.log("  planner2@mission.mil (Riley Strategist)");
  console.log("  pilot@mission.mil    (Jordan Pilot)");
  console.log("  pilot2@mission.mil   (Casey Aviator)");
  console.log("  commander@mission.mil (Sam Commander)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
