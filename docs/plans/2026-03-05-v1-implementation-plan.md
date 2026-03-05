# V1 Core Slice Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a working mission planning app with Mission, Route, Users, and Map modules — from empty repo to running full-stack application.

**Architecture:** Modular monolith with Express backend, React frontend, PostgreSQL+PostGIS database. Three parallel workstreams: DB/Infrastructure, Backend API, Frontend App. Shared scaffolding is done first, then agents work in parallel.

**Tech Stack:** Node.js, Express, TypeScript, Prisma, PostgreSQL+PostGIS, React, TailwindCSS, Zustand, MapLibre GL JS, Docker Compose, Jest, Supertest

---

## Phase 0: Shared Scaffolding (Sequential — before agents)

### Task 0.1: Initialize Git + Root Config

**Files:**
- Create: `.gitignore`
- Create: `package.json` (root workspace)
- Create: `tsconfig.base.json`

**Step 1: Initialize git repo**

```bash
cd /Users/nikiokos/Documents/Mission-Planning
git init
```

**Step 2: Create .gitignore**

```gitignore
node_modules/
dist/
.env
*.log
.DS_Store
coverage/
.prisma/
```

**Step 3: Create root package.json with workspaces**

```json
{
  "name": "mission-planning",
  "private": true,
  "workspaces": ["server", "client"],
  "scripts": {
    "dev": "concurrently \"npm run dev -w server\" \"npm run dev -w client\"",
    "db:up": "docker compose up -d",
    "db:down": "docker compose down",
    "db:migrate": "npm run migrate -w server",
    "db:seed": "npm run seed -w server"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.4.0"
  }
}
```

**Step 4: Create base tsconfig**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Step 5: Commit**

```bash
git add .gitignore package.json tsconfig.base.json CLAUDE.md docs/
git commit -m "chore: initialize project with root config and design docs"
```

---

## Phase 1: Three Parallel Workstreams

---

## WORKSTREAM A: Database & Infrastructure Agent

### Task A.1: Docker Compose for PostgreSQL + PostGIS

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.env`

**Step 1: Create docker-compose.yml**

```yaml
version: "3.8"
services:
  db:
    image: postgis/postgis:16-3.4
    container_name: mission-planning-db
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ${DB_USER:-mission_planner}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-mission_secret}
      POSTGRES_DB: ${DB_NAME:-mission_planning}
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

**Step 2: Create .env.example and .env**

```env
DB_USER=mission_planner
DB_PASSWORD=mission_secret
DB_NAME=mission_planning
DB_HOST=localhost
DB_PORT=5432
DATABASE_URL=postgresql://mission_planner:mission_secret@localhost:5432/mission_planning
JWT_SECRET=dev-jwt-secret-change-in-production
```

**Step 3: Start the database**

```bash
docker compose up -d
```

**Step 4: Verify PostGIS is available**

```bash
docker exec mission-planning-db psql -U mission_planner -d mission_planning -c "SELECT PostGIS_Version();"
```

Expected: PostGIS version string returned.

**Step 5: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "infra: add Docker Compose for PostgreSQL + PostGIS"
```

### Task A.2: Server Package + Prisma Setup

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`

**Step 1: Create server/package.json**

```json
{
  "name": "server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "migrate": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "seed": "ts-node prisma/seed.ts",
    "test": "jest --runInBand",
    "test:watch": "jest --watch --runInBand"
  },
  "dependencies": {
    "@prisma/client": "^5.12.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.19.0",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.12.0",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "prisma": "^5.12.0",
    "supertest": "^6.3.4",
    "ts-jest": "^29.1.2",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

**Step 2: Create server/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*", "prisma/**/*"]
}
```

**Step 3: Install dependencies**

```bash
cd /Users/nikiokos/Documents/Mission-Planning && npm install
```

**Step 4: Initialize Prisma**

```bash
cd server && npx prisma init
```

**Step 5: Commit**

```bash
git add server/package.json server/tsconfig.json server/prisma/schema.prisma
git commit -m "chore: add server package with Prisma setup"
```

### Task A.3: Prisma Schema — Full Data Model

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Write the Prisma schema**

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

enum Role {
  PLANNER
  PILOT
  COMMANDER
}

enum MissionType {
  TRAINING
  OPERATIONAL
}

enum MissionStatus {
  DRAFT
  PLANNED
  UNDER_REVIEW
  APPROVED
  REJECTED
  BRIEFED
  EXECUTING
  DEBRIEFED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum WaypointType {
  INITIAL_POINT
  WAYPOINT
  TARGET
  EGRESS_POINT
  LANDING
  RALLY_POINT
}

model User {
  id             String    @id @default(uuid())
  email          String    @unique
  passwordHash   String    @map("password_hash")
  name           String
  role           Role
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  createdMissions  Mission[] @relation("CreatedBy")
  approvedMissions Mission[] @relation("ApprovedBy")

  @@map("users")
}

model Mission {
  id                String        @id @default(uuid())
  name              String
  type              MissionType
  status            MissionStatus @default(DRAFT)
  priority          Priority      @default(MEDIUM)
  scheduledStart    DateTime?     @map("scheduled_start")
  scheduledEnd      DateTime?     @map("scheduled_end")
  commanderComments String?       @map("commander_comments")
  createdById       String        @map("created_by_id")
  approvedById      String?       @map("approved_by_id")
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")

  createdBy   User       @relation("CreatedBy", fields: [createdById], references: [id])
  approvedBy  User?      @relation("ApprovedBy", fields: [approvedById], references: [id])
  aircraft    Aircraft[]
  crewMembers CrewMember[]
  waypoints   Waypoint[]

  @@map("missions")
}

model Aircraft {
  id         String   @id @default(uuid())
  missionId  String   @map("mission_id")
  type       String
  tailNumber String   @map("tail_number")
  callsign   String

  mission    Mission      @relation(fields: [missionId], references: [id], onDelete: Cascade)
  crewMembers CrewMember[]

  @@map("aircraft")
}

model CrewMember {
  id         String  @id @default(uuid())
  missionId  String  @map("mission_id")
  aircraftId String? @map("aircraft_id")
  role       String
  name       String

  mission  Mission   @relation(fields: [missionId], references: [id], onDelete: Cascade)
  aircraft Aircraft? @relation(fields: [aircraftId], references: [id], onDelete: SetNull)

  @@map("crew_members")
}

model Waypoint {
  id            String       @id @default(uuid())
  missionId     String       @map("mission_id")
  sequenceOrder Int          @map("sequence_order")
  name          String?
  lat           Float
  lon           Float
  altitude      Float?
  speed         Float?
  timeOnTarget  DateTime?    @map("time_on_target")
  type          WaypointType @default(WAYPOINT)

  mission Mission @relation(fields: [missionId], references: [id], onDelete: Cascade)

  @@unique([missionId, sequenceOrder])
  @@map("waypoints")
}
```

Note: PostGIS geometry columns will be added via a raw SQL migration after the initial Prisma migration, since Prisma doesn't natively support geometry types.

**Step 2: Run migration**

```bash
cd /Users/nikiokos/Documents/Mission-Planning/server
npx prisma migrate dev --name init
```

**Step 3: Verify tables exist**

```bash
docker exec mission-planning-db psql -U mission_planner -d mission_planning -c "\dt"
```

Expected: users, missions, aircraft, crew_members, waypoints tables listed.

**Step 4: Commit**

```bash
git add server/prisma/
git commit -m "feat: add Prisma schema with full V1 data model"
```

### Task A.4: Add PostGIS Geometry Columns

**Files:**
- Create: `server/prisma/migrations/add_postgis_columns.sql` (manual migration)

**Step 1: Create raw SQL migration**

```bash
cd /Users/nikiokos/Documents/Mission-Planning/server
npx prisma migrate dev --name add_postgis_geometry --create-only
```

Then replace the empty migration file content with:

```sql
-- Add PostGIS geometry columns
ALTER TABLE waypoints ADD COLUMN geom geometry(Point, 4326);
CREATE INDEX idx_waypoints_geom ON waypoints USING GIST(geom);

-- Create a trigger to auto-update geom from lat/lon
CREATE OR REPLACE FUNCTION update_waypoint_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lon, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_waypoint_geom
  BEFORE INSERT OR UPDATE OF lat, lon ON waypoints
  FOR EACH ROW
  EXECUTE FUNCTION update_waypoint_geom();
```

**Step 2: Apply migration**

```bash
npx prisma migrate dev
```

**Step 3: Verify geometry column**

```bash
docker exec mission-planning-db psql -U mission_planner -d mission_planning -c "SELECT column_name, udt_name FROM information_schema.columns WHERE table_name='waypoints' AND column_name='geom';"
```

**Step 4: Commit**

```bash
git add server/prisma/
git commit -m "feat: add PostGIS geometry columns and auto-update trigger"
```

### Task A.5: Seed Script

**Files:**
- Create: `server/prisma/seed.ts`

**Step 1: Write seed script**

```typescript
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
```

**Step 2: Add seed config to server/package.json**

Add to server/package.json:
```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

**Step 3: Run seed**

```bash
cd /Users/nikiokos/Documents/Mission-Planning/server && npx prisma db seed
```

**Step 4: Verify users**

```bash
docker exec mission-planning-db psql -U mission_planner -d mission_planning -c "SELECT id, email, role FROM users;"
```

Expected: 3 users listed.

**Step 5: Commit**

```bash
git add server/prisma/seed.ts server/package.json
git commit -m "feat: add database seed script with default users"
```

### Task A.6: Jest Config for Server

**Files:**
- Create: `server/jest.config.ts`

**Step 1: Create Jest config**

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
};

export default config;
```

**Step 2: Commit**

```bash
git add server/jest.config.ts
git commit -m "chore: add Jest config for server"
```

---

## WORKSTREAM B: Backend API Agent

### Task B.1: Express App Skeleton + Shared Infrastructure

**Files:**
- Create: `server/src/app.ts`
- Create: `server/src/infra/database.ts`
- Create: `server/src/infra/config.ts`
- Create: `server/src/shared/errors.ts`
- Create: `server/src/shared/middleware/error-handler.ts`
- Create: `server/src/shared/middleware/auth.ts`
- Create: `server/src/shared/types.ts`

**Step 1: Create config**

```typescript
// server/src/infra/config.ts
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  jwtSecret: process.env.JWT_SECRET || "dev-jwt-secret",
  nodeEnv: process.env.NODE_ENV || "development",
};
```

**Step 2: Create database client**

```typescript
// server/src/infra/database.ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

**Step 3: Create shared types**

```typescript
// server/src/shared/types.ts
import { Request } from "express";
import { Role } from "@prisma/client";

export interface AuthPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}
```

**Step 4: Create custom error classes**

```typescript
// server/src/shared/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
    this.name = "ValidationError";
  }
}
```

**Step 5: Create error handler middleware**

```typescript
// server/src/shared/middleware/error-handler.ts
import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors";
import { ZodError } from "zod";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation error", details: err.errors });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
}
```

**Step 6: Create auth middleware**

```typescript
// server/src/shared/middleware/auth.ts
import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../infra/config";
import { AuthenticatedRequest, AuthPayload } from "../types";
import { UnauthorizedError, ForbiddenError } from "../errors";
import { Role } from "@prisma/client";

export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing token"));
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError("Invalid token"));
  }
}

export function authorize(...roles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError("Insufficient permissions"));
    }
    next();
  };
}
```

**Step 7: Create Express app**

```typescript
// server/src/app.ts
import express from "express";
import cors from "cors";
import { config } from "./infra/config";
import { errorHandler } from "./shared/middleware/error-handler";
import { authRouter } from "./modules/users/routes";
import { missionRouter } from "./modules/mission/routes";
import { waypointRouter } from "./modules/route/routes";

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/missions", missionRouter);
app.use("/api/missions", waypointRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Error handler (must be last)
app.use(errorHandler);

// Only start server if not in test mode
if (config.nodeEnv !== "test") {
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

export { app };
```

**Step 8: Commit**

```bash
git add server/src/
git commit -m "feat: add Express app skeleton with auth middleware and error handling"
```

### Task B.2: Users Module — Auth Service + Routes

**Files:**
- Create: `server/src/modules/users/index.ts`
- Create: `server/src/modules/users/service.ts`
- Create: `server/src/modules/users/routes.ts`
- Create: `server/src/modules/users/validation.ts`
- Create: `server/src/modules/users/service.test.ts`

**Step 1: Write the failing test for login**

```typescript
// server/src/modules/users/service.test.ts
import { authService } from "./service";
import { prisma } from "../../infra/database";
import bcrypt from "bcryptjs";

// Mock prisma
jest.mock("../../infra/database", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("authService", () => {
  describe("login", () => {
    it("returns token and user for valid credentials", async () => {
      const hash = await bcrypt.hash("password123", 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "planner@mission.mil",
        passwordHash: hash,
        name: "Alex Planner",
        role: "PLANNER",
      });

      const result = await authService.login("planner@mission.mil", "password123");

      expect(result.user.email).toBe("planner@mission.mil");
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe("string");
    });

    it("throws for invalid email", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.login("bad@email.com", "password123"))
        .rejects.toThrow("Invalid credentials");
    });

    it("throws for wrong password", async () => {
      const hash = await bcrypt.hash("password123", 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "planner@mission.mil",
        passwordHash: hash,
        name: "Alex Planner",
        role: "PLANNER",
      });

      await expect(authService.login("planner@mission.mil", "wrongpassword"))
        .rejects.toThrow("Invalid credentials");
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/nikiokos/Documents/Mission-Planning/server && npx jest src/modules/users/service.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write auth service**

```typescript
// server/src/modules/users/service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../infra/database";
import { config } from "../../infra/config";
import { UnauthorizedError } from "../../shared/errors";

export const authService = {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: "8h" },
    );

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  },

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedError("User not found");
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  },
};
```

**Step 4: Write validation schemas**

```typescript
// server/src/modules/users/validation.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
```

**Step 5: Write routes**

```typescript
// server/src/modules/users/routes.ts
import { Router, Response, NextFunction } from "express";
import { authService } from "./service";
import { loginSchema } from "./validation";
import { authenticate } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const authRouter = Router();

authRouter.post("/login", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getProfile(req.user!.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
});
```

**Step 6: Write barrel file**

```typescript
// server/src/modules/users/index.ts
export { authRouter } from "./routes";
export { authService } from "./service";
```

**Step 7: Run tests**

```bash
cd /Users/nikiokos/Documents/Mission-Planning/server && npx jest src/modules/users/service.test.ts
```

Expected: 3 tests PASS.

**Step 8: Commit**

```bash
git add server/src/modules/users/
git commit -m "feat: add users module with login, JWT auth, and tests"
```

### Task B.3: Mission Module — Service + Routes

**Files:**
- Create: `server/src/modules/mission/index.ts`
- Create: `server/src/modules/mission/service.ts`
- Create: `server/src/modules/mission/routes.ts`
- Create: `server/src/modules/mission/validation.ts`
- Create: `server/src/modules/mission/service.test.ts`

**Step 1: Write failing tests for mission service**

```typescript
// server/src/modules/mission/service.test.ts
import { missionService } from "./service";
import { prisma } from "../../infra/database";
import { MissionStatus } from "@prisma/client";

jest.mock("../../infra/database", () => ({
  prisma: {
    mission: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe("missionService", () => {
  const mockMission = {
    id: "mission-1",
    name: "Alpha Strike",
    type: "TRAINING",
    status: "DRAFT",
    priority: "MEDIUM",
    scheduledStart: null,
    scheduledEnd: null,
    commanderComments: null,
    createdById: "user-1",
    approvedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("create", () => {
    it("creates a mission in DRAFT status", async () => {
      (prisma.mission.create as jest.Mock).mockResolvedValue(mockMission);

      const result = await missionService.create({
        name: "Alpha Strike",
        type: "TRAINING",
        priority: "MEDIUM",
      }, "user-1");

      expect(prisma.mission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Alpha Strike",
          status: "DRAFT",
          createdById: "user-1",
        }),
        include: expect.any(Object),
      });
      expect(result.name).toBe("Alpha Strike");
    });
  });

  describe("transition", () => {
    it("transitions from DRAFT to PLANNED", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockMission);
      (prisma.mission.update as jest.Mock).mockResolvedValue({
        ...mockMission,
        status: "PLANNED",
      });

      const result = await missionService.transition("mission-1", "PLANNED", "user-1", "PLANNER");

      expect(result.status).toBe("PLANNED");
    });

    it("rejects invalid transition", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue(mockMission);

      await expect(
        missionService.transition("mission-1", "APPROVED", "user-1", "PLANNER"),
      ).rejects.toThrow();
    });
  });

  describe("list", () => {
    it("returns all missions", async () => {
      (prisma.mission.findMany as jest.Mock).mockResolvedValue([mockMission]);

      const result = await missionService.list();

      expect(result).toHaveLength(1);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd /Users/nikiokos/Documents/Mission-Planning/server && npx jest src/modules/mission/service.test.ts
```

**Step 3: Write mission service with lifecycle logic**

```typescript
// server/src/modules/mission/service.ts
import { MissionStatus, MissionType, Priority, Role } from "@prisma/client";
import { prisma } from "../../infra/database";
import { NotFoundError, ForbiddenError, ValidationError } from "../../shared/errors";

const VALID_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  DRAFT: [MissionStatus.PLANNED],
  PLANNED: [MissionStatus.UNDER_REVIEW, MissionStatus.DRAFT],
  UNDER_REVIEW: [MissionStatus.APPROVED, MissionStatus.REJECTED],
  APPROVED: [MissionStatus.BRIEFED],
  REJECTED: [MissionStatus.DRAFT],
  BRIEFED: [MissionStatus.EXECUTING],
  EXECUTING: [MissionStatus.DEBRIEFED],
  DEBRIEFED: [],
};

const TRANSITION_ROLE_REQUIREMENTS: Partial<Record<MissionStatus, Role[]>> = {
  APPROVED: [Role.COMMANDER],
  REJECTED: [Role.COMMANDER],
};

const missionIncludes = {
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  approvedBy: { select: { id: true, name: true, email: true, role: true } },
  aircraft: true,
  crewMembers: true,
  waypoints: { orderBy: { sequenceOrder: "asc" as const } },
};

interface CreateMissionInput {
  name: string;
  type: MissionType | string;
  priority?: Priority | string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export const missionService = {
  async create(input: CreateMissionInput, userId: string) {
    return prisma.mission.create({
      data: {
        name: input.name,
        type: input.type as MissionType,
        priority: (input.priority as Priority) || Priority.MEDIUM,
        status: MissionStatus.DRAFT,
        scheduledStart: input.scheduledStart ? new Date(input.scheduledStart) : null,
        scheduledEnd: input.scheduledEnd ? new Date(input.scheduledEnd) : null,
        createdById: userId,
      },
      include: missionIncludes,
    });
  },

  async list(filters?: { status?: MissionStatus; createdById?: string }) {
    return prisma.mission.findMany({
      where: filters,
      include: missionIncludes,
      orderBy: { updatedAt: "desc" },
    });
  },

  async getById(id: string) {
    const mission = await prisma.mission.findUnique({
      where: { id },
      include: missionIncludes,
    });
    if (!mission) throw new NotFoundError("Mission");
    return mission;
  },

  async update(id: string, data: Partial<CreateMissionInput>, userId: string) {
    const mission = await prisma.mission.findUnique({ where: { id } });
    if (!mission) throw new NotFoundError("Mission");
    if (mission.createdById !== userId) {
      throw new ForbiddenError("Only the mission creator can edit");
    }
    if (mission.status !== MissionStatus.DRAFT) {
      throw new ValidationError("Can only edit missions in DRAFT status");
    }

    return prisma.mission.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type as MissionType }),
        ...(data.priority && { priority: data.priority as Priority }),
        ...(data.scheduledStart && { scheduledStart: new Date(data.scheduledStart) }),
        ...(data.scheduledEnd && { scheduledEnd: new Date(data.scheduledEnd) }),
      },
      include: missionIncludes,
    });
  },

  async delete(id: string, userId: string) {
    const mission = await prisma.mission.findUnique({ where: { id } });
    if (!mission) throw new NotFoundError("Mission");
    if (mission.createdById !== userId) {
      throw new ForbiddenError("Only the mission creator can delete");
    }
    if (mission.status !== MissionStatus.DRAFT) {
      throw new ValidationError("Can only delete missions in DRAFT status");
    }
    await prisma.mission.delete({ where: { id } });
  },

  async transition(
    id: string,
    targetStatus: MissionStatus | string,
    userId: string,
    userRole: Role | string,
    comments?: string,
  ) {
    const mission = await prisma.mission.findUnique({ where: { id } });
    if (!mission) throw new NotFoundError("Mission");

    const target = targetStatus as MissionStatus;
    const allowed = VALID_TRANSITIONS[mission.status];
    if (!allowed.includes(target)) {
      throw new ValidationError(
        `Cannot transition from ${mission.status} to ${target}`,
      );
    }

    const requiredRoles = TRANSITION_ROLE_REQUIREMENTS[target];
    if (requiredRoles && !requiredRoles.includes(userRole as Role)) {
      throw new ForbiddenError(`Only ${requiredRoles.join("/")} can set status to ${target}`);
    }

    const updateData: Record<string, unknown> = { status: target };
    if (target === MissionStatus.APPROVED) {
      updateData.approvedById = userId;
    }
    if (target === MissionStatus.REJECTED && comments) {
      updateData.commanderComments = comments;
    }

    return prisma.mission.update({
      where: { id },
      data: updateData,
      include: missionIncludes,
    });
  },
};
```

**Step 4: Write validation schemas**

```typescript
// server/src/modules/mission/validation.ts
import { z } from "zod";

export const createMissionSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["TRAINING", "OPERATIONAL"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
});

export const updateMissionSchema = createMissionSchema.partial();

export const transitionSchema = z.object({
  status: z.enum([
    "DRAFT", "PLANNED", "UNDER_REVIEW", "APPROVED",
    "REJECTED", "BRIEFED", "EXECUTING", "DEBRIEFED",
  ]),
  comments: z.string().optional(),
});
```

**Step 5: Write routes**

```typescript
// server/src/modules/mission/routes.ts
import { Router, Response, NextFunction } from "express";
import { missionService } from "./service";
import { createMissionSchema, updateMissionSchema, transitionSchema } from "./validation";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const missionRouter = Router();

missionRouter.use(authenticate);

missionRouter.get("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const missions = await missionService.list();
    res.json(missions);
  } catch (err) {
    next(err);
  }
});

missionRouter.get("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const mission = await missionService.getById(req.params.id);
    res.json(mission);
  } catch (err) {
    next(err);
  }
});

missionRouter.post(
  "/",
  authorize("PLANNER"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createMissionSchema.parse(req.body);
      const mission = await missionService.create(data, req.user!.userId);
      res.status(201).json(mission);
    } catch (err) {
      next(err);
    }
  },
);

missionRouter.put("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateMissionSchema.parse(req.body);
    const mission = await missionService.update(req.params.id, data, req.user!.userId);
    res.json(mission);
  } catch (err) {
    next(err);
  }
});

missionRouter.delete("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await missionService.delete(req.params.id, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

missionRouter.post(
  "/:id/transition",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { status, comments } = transitionSchema.parse(req.body);
      const mission = await missionService.transition(
        req.params.id,
        status,
        req.user!.userId,
        req.user!.role,
        comments,
      );
      res.json(mission);
    } catch (err) {
      next(err);
    }
  },
);
```

**Step 6: Write barrel file**

```typescript
// server/src/modules/mission/index.ts
export { missionRouter } from "./routes";
export { missionService } from "./service";
```

**Step 7: Run tests**

```bash
cd /Users/nikiokos/Documents/Mission-Planning/server && npx jest src/modules/mission/service.test.ts
```

Expected: All tests PASS.

**Step 8: Commit**

```bash
git add server/src/modules/mission/
git commit -m "feat: add mission module with CRUD, lifecycle transitions, and tests"
```

### Task B.4: Route Module — Waypoint Service + Routes

**Files:**
- Create: `server/src/modules/route/index.ts`
- Create: `server/src/modules/route/service.ts`
- Create: `server/src/modules/route/routes.ts`
- Create: `server/src/modules/route/validation.ts`
- Create: `server/src/modules/route/service.test.ts`

**Step 1: Write failing tests**

```typescript
// server/src/modules/route/service.test.ts
import { waypointService } from "./service";
import { prisma } from "../../infra/database";

jest.mock("../../infra/database", () => ({
  prisma: {
    waypoint: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    mission: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((fn: Function) => fn(prisma)),
    $queryRaw: jest.fn(),
  },
}));

describe("waypointService", () => {
  const mockWaypoint = {
    id: "wp-1",
    missionId: "mission-1",
    sequenceOrder: 1,
    name: "IP Alpha",
    lat: 34.05,
    lon: -118.25,
    altitude: 5000,
    speed: 250,
    timeOnTarget: null,
    type: "INITIAL_POINT",
  };

  describe("create", () => {
    it("creates a waypoint with next sequence order", async () => {
      (prisma.mission.findUnique as jest.Mock).mockResolvedValue({ id: "mission-1", status: "DRAFT" });
      (prisma.waypoint.count as jest.Mock).mockResolvedValue(0);
      (prisma.waypoint.create as jest.Mock).mockResolvedValue(mockWaypoint);

      const result = await waypointService.create("mission-1", {
        name: "IP Alpha",
        lat: 34.05,
        lon: -118.25,
        altitude: 5000,
        speed: 250,
        type: "INITIAL_POINT",
      });

      expect(result.name).toBe("IP Alpha");
    });
  });

  describe("listByMission", () => {
    it("returns ordered waypoints", async () => {
      (prisma.waypoint.findMany as jest.Mock).mockResolvedValue([mockWaypoint]);

      const result = await waypointService.listByMission("mission-1");

      expect(result).toHaveLength(1);
      expect(prisma.waypoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { missionId: "mission-1" },
          orderBy: { sequenceOrder: "asc" },
        }),
      );
    });
  });
});
```

**Step 2: Run tests to verify failure**

```bash
cd /Users/nikiokos/Documents/Mission-Planning/server && npx jest src/modules/route/service.test.ts
```

**Step 3: Write waypoint service**

```typescript
// server/src/modules/route/service.ts
import { WaypointType } from "@prisma/client";
import { prisma } from "../../infra/database";
import { NotFoundError, ValidationError } from "../../shared/errors";

interface CreateWaypointInput {
  name?: string;
  lat: number;
  lon: number;
  altitude?: number;
  speed?: number;
  timeOnTarget?: string;
  type?: WaypointType | string;
}

interface UpdateWaypointInput extends Partial<CreateWaypointInput> {
  sequenceOrder?: number;
}

export const waypointService = {
  async create(missionId: string, input: CreateWaypointInput) {
    const mission = await prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) throw new NotFoundError("Mission");
    if (mission.status !== "DRAFT") {
      throw new ValidationError("Can only add waypoints to DRAFT missions");
    }

    const count = await prisma.waypoint.count({ where: { missionId } });

    return prisma.waypoint.create({
      data: {
        missionId,
        sequenceOrder: count + 1,
        name: input.name,
        lat: input.lat,
        lon: input.lon,
        altitude: input.altitude,
        speed: input.speed,
        timeOnTarget: input.timeOnTarget ? new Date(input.timeOnTarget) : null,
        type: (input.type as WaypointType) || WaypointType.WAYPOINT,
      },
    });
  },

  async listByMission(missionId: string) {
    return prisma.waypoint.findMany({
      where: { missionId },
      orderBy: { sequenceOrder: "asc" },
    });
  },

  async update(id: string, input: UpdateWaypointInput) {
    const waypoint = await prisma.waypoint.findUnique({ where: { id } });
    if (!waypoint) throw new NotFoundError("Waypoint");

    return prisma.waypoint.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.lat !== undefined && { lat: input.lat }),
        ...(input.lon !== undefined && { lon: input.lon }),
        ...(input.altitude !== undefined && { altitude: input.altitude }),
        ...(input.speed !== undefined && { speed: input.speed }),
        ...(input.type && { type: input.type as WaypointType }),
        ...(input.sequenceOrder !== undefined && { sequenceOrder: input.sequenceOrder }),
      },
    });
  },

  async delete(id: string) {
    const waypoint = await prisma.waypoint.findUnique({ where: { id } });
    if (!waypoint) throw new NotFoundError("Waypoint");
    await prisma.waypoint.delete({ where: { id } });
  },

  async reorder(missionId: string, waypointIds: string[]) {
    const waypoints = await prisma.waypoint.findMany({ where: { missionId } });
    if (waypoints.length !== waypointIds.length) {
      throw new ValidationError("Must include all waypoint IDs");
    }

    await prisma.$transaction(
      waypointIds.map((id, index) =>
        prisma.waypoint.update({
          where: { id },
          data: { sequenceOrder: index + 1 },
        }),
      ),
    );

    return waypointService.listByMission(missionId);
  },
};
```

**Step 4: Write validation**

```typescript
// server/src/modules/route/validation.ts
import { z } from "zod";

export const createWaypointSchema = z.object({
  name: z.string().max(100).optional(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  speed: z.number().positive().optional(),
  timeOnTarget: z.string().datetime().optional(),
  type: z.enum([
    "INITIAL_POINT", "WAYPOINT", "TARGET",
    "EGRESS_POINT", "LANDING", "RALLY_POINT",
  ]).optional(),
});

export const updateWaypointSchema = createWaypointSchema.partial().extend({
  sequenceOrder: z.number().int().positive().optional(),
});

export const reorderWaypointsSchema = z.object({
  waypointIds: z.array(z.string().uuid()),
});
```

**Step 5: Write routes**

```typescript
// server/src/modules/route/routes.ts
import { Router, Response, NextFunction } from "express";
import { waypointService } from "./service";
import { createWaypointSchema, updateWaypointSchema, reorderWaypointsSchema } from "./validation";
import { authenticate } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const waypointRouter = Router();

waypointRouter.use(authenticate);

waypointRouter.get(
  "/:missionId/waypoints",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const waypoints = await waypointService.listByMission(req.params.missionId);
      res.json(waypoints);
    } catch (err) {
      next(err);
    }
  },
);

waypointRouter.post(
  "/:missionId/waypoints",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createWaypointSchema.parse(req.body);
      const waypoint = await waypointService.create(req.params.missionId, data);
      res.status(201).json(waypoint);
    } catch (err) {
      next(err);
    }
  },
);

waypointRouter.put(
  "/:missionId/waypoints/:id",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = updateWaypointSchema.parse(req.body);
      const waypoint = await waypointService.update(req.params.id, data);
      res.json(waypoint);
    } catch (err) {
      next(err);
    }
  },
);

waypointRouter.delete(
  "/:missionId/waypoints/:id",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await waypointService.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

waypointRouter.put(
  "/:missionId/waypoints/reorder",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { waypointIds } = reorderWaypointsSchema.parse(req.body);
      const waypoints = await waypointService.reorder(req.params.missionId, waypointIds);
      res.json(waypoints);
    } catch (err) {
      next(err);
    }
  },
);
```

**Step 6: Write barrel file**

```typescript
// server/src/modules/route/index.ts
export { waypointRouter } from "./routes";
export { waypointService } from "./service";
```

**Step 7: Run tests**

```bash
cd /Users/nikiokos/Documents/Mission-Planning/server && npx jest src/modules/route/service.test.ts
```

**Step 8: Commit**

```bash
git add server/src/modules/route/
git commit -m "feat: add route module with waypoint CRUD, reordering, and tests"
```

---

## WORKSTREAM C: Frontend Agent

### Task C.1: React App Setup with Vite + TailwindCSS

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/index.css`
- Create: `client/src/App.tsx`
- Create: `client/src/vite-env.d.ts`

**Step 1: Create client/package.json**

```json
{
  "name": "client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "maplibre-gl": "^4.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0"
  }
}
```

**Step 2: Create client/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

**Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
```

**Step 4: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        military: {
          900: "#1a1c1e",
          800: "#2d3136",
          700: "#3d4349",
          600: "#4d555c",
          500: "#6b7280",
          400: "#9ca3af",
          300: "#d1d5db",
        },
      },
    },
  },
  plugins: [],
};
```

**Step 5: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 6: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mission Planning</title>
  </head>
  <body class="bg-military-900 text-gray-100">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 7: Create src files**

```css
/* client/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

```typescript
// client/src/vite-env.d.ts
/// <reference types="vite/client" />
```

```tsx
// client/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

```tsx
// client/src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/auth-store";
import LoginPage from "./pages/login-page";
import DashboardPage from "./pages/dashboard-page";
import MissionPage from "./pages/mission-page";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/missions/:id"
        element={
          <ProtectedRoute>
            <MissionPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
```

**Step 8: Install dependencies**

```bash
cd /Users/nikiokos/Documents/Mission-Planning && npm install
```

**Step 9: Commit**

```bash
git add client/
git commit -m "feat: scaffold React app with Vite, TailwindCSS, routing"
```

### Task C.2: API Client + Auth Store

**Files:**
- Create: `client/src/lib/api.ts`
- Create: `client/src/stores/auth-store.ts`
- Create: `client/src/lib/types.ts`

**Step 1: Create shared types**

```typescript
// client/src/lib/types.ts
export type Role = "PLANNER" | "PILOT" | "COMMANDER";
export type MissionStatus =
  | "DRAFT" | "PLANNED" | "UNDER_REVIEW" | "APPROVED"
  | "REJECTED" | "BRIEFED" | "EXECUTING" | "DEBRIEFED";
export type MissionType = "TRAINING" | "OPERATIONAL";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type WaypointType =
  | "INITIAL_POINT" | "WAYPOINT" | "TARGET"
  | "EGRESS_POINT" | "LANDING" | "RALLY_POINT";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Mission {
  id: string;
  name: string;
  type: MissionType;
  status: MissionStatus;
  priority: Priority;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  commanderComments: string | null;
  createdBy: User;
  approvedBy: User | null;
  aircraft: Aircraft[];
  crewMembers: CrewMember[];
  waypoints: Waypoint[];
  createdAt: string;
  updatedAt: string;
}

export interface Aircraft {
  id: string;
  type: string;
  tailNumber: string;
  callsign: string;
}

export interface CrewMember {
  id: string;
  role: string;
  name: string;
  aircraftId: string | null;
}

export interface Waypoint {
  id: string;
  missionId: string;
  sequenceOrder: number;
  name: string | null;
  lat: number;
  lon: number;
  altitude: number | null;
  speed: number | null;
  timeOnTarget: string | null;
  type: WaypointType;
}
```

**Step 2: Create API client**

```typescript
// client/src/lib/api.ts
import { useAuthStore } from "../stores/auth-store";

const BASE_URL = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (res.status === 401) {
    useAuthStore.getState().logout();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: import("./types").User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<import("./types").User>("/auth/me"),
  },
  missions: {
    list: () => request<import("./types").Mission[]>("/missions"),
    get: (id: string) => request<import("./types").Mission>(`/missions/${id}`),
    create: (data: { name: string; type: string; priority?: string; scheduledStart?: string; scheduledEnd?: string }) =>
      request<import("./types").Mission>("/missions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request<import("./types").Mission>(`/missions/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/missions/${id}`, { method: "DELETE" }),
    transition: (id: string, status: string, comments?: string) =>
      request<import("./types").Mission>(`/missions/${id}/transition`, {
        method: "POST",
        body: JSON.stringify({ status, comments }),
      }),
  },
  waypoints: {
    list: (missionId: string) =>
      request<import("./types").Waypoint[]>(`/missions/${missionId}/waypoints`),
    create: (missionId: string, data: { lat: number; lon: number; name?: string; altitude?: number; speed?: number; type?: string }) =>
      request<import("./types").Waypoint>(`/missions/${missionId}/waypoints`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (missionId: string, id: string, data: Record<string, unknown>) =>
      request<import("./types").Waypoint>(`/missions/${missionId}/waypoints/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (missionId: string, id: string) =>
      request<void>(`/missions/${missionId}/waypoints/${id}`, { method: "DELETE" }),
    reorder: (missionId: string, waypointIds: string[]) =>
      request<import("./types").Waypoint[]>(`/missions/${missionId}/waypoints/reorder`, {
        method: "PUT",
        body: JSON.stringify({ waypointIds }),
      }),
  },
};
```

**Step 3: Create auth store**

```typescript
// client/src/stores/auth-store.ts
import { create } from "zustand";
import type { User } from "../lib/types";

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("token"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  setAuth: (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null });
  },
}));
```

**Step 4: Commit**

```bash
git add client/src/lib/ client/src/stores/
git commit -m "feat: add API client, shared types, and auth store"
```

### Task C.3: Login Page

**Files:**
- Create: `client/src/pages/login-page.tsx`

**Step 1: Create login page**

```tsx
// client/src/pages/login-page.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth-store";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await api.auth.login(email, password);
      setAuth(token, user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-military-900">
      <form
        onSubmit={handleSubmit}
        className="bg-military-800 p-8 rounded-lg shadow-xl w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">Mission Planning</h1>
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}
        <div className="mb-4">
          <label className="block text-sm font-medium text-military-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-military-700 border border-military-600 rounded text-gray-100 focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-military-300 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-military-700 border border-military-600 rounded text-gray-100 focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded font-medium transition-colors"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
        <p className="mt-4 text-sm text-military-400 text-center">
          Demo: planner@mission.mil / password123
        </p>
      </form>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/pages/login-page.tsx
git commit -m "feat: add login page"
```

### Task C.4: Dashboard Page

**Files:**
- Create: `client/src/pages/dashboard-page.tsx`
- Create: `client/src/stores/mission-store.ts`
- Create: `client/src/components/mission-card.tsx`
- Create: `client/src/components/create-mission-modal.tsx`
- Create: `client/src/components/layout.tsx`

**Step 1: Create mission store**

```typescript
// client/src/stores/mission-store.ts
import { create } from "zustand";
import type { Mission } from "../lib/types";
import { api } from "../lib/api";

interface MissionState {
  missions: Mission[];
  currentMission: Mission | null;
  loading: boolean;
  error: string | null;
  fetchMissions: () => Promise<void>;
  fetchMission: (id: string) => Promise<void>;
  createMission: (data: { name: string; type: string; priority?: string }) => Promise<Mission>;
  transitionMission: (id: string, status: string, comments?: string) => Promise<void>;
}

export const useMissionStore = create<MissionState>((set, get) => ({
  missions: [],
  currentMission: null,
  loading: false,
  error: null,

  fetchMissions: async () => {
    set({ loading: true, error: null });
    try {
      const missions = await api.missions.list();
      set({ missions, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to fetch", loading: false });
    }
  },

  fetchMission: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const mission = await api.missions.get(id);
      set({ currentMission: mission, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to fetch", loading: false });
    }
  },

  createMission: async (data) => {
    const mission = await api.missions.create(data);
    set({ missions: [mission, ...get().missions] });
    return mission;
  },

  transitionMission: async (id, status, comments) => {
    const mission = await api.missions.transition(id, status, comments);
    set({
      currentMission: mission,
      missions: get().missions.map((m) => (m.id === id ? mission : m)),
    });
  },
}));
```

**Step 2: Create layout component**

```tsx
// client/src/components/layout.tsx
import { useAuthStore } from "../stores/auth-store";
import { useNavigate } from "react-router-dom";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-military-900">
      <nav className="bg-military-800 border-b border-military-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1
            className="text-lg font-bold cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            Mission Planning
          </h1>
          {user && (
            <span className="text-sm text-military-400">
              {user.name} ({user.role})
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-military-400 hover:text-gray-100 transition-colors"
        >
          Sign Out
        </button>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

**Step 3: Create mission card**

```tsx
// client/src/components/mission-card.tsx
import { useNavigate } from "react-router-dom";
import type { Mission } from "../lib/types";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-600",
  PLANNED: "bg-blue-600",
  UNDER_REVIEW: "bg-yellow-600",
  APPROVED: "bg-green-600",
  REJECTED: "bg-red-600",
  BRIEFED: "bg-purple-600",
  EXECUTING: "bg-orange-600",
  DEBRIEFED: "bg-gray-500",
};

export default function MissionCard({ mission }: { mission: Mission }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/missions/${mission.id}`)}
      className="bg-military-800 border border-military-700 rounded-lg p-4 cursor-pointer hover:border-military-500 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-lg">{mission.name}</h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[mission.status]}`}>
          {mission.status.replace("_", " ")}
        </span>
      </div>
      <div className="text-sm text-military-400 space-y-1">
        <p>Type: {mission.type} | Priority: {mission.priority}</p>
        <p>Created by: {mission.createdBy.name}</p>
        <p>Waypoints: {mission.waypoints.length}</p>
        {mission.scheduledStart && (
          <p>Scheduled: {new Date(mission.scheduledStart).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Create mission modal**

```tsx
// client/src/components/create-mission-modal.tsx
import { useState } from "react";
import { useMissionStore } from "../stores/mission-store";
import { useNavigate } from "react-router-dom";

interface Props {
  onClose: () => void;
}

export default function CreateMissionModal({ onClose }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState("TRAINING");
  const [priority, setPriority] = useState("MEDIUM");
  const [error, setError] = useState("");
  const createMission = useMissionStore((s) => s.createMission);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const mission = await createMission({ name, type, priority });
      navigate(`/missions/${mission.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-military-800 p-6 rounded-lg w-full max-w-md"
      >
        <h2 className="text-xl font-bold mb-4">New Mission</h2>
        {error && (
          <div className="bg-red-900/50 text-red-200 px-3 py-2 rounded mb-3 text-sm">{error}</div>
        )}
        <div className="mb-3">
          <label className="block text-sm text-military-300 mb-1">Mission Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-military-700 border border-military-600 rounded text-gray-100 focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm text-military-300 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 bg-military-700 border border-military-600 rounded text-gray-100"
          >
            <option value="TRAINING">Training</option>
            <option value="OPERATIONAL">Operational</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm text-military-300 mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2 bg-military-700 border border-military-600 rounded text-gray-100"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-military-400 hover:text-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
```

**Step 5: Create dashboard page**

```tsx
// client/src/pages/dashboard-page.tsx
import { useEffect, useState } from "react";
import Layout from "../components/layout";
import MissionCard from "../components/mission-card";
import CreateMissionModal from "../components/create-mission-modal";
import { useMissionStore } from "../stores/mission-store";
import { useAuthStore } from "../stores/auth-store";

export default function DashboardPage() {
  const { missions, loading, fetchMissions } = useMissionStore();
  const user = useAuthStore((s) => s.user);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Missions</h2>
          {user?.role === "PLANNER" && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors"
            >
              + New Mission
            </button>
          )}
        </div>

        {loading && <p className="text-military-400">Loading missions...</p>}

        {!loading && missions.length === 0 && (
          <p className="text-military-400">No missions yet.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {missions.map((mission) => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>

        {showCreate && <CreateMissionModal onClose={() => setShowCreate(false)} />}
      </div>
    </Layout>
  );
}
```

**Step 6: Commit**

```bash
git add client/src/
git commit -m "feat: add dashboard page with mission list, create modal, and stores"
```

### Task C.5: Mission Detail Page with Map

**Files:**
- Create: `client/src/pages/mission-page.tsx`
- Create: `client/src/map/mission-map.tsx`
- Create: `client/src/components/waypoint-panel.tsx`
- Create: `client/src/stores/waypoint-store.ts`

**Step 1: Create waypoint store**

```typescript
// client/src/stores/waypoint-store.ts
import { create } from "zustand";
import type { Waypoint } from "../lib/types";
import { api } from "../lib/api";

interface WaypointState {
  waypoints: Waypoint[];
  loading: boolean;
  fetchWaypoints: (missionId: string) => Promise<void>;
  addWaypoint: (missionId: string, data: { lat: number; lon: number; name?: string; altitude?: number; type?: string }) => Promise<void>;
  updateWaypoint: (missionId: string, id: string, data: Record<string, unknown>) => Promise<void>;
  deleteWaypoint: (missionId: string, id: string) => Promise<void>;
}

export const useWaypointStore = create<WaypointState>((set, get) => ({
  waypoints: [],
  loading: false,

  fetchWaypoints: async (missionId) => {
    set({ loading: true });
    const waypoints = await api.waypoints.list(missionId);
    set({ waypoints, loading: false });
  },

  addWaypoint: async (missionId, data) => {
    const waypoint = await api.waypoints.create(missionId, data);
    set({ waypoints: [...get().waypoints, waypoint] });
  },

  updateWaypoint: async (missionId, id, data) => {
    const updated = await api.waypoints.update(missionId, id, data);
    set({ waypoints: get().waypoints.map((w) => (w.id === id ? updated : w)) });
  },

  deleteWaypoint: async (missionId, id) => {
    await api.waypoints.delete(missionId, id);
    set({ waypoints: get().waypoints.filter((w) => w.id !== id) });
  },
}));
```

**Step 2: Create map component**

```tsx
// client/src/map/mission-map.tsx
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Waypoint } from "../lib/types";

interface Props {
  waypoints: Waypoint[];
  editable: boolean;
  onMapClick?: (lat: number, lon: number) => void;
  onWaypointDrag?: (id: string, lat: number, lon: number) => void;
}

export default function MissionMap({ waypoints, editable, onMapClick, onWaypointDrag }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: [0, 30],
      zoom: 3,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    if (editable) {
      map.on("click", (e) => {
        onMapClick?.(e.lngLat.lat, e.lngLat.lng);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [editable, onMapClick]);

  // Update markers and route line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add markers for each waypoint
    waypoints.forEach((wp, i) => {
      const el = document.createElement("div");
      el.className = "waypoint-marker";
      el.style.cssText = `
        width: 28px; height: 28px; border-radius: 50%;
        background: #2563eb; border: 2px solid #fff;
        display: flex; align-items: center; justify-content: center;
        color: white; font-size: 12px; font-weight: bold; cursor: pointer;
      `;
      el.textContent = String(i + 1);

      const marker = new maplibregl.Marker({
        element: el,
        draggable: editable,
      })
        .setLngLat([wp.lon, wp.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div style="color:#000"><strong>${wp.name || `WP ${i + 1}`}</strong><br/>` +
            `${wp.lat.toFixed(4)}, ${wp.lon.toFixed(4)}` +
            `${wp.altitude ? `<br/>Alt: ${wp.altitude}ft` : ""}</div>`,
          ),
        )
        .addTo(map);

      if (editable) {
        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          onWaypointDrag?.(wp.id, lngLat.lat, lngLat.lng);
        });
      }

      markersRef.current.push(marker);
    });

    // Draw route line
    const routeSourceId = "route-line";
    if (map.getSource(routeSourceId)) {
      (map.getSource(routeSourceId) as maplibregl.GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: waypoints.map((wp) => [wp.lon, wp.lat]),
        },
      });
    } else if (waypoints.length >= 2 && map.isStyleLoaded()) {
      map.addSource(routeSourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: waypoints.map((wp) => [wp.lon, wp.lat]),
          },
        },
      });
      map.addLayer({
        id: "route-line-layer",
        type: "line",
        source: routeSourceId,
        paint: {
          "line-color": "#3b82f6",
          "line-width": 3,
          "line-dasharray": [2, 1],
        },
      });
    }

    // Fit bounds if waypoints exist
    if (waypoints.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      waypoints.forEach((wp) => bounds.extend([wp.lon, wp.lat]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 12 });
    }
  }, [waypoints, editable, onWaypointDrag]);

  return <div ref={containerRef} className="w-full h-full rounded-lg" />;
}
```

**Step 3: Create waypoint panel**

```tsx
// client/src/components/waypoint-panel.tsx
import type { Waypoint } from "../lib/types";

interface Props {
  waypoints: Waypoint[];
  editable: boolean;
  onDelete?: (id: string) => void;
}

export default function WaypointPanel({ waypoints, editable, onDelete }: Props) {
  return (
    <div className="bg-military-800 border border-military-700 rounded-lg p-4">
      <h3 className="font-semibold mb-3">Waypoints ({waypoints.length})</h3>
      {waypoints.length === 0 ? (
        <p className="text-sm text-military-400">
          {editable ? "Click on the map to add waypoints" : "No waypoints"}
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {waypoints.map((wp, i) => (
            <div
              key={wp.id}
              className="flex items-center justify-between bg-military-700 rounded px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium text-blue-400 mr-2">#{i + 1}</span>
                <span>{wp.name || `Waypoint ${i + 1}`}</span>
                <span className="text-military-400 ml-2">
                  {wp.lat.toFixed(4)}, {wp.lon.toFixed(4)}
                </span>
                {wp.altitude && (
                  <span className="text-military-400 ml-2">{wp.altitude}ft</span>
                )}
              </div>
              {editable && onDelete && (
                <button
                  onClick={() => onDelete(wp.id)}
                  className="text-red-400 hover:text-red-300 ml-2"
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Create mission detail page**

```tsx
// client/src/pages/mission-page.tsx
import { useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/layout";
import MissionMap from "../map/mission-map";
import WaypointPanel from "../components/waypoint-panel";
import { useMissionStore } from "../stores/mission-store";
import { useWaypointStore } from "../stores/waypoint-store";
import { useAuthStore } from "../stores/auth-store";
import type { MissionStatus } from "../lib/types";

const NEXT_STATUS: Partial<Record<MissionStatus, { label: string; status: MissionStatus; roles: string[] }>> = {
  DRAFT: { label: "Mark as Planned", status: "PLANNED", roles: ["PLANNER"] },
  PLANNED: { label: "Submit for Review", status: "UNDER_REVIEW", roles: ["PLANNER"] },
  UNDER_REVIEW: { label: "Approve", status: "APPROVED", roles: ["COMMANDER"] },
  APPROVED: { label: "Mark as Briefed", status: "BRIEFED", roles: ["PLANNER", "PILOT"] },
  BRIEFED: { label: "Begin Execution", status: "EXECUTING", roles: ["PLANNER"] },
  EXECUTING: { label: "Complete Debrief", status: "DEBRIEFED", roles: ["PLANNER"] },
};

export default function MissionPage() {
  const { id } = useParams<{ id: string }>();
  const { currentMission, fetchMission, transitionMission } = useMissionStore();
  const { waypoints, fetchWaypoints, addWaypoint, updateWaypoint, deleteWaypoint } =
    useWaypointStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (id) {
      fetchMission(id);
      fetchWaypoints(id);
    }
  }, [id, fetchMission, fetchWaypoints]);

  const handleMapClick = useCallback(
    (lat: number, lon: number) => {
      if (id) addWaypoint(id, { lat, lon });
    },
    [id, addWaypoint],
  );

  const handleWaypointDrag = useCallback(
    (waypointId: string, lat: number, lon: number) => {
      if (id) updateWaypoint(id, waypointId, { lat, lon });
    },
    [id, updateWaypoint],
  );

  const handleDelete = useCallback(
    (waypointId: string) => {
      if (id) deleteWaypoint(id, waypointId);
    },
    [id, deleteWaypoint],
  );

  if (!currentMission) {
    return (
      <Layout>
        <p className="text-military-400">Loading mission...</p>
      </Layout>
    );
  }

  const editable = currentMission.status === "DRAFT" && user?.role === "PLANNER";
  const nextAction = NEXT_STATUS[currentMission.status];
  const canTransition = nextAction && user && nextAction.roles.includes(user.role);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{currentMission.name}</h2>
            <p className="text-military-400 text-sm">
              {currentMission.type} | {currentMission.priority} | Status: {currentMission.status.replace("_", " ")}
            </p>
          </div>
          <div className="flex gap-2">
            {currentMission.status === "UNDER_REVIEW" && user?.role === "COMMANDER" && (
              <button
                onClick={() => {
                  const comments = prompt("Rejection reason:");
                  if (comments && id) transitionMission(id, "REJECTED", comments);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-medium"
              >
                Reject
              </button>
            )}
            {canTransition && (
              <button
                onClick={() => id && transitionMission(id, nextAction.status)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
              >
                {nextAction.label}
              </button>
            )}
          </div>
        </div>

        {currentMission.commanderComments && (
          <div className="bg-red-900/30 border border-red-700 rounded px-4 py-3 mb-4">
            <p className="text-sm font-medium text-red-300">Commander feedback:</p>
            <p className="text-sm text-red-200">{currentMission.commanderComments}</p>
          </div>
        )}

        {/* Map + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 h-[600px]">
            <MissionMap
              waypoints={waypoints}
              editable={editable}
              onMapClick={handleMapClick}
              onWaypointDrag={handleWaypointDrag}
            />
          </div>
          <div className="lg:col-span-1">
            <WaypointPanel
              waypoints={waypoints}
              editable={editable}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
```

**Step 5: Commit**

```bash
git add client/src/
git commit -m "feat: add mission detail page with MapLibre map, waypoint management"
```

---

## Phase 2: Integration & Verification (Sequential)

### Task D.1: Start All Services and Smoke Test

**Step 1: Start database**

```bash
cd /Users/nikiokos/Documents/Mission-Planning && docker compose up -d
```

**Step 2: Run migrations and seed**

```bash
cd server && npx prisma migrate dev && npx prisma db seed
```

**Step 3: Start backend**

```bash
npm run dev -w server
```

**Step 4: Start frontend (separate terminal)**

```bash
npm run dev -w client
```

**Step 5: Verify login works**

```bash
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"planner@mission.mil","password":"password123"}'
```

Expected: JSON with token and user object.

**Step 6: Test mission creation**

```bash
TOKEN="<token from step 5>"
curl -X POST http://localhost:3001/api/missions -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"name":"Test Mission","type":"TRAINING"}'
```

Expected: JSON with created mission.

### Task D.2: Run All Tests

```bash
cd /Users/nikiokos/Documents/Mission-Planning/server && npx jest --runInBand
```

Expected: All unit tests pass.

### Task D.3: Final Commit

```bash
git add -A && git commit -m "feat: V1 core slice — mission planning with map-based route planning"
```
