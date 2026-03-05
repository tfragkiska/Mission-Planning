# Military Flight Mission Planning Software — Design Document

**Date:** 2026-03-05
**Status:** Approved
**Architecture:** Modular Monolith

---

## 1. Overview

A web-based military flight mission planning system that supports training and operational/combat missions across fixed-wing, rotary-wing, and UAV/drone platforms. The system generates full briefing packages including documents, visual flight plans, and machine-readable data exports.

## 2. Users & Roles

| Role | Permissions |
|---|---|
| **Planner** | Create/edit missions, set waypoints, assign aircraft/crews, run deconfliction |
| **Pilot** | View assigned missions, access briefing packages, add notes/feedback |
| **Commander** | Review/approve/reject missions, view all missions and analytics |

## 3. Architecture

**Approach:** Modular Monolith — single deployable application with strict internal module boundaries. Each module owns its data layer and exposes well-defined TypeScript interfaces. Modules can be extracted into microservices later if needed.

### 3.1 Core Modules

| Module | Responsibility |
|---|---|
| **Mission** | Mission CRUD, lifecycle management, cloning, templates, versioning |
| **Route** | Waypoint management, route optimization, airspace polygons, altitude profiles |
| **Threat** | Static threat database, dynamic feed ingestion, threat envelope calculations |
| **Weather** | METAR/TAF ingestion, manual overrides, weather overlay data |
| **Deconfliction** | Airspace conflict detection, timing overlap checks, resource contention alerts |
| **Map** | Terrain rendering, layer management, route/threat overlays |
| **Users & Auth** | RBAC, permissions, audit logging |

## 4. Mission Lifecycle

```
Draft -> Planned -> Under Review -> Approved -> Briefed -> Executing -> Debriefed
                        |
                     Rejected (returns to Draft with commander comments)
```

- **Draft:** Planner builds the mission
- **Planned:** Marked ready for review
- **Under Review:** Commander reviews full briefing package
- **Approved/Rejected:** Commander decision; rejection returns to Draft with feedback
- **Briefed:** Pilots have received and acknowledged the briefing
- **Executing:** Mission is underway
- **Debriefed:** Post-mission notes and outcomes recorded

## 5. Data Model

```
Mission
  id, name, type (training/operational), status, priority
  created_by (Planner), approved_by (Commander)
  scheduled_start, scheduled_end
  aircraft[] (type, tail number, callsign)
  crew[] (role, name, assigned_aircraft)
  Route
    waypoints[] (lat, lon, altitude, speed, time_on_target, type)
    ingress_route, egress_route
    altitude_profile
  ThreatOverlay
    static_threats[] (type, location, range, lethality)
    dynamic_threats[] (source, timestamp, location, range)
  WeatherData
    metar[], taf[]
    manual_overrides[]
  DeconflictionResults
    airspace_conflicts[]
    timing_conflicts[]
    resource_conflicts[]
  BriefingPackage
    mission_document (PDF/HTML)
    map_exports[]
    data_exports[] (DTD, XML, custom)
  MissionHistory
    versions[] (full snapshot per change)
    audit_log[] (who changed what, when)
```

**Database:** PostgreSQL + PostGIS for geospatial queries.

## 6. Map & Visualization

**Engine:** MapLibre GL JS

**Layers (toggleable):**

| Layer | Source | Description |
|---|---|---|
| Base terrain | OpenStreetMap / Mapbox tiles | Default basemap |
| Elevation | SRTM (open) / DTED (military) | Terrain contours |
| Threats | Threat module | Colored rings (red = lethal, yellow = detection) |
| Weather | Weather module | Cloud cover, wind barbs, visibility |
| Routes | Route module | Flight paths with waypoint markers, altitude ribbons |
| Airspace | Deconfliction module | Restricted zones, conflict highlights |
| Military imagery | CIB / CADRG | Tactical imagery overlay |

**Key interactions:**
- Click-to-place waypoints
- Drag waypoints to adjust routes (auto-recalculates timing and deconfliction)
- Hover over threats for details
- Synced altitude profile side panel
- Distance/bearing measurement tool

## 7. Deconfliction Engine

**Conflict types:**

| Type | Detection |
|---|---|
| Airspace overlap | PostGIS 3D spatial intersection of route corridors |
| Timing conflicts | Time window overlap for same airspace |
| Resource contention | Same aircraft/crew assigned to overlapping missions |
| Restricted airspace | Route segments through no-fly zones |

**Execution modes:**
- On-demand (planner-triggered)
- Automatic (on route/schedule modification)
- Background (periodic sweep across all missions)

**Severity levels:** Critical (must resolve), Warning (review recommended), Info (awareness only)

Commander cannot approve missions with unresolved critical conflicts. System suggests resolutions where possible.

## 8. External Integrations

### Inbound

| Integration | Protocol | Purpose |
|---|---|---|
| Weather (METAR/TAF) | REST API | Real-time aviation weather |
| Dynamic threat feeds | REST / WebSocket | Live threat intelligence |
| Terrain data (DTED/CIB/CADRG) | File import / tile server | Military-grade mapping |
| C2 systems | REST API / message queue | Mission tasking sync |

### Outbound

| Integration | Format | Purpose |
|---|---|---|
| Briefing documents | PDF / HTML | Printable mission briefs |
| Flight plan export | XML / JSON / custom DTD | Aircraft navigation systems |
| Map exports | PNG / GeoTIFF | Static maps for briefings |
| C2 systems | REST API / message queue | Mission status updates |

Each integration is an **adapter** within its parent module. Adapters implement common interfaces for swappability. Failed connections degrade gracefully with cached/manual data.

## 9. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, MapLibre GL JS, TailwindCSS |
| State management | Zustand |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + PostGIS |
| ORM | Prisma |
| Auth | JWT + RBAC |
| Real-time | Socket.io (threat feeds, future collaboration) |
| PDF generation | Puppeteer or PDFKit |
| Testing | Jest (unit), Playwright (E2E), Supertest (API) |
| API docs | OpenAPI / Swagger |
| Containers | Docker + Docker Compose |
| CI/CD | GitHub Actions |

## 10. Project Structure

```
src/
  modules/
    mission/       (routes, services, models, adapters)
    route/
    threat/
    weather/
    deconfliction/
    map/
    users/
  shared/          (common types, utils, middleware)
  infra/           (database, config, logging)
  app.ts           (module registration, server bootstrap)
client/
  src/
    components/
    pages/
    modules/       (mirrors backend module structure)
    map/           (map engine, layers, interactions)
    stores/
```

## 11. Future Enhancements (Not in V1)

- Configurable real-time collaboration (admin-controlled)
- Mobile/tablet support for in-field briefings
- AI-assisted route optimization
- After-action review with flight data overlay
