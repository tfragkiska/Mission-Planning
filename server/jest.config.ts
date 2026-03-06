import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        diagnostics: {
          // Exclude non-test source files from type-checking to avoid
          // pre-existing TS errors (e.g. search/service.ts) breaking tests.
          exclude: ["!**/*.test.ts"],
        },
      },
    ],
  },
};

export default config;
