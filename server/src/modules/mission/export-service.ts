import { prisma } from "../../infra/database";
import { NotFoundError } from "../../shared/errors";

const missionIncludes = {
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  approvedBy: { select: { id: true, name: true, email: true, role: true } },
  aircraft: true,
  crewMembers: true,
  waypoints: { orderBy: { sequenceOrder: "asc" as const } },
};

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toISOString();
}

export const exportService = {
  async exportMissionCSV(missionId: string): Promise<string> {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: missionIncludes,
    });
    if (!mission) throw new NotFoundError("Mission");

    const lines: string[] = [];

    // Mission header section
    lines.push("MISSION DETAILS");
    lines.push(`Name,${escapeCSV(mission.name)}`);
    lines.push(`ID,${escapeCSV(mission.id)}`);
    lines.push(`Status,${escapeCSV(mission.status)}`);
    lines.push(`Type,${escapeCSV(mission.type)}`);
    lines.push(`Priority,${escapeCSV(mission.priority)}`);
    lines.push(`Created By,${escapeCSV(mission.createdBy.name)}`);
    lines.push(`Approved By,${escapeCSV(mission.approvedBy?.name ?? "")}`);
    lines.push(`Scheduled Start,${escapeCSV(formatDate(mission.scheduledStart))}`);
    lines.push(`Scheduled End,${escapeCSV(formatDate(mission.scheduledEnd))}`);
    lines.push(`Created At,${escapeCSV(formatDate(mission.createdAt))}`);
    lines.push(`Updated At,${escapeCSV(formatDate(mission.updatedAt))}`);
    lines.push("");

    // Aircraft section
    lines.push("AIRCRAFT");
    lines.push("Type,Tail Number,Callsign");
    for (const ac of mission.aircraft) {
      lines.push(`${escapeCSV(ac.type)},${escapeCSV(ac.tailNumber)},${escapeCSV(ac.callsign)}`);
    }
    lines.push("");

    // Crew section
    lines.push("CREW MEMBERS");
    lines.push("Name,Role");
    for (const crew of mission.crewMembers) {
      lines.push(`${escapeCSV(crew.name)},${escapeCSV(crew.role)}`);
    }
    lines.push("");

    // Waypoints section
    lines.push("WAYPOINTS");
    lines.push("Sequence,Name,Latitude,Longitude,Altitude (ft),Speed (kts),Type,Time on Target");
    for (const wp of mission.waypoints) {
      lines.push([
        escapeCSV(wp.sequenceOrder),
        escapeCSV(wp.name),
        escapeCSV(wp.lat),
        escapeCSV(wp.lon),
        escapeCSV(wp.altitude),
        escapeCSV(wp.speed),
        escapeCSV(wp.type),
        escapeCSV(formatDate(wp.timeOnTarget)),
      ].join(","));
    }

    return lines.join("\n");
  },

  async exportWaypointsCSV(missionId: string): Promise<string> {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      select: { id: true },
    });
    if (!mission) throw new NotFoundError("Mission");

    const waypoints = await prisma.waypoint.findMany({
      where: { missionId },
      orderBy: { sequenceOrder: "asc" },
    });

    const lines: string[] = [];
    lines.push("Sequence,Name,Latitude,Longitude,Altitude (ft),Type");
    for (const wp of waypoints) {
      lines.push([
        escapeCSV(wp.sequenceOrder),
        escapeCSV(wp.name),
        escapeCSV(wp.lat),
        escapeCSV(wp.lon),
        escapeCSV(wp.altitude),
        escapeCSV(wp.type),
      ].join(","));
    }

    return lines.join("\n");
  },

  async exportMissionKML(missionId: string): Promise<string> {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: missionIncludes,
    });
    if (!mission) throw new NotFoundError("Mission");

    // Fetch threats associated with this mission
    const missionThreats = await prisma.missionThreat.findMany({
      where: { missionId },
      include: { threat: true },
    });

    const waypoints = mission.waypoints;

    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(mission.name)}</name>
    <description>Mission: ${escapeXml(mission.name)} | Status: ${mission.status} | Type: ${mission.type} | Priority: ${mission.priority}</description>
    <Style id="waypointStyle">
      <IconStyle>
        <color>ff00ff00</color>
        <scale>1.2</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href></Icon>
      </IconStyle>
    </Style>
    <Style id="routeStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>3</width>
      </LineStyle>
    </Style>
    <Style id="threatStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>400000ff</color>
      </PolyStyle>
    </Style>`;

    // Route LineString
    if (waypoints.length >= 2) {
      const coords = waypoints
        .map((wp) => `${wp.lon},${wp.lat},${wp.altitude || 0}`)
        .join(" ");
      kml += `
    <Placemark>
      <name>Route</name>
      <styleUrl>#routeStyle</styleUrl>
      <LineString>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${coords}</coordinates>
      </LineString>
    </Placemark>`;
    }

    // Waypoint Placemarks
    for (const wp of waypoints) {
      kml += `
    <Placemark>
      <name>${escapeXml(wp.name || `WPT ${wp.sequenceOrder}`)}</name>
      <description>Seq: ${wp.sequenceOrder} | Type: ${wp.type} | Alt: ${wp.altitude ?? "N/A"} ft</description>
      <styleUrl>#waypointStyle</styleUrl>
      <Point>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${wp.lon},${wp.lat},${wp.altitude || 0}</coordinates>
      </Point>
    </Placemark>`;
    }

    // Threat circles
    for (const mt of missionThreats) {
      const threat = mt.threat;
      if (!threat.active) continue;
      const circleCoords = generateCircleCoords(threat.lat, threat.lon, threat.rangeNm);
      kml += `
    <Placemark>
      <name>${escapeXml(threat.name)} (${threat.category})</name>
      <description>Lethality: ${threat.lethality} | Range: ${threat.rangeNm} NM</description>
      <styleUrl>#threatStyle</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${circleCoords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
    }

    kml += `
  </Document>
</kml>`;

    return kml;
  },

  async exportMissionGeoJSON(missionId: string): Promise<object> {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: missionIncludes,
    });
    if (!mission) throw new NotFoundError("Mission");

    const missionThreats = await prisma.missionThreat.findMany({
      where: { missionId },
      include: { threat: true },
    });

    const features: object[] = [];
    const waypoints = mission.waypoints;

    // Route line
    if (waypoints.length >= 2) {
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: waypoints.map((wp) => [wp.lon, wp.lat, wp.altitude || 0]),
        },
        properties: {
          featureType: "route",
          missionId: mission.id,
          missionName: mission.name,
        },
      });
    }

    // Waypoint points
    for (const wp of waypoints) {
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [wp.lon, wp.lat, wp.altitude || 0],
        },
        properties: {
          featureType: "waypoint",
          id: wp.id,
          name: wp.name || `WPT ${wp.sequenceOrder}`,
          sequenceOrder: wp.sequenceOrder,
          altitude: wp.altitude,
          speed: wp.speed,
          waypointType: wp.type,
        },
      });
    }

    // Threat circles
    for (const mt of missionThreats) {
      const threat = mt.threat;
      if (!threat.active) continue;
      const circlePoints = generateCircleCoordsArray(threat.lat, threat.lon, threat.rangeNm);
      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [circlePoints],
        },
        properties: {
          featureType: "threat",
          id: threat.id,
          name: threat.name,
          category: threat.category,
          lethality: threat.lethality,
          rangeNm: threat.rangeNm,
        },
      });
    }

    return {
      type: "FeatureCollection",
      features,
    };
  },

  async exportBulkCSV(missionIds: string[]): Promise<string> {
    const sections: string[] = [];

    for (const missionId of missionIds) {
      const csv = await exportService.exportMissionCSV(missionId);
      sections.push(csv);
      sections.push("");
      sections.push("---");
      sections.push("");
    }

    return sections.join("\n");
  },
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate circle coordinates for KML (string format: "lon,lat,0 ...")
 */
function generateCircleCoords(centerLat: number, centerLon: number, radiusNm: number): string {
  const points = generateCircleCoordsArray(centerLat, centerLon, radiusNm);
  return points.map((p) => `${p[0]},${p[1]},0`).join(" ");
}

/**
 * Generate circle coordinates as [lon, lat] array for GeoJSON polygons.
 * Uses 36 points around the circle. Radius in nautical miles converted to degrees.
 */
function generateCircleCoordsArray(centerLat: number, centerLon: number, radiusNm: number): number[][] {
  const points: number[][] = [];
  const radiusDeg = radiusNm / 60; // 1 NM = 1 minute of latitude = 1/60 degree
  const numPoints = 36;

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i * 360) / numPoints;
    const rad = (angle * Math.PI) / 180;
    const lat = centerLat + radiusDeg * Math.cos(rad);
    const lon = centerLon + (radiusDeg * Math.sin(rad)) / Math.cos((centerLat * Math.PI) / 180);
    points.push([lon, lat]);
  }

  return points;
}
