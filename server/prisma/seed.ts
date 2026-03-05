import { PrismaClient, Role } from "@prisma/client";
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
