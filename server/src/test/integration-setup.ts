/**
 * Integration test setup for Supertest-based API testing.
 *
 * Provides:
 *   - A Supertest agent bound to the Express app
 *   - Valid JWT tokens for each role (PLANNER, PILOT, COMMANDER)
 *   - A globally-mocked Prisma client
 */
import jwt from "jsonwebtoken";
import supertest from "supertest";
import { config } from "../infra/config";

// ---------- JWT token helpers ----------

export interface TestUser {
  userId: string;
  email: string;
  role: "PLANNER" | "PILOT" | "COMMANDER";
  name: string;
}

export const testUsers: Record<string, TestUser> = {
  planner: {
    userId: "planner-user-id",
    email: "planner@test.mil",
    role: "PLANNER",
    name: "Test Planner",
  },
  pilot: {
    userId: "pilot-user-id",
    email: "pilot@test.mil",
    role: "PILOT",
    name: "Test Pilot",
  },
  commander: {
    userId: "commander-user-id",
    email: "commander@test.mil",
    role: "COMMANDER",
    name: "Test Commander",
  },
};

export function generateToken(user: TestUser, expiresInSec = 3600): string {
  return jwt.sign(
    { userId: user.userId, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: expiresInSec },
  );
}

export function generateExpiredToken(user: TestUser): string {
  return jwt.sign(
    { userId: user.userId, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: 0 },
  );
}

/** Pre-built tokens for convenience. */
export const tokens = {
  planner: generateToken(testUsers.planner),
  pilot: generateToken(testUsers.pilot),
  commander: generateToken(testUsers.commander),
};

// ---------- Supertest agent ----------

/**
 * Creates a Supertest agent from the Express app.
 * The app module is imported lazily so that mocks are in place first.
 */
export function createAgent() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { app } = require("../app");
  return supertest(app);
}

// ---------- Mock Prisma ----------

export function createMockPrisma() {
  return {
    mission: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    waypoint: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    weatherReport: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    threat: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    missionThreat: {
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    deconflictionResult: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    aircraft: {
      findMany: jest.fn(),
    },
    missionVersion: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    crewMember: {
      findMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    airspace: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn((callbacks: Promise<unknown>[]) =>
      Promise.all(callbacks),
    ),
  };
}
