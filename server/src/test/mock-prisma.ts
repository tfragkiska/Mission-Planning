/**
 * Shared Prisma mock helper.
 *
 * Usage in test files:
 *   jest.mock("../../infra/database", () => ({ prisma: createMockPrisma() }));
 *   import { prisma } from "../../infra/database";
 */

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
    $queryRaw: jest.fn(),
    $transaction: jest.fn((callbacks: Promise<unknown>[]) => Promise.all(callbacks)),
  };
}
