import { PrismaClient, Role, ThreatCategory, Lethality } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const planner = await prisma.user.upsert({
    where: { email: "planner@mission.mil" },
    update: {},
    create: {
      email: "planner@mission.mil",
      passwordHash,
      name: "Alex Planner",
      role: Role.PLANNER,
    },
  });

  const pilot = await prisma.user.upsert({
    where: { email: "pilot@mission.mil" },
    update: {},
    create: {
      email: "pilot@mission.mil",
      passwordHash,
      name: "Jordan Pilot",
      role: Role.PILOT,
    },
  });

  const commander = await prisma.user.upsert({
    where: { email: "commander@mission.mil" },
    update: {},
    create: {
      email: "commander@mission.mil",
      passwordHash,
      name: "Sam Commander",
      role: Role.COMMANDER,
    },
  });

  console.log("Seeded users:", { planner: planner.id, pilot: pilot.id, commander: commander.id });

  // Sample threat data for training scenarios
  const threats = [
    { name: "SA-6 Gainful", category: ThreatCategory.SAM, lat: 34.10, lon: -118.20, rangeNm: 13, lethality: Lethality.HIGH, minAltitude: 100, maxAltitude: 40000 },
    { name: "ZSU-23-4 Shilka", category: ThreatCategory.AAA, lat: 34.08, lon: -118.15, rangeNm: 1.5, lethality: Lethality.MEDIUM, minAltitude: 0, maxAltitude: 5000 },
    { name: "SA-18 Igla", category: ThreatCategory.MANPAD, lat: 34.12, lon: -118.30, rangeNm: 3, lethality: Lethality.MEDIUM, minAltitude: 0, maxAltitude: 11000 },
    { name: "EWR Radar", category: ThreatCategory.RADAR, lat: 34.05, lon: -118.10, rangeNm: 50, lethality: Lethality.LOW, minAltitude: 0, maxAltitude: 60000 },
    { name: "MiG-29 CAP", category: ThreatCategory.FIGHTER, lat: 34.20, lon: -118.35, rangeNm: 25, lethality: Lethality.CRITICAL, minAltitude: 0, maxAltitude: 55000 },
  ];

  for (const threat of threats) {
    const existing = await prisma.threat.findFirst({
      where: { name: threat.name },
    });
    if (existing) {
      await prisma.threat.update({
        where: { id: existing.id },
        data: {
          category: threat.category,
          lat: threat.lat,
          lon: threat.lon,
          rangeNm: threat.rangeNm,
          lethality: threat.lethality,
          minAltitude: threat.minAltitude,
          maxAltitude: threat.maxAltitude,
        },
      });
    } else {
      await prisma.threat.create({
        data: {
          name: threat.name,
          category: threat.category,
          lat: threat.lat,
          lon: threat.lon,
          rangeNm: threat.rangeNm,
          lethality: threat.lethality,
          minAltitude: threat.minAltitude,
          maxAltitude: threat.maxAltitude,
        },
      });
    }
  }

  const threatCount = await prisma.threat.count();
  console.log(`Seeded ${threatCount} threats`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
