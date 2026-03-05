# V1 Core Slice — Design Document

**Date:** 2026-03-05
**Status:** Approved
**Scope:** Mission + Route + Users + Map modules end-to-end

---

## 1. Infrastructure

- Docker Compose: PostgreSQL 16 + PostGIS 3.4
- Backend: Node.js + Express + TypeScript + Prisma
- Frontend: React + TypeScript + TailwindCSS + Zustand + MapLibre GL JS
- OSM raster tiles for map base layer

## 2. Users & Auth

- Pre-seeded users (one per role: Planner, Pilot, Commander)
- Login endpoint with bcrypt password hashing
- JWT tokens + RBAC middleware on all protected routes
- No registration flow in V1

## 3. Mission Module

- CRUD operations (create, read, update, delete)
- Lifecycle transitions: Draft -> Planned -> Under Review -> Approved/Rejected -> Briefed -> Executing -> Debriefed
- Rejection returns to Draft with commander comments
- Assign aircraft (type, tail number, callsign) and crew (role, name)
- Mission fields: name, type (training/operational), status, priority, scheduled_start, scheduled_end

## 4. Route Module

- Waypoint CRUD: lat, lon, altitude, speed, time_on_target, type
- Ordered waypoints per mission
- PostGIS geometry storage (LINESTRING for routes, POINT for waypoints)
- Route distance/bearing calculations via PostGIS

## 5. Map Module (Frontend)

- MapLibre GL JS with OpenStreetMap raster tiles
- Route layer: flight path polylines + waypoint markers
- Click-to-place waypoints on map
- Drag waypoints to reposition (updates route)
- Synced waypoint list sidebar

## 6. Frontend Pages

- Login page
- Dashboard: role-specific mission lists
  - Planner: own missions, create new
  - Pilot: assigned missions
  - Commander: missions pending review
- Mission detail/edit page with embedded map
- Waypoint list panel alongside map

## 7. Database Schema (Core Tables)

- users (id, email, password_hash, name, role, created_at)
- missions (id, name, type, status, priority, created_by, approved_by, scheduled_start, scheduled_end, commander_comments, created_at, updated_at)
- aircraft (id, mission_id, type, tail_number, callsign)
- crew_members (id, mission_id, aircraft_id, role, name)
- waypoints (id, mission_id, sequence_order, lat, lon, altitude, speed, time_on_target, type, geom POINT)
- routes (id, mission_id, geom LINESTRING)

## 8. API Endpoints

### Auth
- POST /api/auth/login
- GET /api/auth/me

### Missions
- GET /api/missions
- GET /api/missions/:id
- POST /api/missions
- PUT /api/missions/:id
- DELETE /api/missions/:id
- POST /api/missions/:id/transition (lifecycle state changes)

### Waypoints
- GET /api/missions/:missionId/waypoints
- POST /api/missions/:missionId/waypoints
- PUT /api/missions/:missionId/waypoints/:id
- DELETE /api/missions/:missionId/waypoints/:id
- PUT /api/missions/:missionId/waypoints/reorder

## 9. Testing

- Jest unit tests for service layer logic
- Supertest integration tests for all API endpoints
- Basic Playwright E2E: login, create mission, add waypoints

## 10. Decisions

- Seed-based auth (no registration) keeps V1 simple while establishing RBAC patterns
- OSM raster tiles avoid API key friction; can swap to vector tiles later
- PostGIS from day one ensures geospatial queries are production-ready
- Prisma handles migrations; raw SQL only for PostGIS-specific operations
