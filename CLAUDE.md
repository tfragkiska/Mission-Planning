# Military Flight Mission Planning Software

## Project Overview

Web-based military flight mission planning system supporting training and operational/combat missions across fixed-wing, rotary-wing, and UAV/drone platforms. Generates full briefing packages (documents, visual flight plans, data exports).

## Architecture

**Modular Monolith** — single deployable app with strict internal module boundaries. Each module owns its data layer and exposes TypeScript interfaces. Modules can be extracted into microservices later.

### Modules

- `mission` — Mission CRUD, lifecycle, cloning, templates, versioning
- `route` — Waypoints, route optimization, airspace polygons, altitude profiles
- `threat` — Static threat DB, dynamic feed ingestion, threat envelopes
- `weather` — METAR/TAF ingestion, manual overrides, overlays
- `deconfliction` — Airspace/timing/resource conflict detection
- `map` — Terrain rendering, layers, route/threat overlays
- `users` — RBAC (Planner, Pilot, Commander), auth, audit logging

## Tech Stack

- **Frontend:** React, TypeScript, MapLibre GL JS, TailwindCSS, Zustand
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL + PostGIS
- **ORM:** Prisma
- **Auth:** JWT + RBAC
- **Real-time:** Socket.io
- **PDF:** Puppeteer or PDFKit
- **Testing:** Jest (unit), Playwright (E2E), Supertest (API)
- **API docs:** OpenAPI / Swagger
- **Containers:** Docker + Docker Compose
- **CI/CD:** GitHub Actions

## Project Structure

```
src/
  modules/
    mission/         routes, services, models, adapters
    route/
    threat/
    weather/
    deconfliction/
    map/
    users/
  shared/            common types, utils, middleware
  infra/             database, config, logging
  app.ts             module registration, server bootstrap
client/
  src/
    components/
    pages/
    modules/         mirrors backend module structure
    map/             map engine, layers, interactions
    stores/
docs/
  plans/             design docs and implementation plans
```

## Coding Conventions

- TypeScript strict mode everywhere
- Each module exposes its API through an `index.ts` barrel file
- Inter-module communication through TypeScript interfaces only — no direct imports of internal module files
- Database queries go through Prisma — no raw SQL unless PostGIS requires it
- All API endpoints documented with OpenAPI decorators
- Error handling: use custom error classes per module, caught by global error middleware
- Naming: camelCase for variables/functions, PascalCase for types/classes, kebab-case for files
- Components: functional React components with hooks only, no class components
- State: Zustand stores organized by module in `client/src/stores/`
- Map layers: each layer is a self-contained component in `client/src/map/`

## User Roles

- **Planner** — creates/edits missions, runs deconfliction
- **Pilot** — views assigned missions, accesses briefing packages
- **Commander** — reviews, approves/rejects missions

## Mission Lifecycle

Draft -> Planned -> Under Review -> Approved -> Briefed -> Executing -> Debriefed
(Rejected returns to Draft with commander comments)

## Key Design Decisions

- PostGIS for all geospatial queries (threat envelopes, route corridors, airspace)
- Adapter pattern for all external integrations (weather, threats, C2, terrain data)
- Open-source map data as baseline (OSM, SRTM), military-grade (DTED/CIB/CADRG) when available
- Deconfliction runs on-demand, automatically on changes, and as background sweeps
- Commanders cannot approve missions with unresolved critical conflicts
- Collaboration is single-user for V1, configurable multi-user planned for V2

## Testing Requirements

- Unit tests for all service layer logic
- Integration tests for API endpoints with Supertest
- E2E tests for critical user flows with Playwright
- Deconfliction engine requires high test coverage — spatial edge cases matter

## Design Document

Full design: `docs/plans/2026-03-05-mission-planning-software-design.md`
