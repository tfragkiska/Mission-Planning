import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Mission Planning API",
      version: "1.0.0",
      description: "Military Flight Mission Planning System API",
    },
    servers: [{ url: "/api", description: "API server" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
            role: { type: "string", enum: ["PLANNER", "PILOT", "COMMANDER"] },
          },
        },
        Mission: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            type: { type: "string", enum: ["TRAINING", "OPERATIONAL"] },
            status: { type: "string", enum: ["DRAFT", "PLANNED", "UNDER_REVIEW", "APPROVED", "REJECTED", "BRIEFED", "EXECUTING", "DEBRIEFED"] },
            priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
            scheduledStart: { type: "string", format: "date-time", nullable: true },
            scheduledEnd: { type: "string", format: "date-time", nullable: true },
            commanderComments: { type: "string", nullable: true },
            createdBy: { $ref: "#/components/schemas/User" },
            approvedBy: { $ref: "#/components/schemas/User", nullable: true },
            aircraft: { type: "array", items: { $ref: "#/components/schemas/Aircraft" } },
            crewMembers: { type: "array", items: { $ref: "#/components/schemas/CrewMember" } },
            waypoints: { type: "array", items: { $ref: "#/components/schemas/Waypoint" } },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Waypoint: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            missionId: { type: "string", format: "uuid" },
            sequenceOrder: { type: "integer" },
            name: { type: "string", nullable: true },
            lat: { type: "number" },
            lon: { type: "number" },
            altitude: { type: "number", nullable: true },
            speed: { type: "number", nullable: true },
            type: { type: "string", enum: ["INITIAL_POINT", "WAYPOINT", "TARGET", "EGRESS_POINT", "LANDING", "RALLY_POINT"] },
          },
        },
        Aircraft: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            type: { type: "string" },
            tailNumber: { type: "string" },
            callsign: { type: "string" },
          },
        },
        CrewMember: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            role: { type: "string" },
            aircraftId: { type: "string", format: "uuid", nullable: true },
          },
        },
        Threat: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            category: { type: "string", enum: ["SAM", "AAA", "MANPAD", "RADAR", "FIGHTER", "OTHER"] },
            lat: { type: "number" },
            lon: { type: "number" },
            rangeNm: { type: "number" },
            lethality: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
            active: { type: "boolean" },
          },
        },
        WeatherReport: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            stationId: { type: "string" },
            type: { type: "string", enum: ["METAR", "TAF"] },
            rawReport: { type: "string" },
            temperature: { type: "number", nullable: true },
            windSpeed: { type: "number", nullable: true },
            windDir: { type: "number", nullable: true },
            visibility: { type: "number", nullable: true },
          },
        },
        DeconflictionResult: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            conflictType: { type: "string", enum: ["AIRSPACE", "TIMING", "RESOURCE", "RESTRICTED_AIRSPACE"] },
            severity: { type: "string", enum: ["INFO", "WARNING", "CRITICAL"] },
            description: { type: "string" },
            resolution: { type: "string", enum: ["UNRESOLVED", "RESOLVED", "ACCEPTED"] },
          },
        },
        Airspace: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            type: { type: "string", enum: ["RESTRICTED", "PROHIBITED", "MOA", "WARNING", "ALERT", "TFR"] },
            minAltitude: { type: "number", nullable: true },
            maxAltitude: { type: "number", nullable: true },
            active: { type: "boolean" },
            coordinates: { type: "array", items: { type: "array", items: { type: "number" } } },
            notes: { type: "string", nullable: true },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/modules/*/routes.ts", "./src/modules/*/aircraft-routes.ts", "./src/modules/*/feed-routes.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
