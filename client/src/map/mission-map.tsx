import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Waypoint, Threat } from "../lib/types";

interface Props {
  waypoints: Waypoint[];
  threats: Threat[];
  editable: boolean;
  onMapClick?: (lat: number, lon: number) => void;
  onWaypointDrag?: (id: string, lat: number, lon: number) => void;
  onMapReady?: (map: maplibregl.Map) => void;
}

export default function MissionMap({ waypoints, threats, editable, onMapClick, onWaypointDrag, onMapReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const threatMarkersRef = useRef<maplibregl.Marker[]>([]);
  const onMapClickRef = useRef(onMapClick);
  const onWaypointDragRef = useRef(onWaypointDrag);

  // Keep refs current
  onMapClickRef.current = onMapClick;
  onWaypointDragRef.current = onWaypointDrag;

  // Initialize map once
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
      preserveDrawingBuffer: true,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("click", (e: maplibregl.MapMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.lngLat.lat, e.lngLat.lng);
      }
    });

    mapRef.current = map;
    onMapReady?.(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers and route line when waypoints change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Detect co-located waypoints (same lat/lon) and offset them
    const coordCounts = new Map<string, number>();
    waypoints.forEach((wp) => {
      const key = `${wp.lat.toFixed(5)},${wp.lon.toFixed(5)}`;
      coordCounts.set(key, (coordCounts.get(key) || 0) + 1);
    });
    const coordIndex = new Map<string, number>();

    // Add markers for each waypoint
    waypoints.forEach((wp, i) => {
      const coordKey = `${wp.lat.toFixed(5)},${wp.lon.toFixed(5)}`;
      const totalAtCoord = coordCounts.get(coordKey) || 1;
      const indexAtCoord = coordIndex.get(coordKey) || 0;
      coordIndex.set(coordKey, indexAtCoord + 1);

      // Offset co-located markers so both are visible
      let offsetX = 0;
      let offsetY = 0;
      if (totalAtCoord > 1) {
        const spacing = 18;
        offsetX = (indexAtCoord - (totalAtCoord - 1) / 2) * spacing;
        offsetY = indexAtCoord === 0 ? -spacing : spacing;
      }

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
        offset: [offsetX, offsetY],
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
          onWaypointDragRef.current?.(wp.id, lngLat.lat, lngLat.lng);
        });
      }

      markersRef.current.push(marker);
    });

    // Draw route line
    const routeSourceId = "route-line";
    const lineCoords = waypoints.map((wp) => [wp.lon, wp.lat]);

    if (map.getSource(routeSourceId)) {
      (map.getSource(routeSourceId) as maplibregl.GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: lineCoords,
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
            coordinates: lineCoords,
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
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 100, left: 240, right: 80 },
        maxZoom: 12,
      });
    }
  }, [waypoints, editable]);

  // Update threat markers when threats change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing threat markers
    threatMarkersRef.current.forEach((m) => m.remove());
    threatMarkersRef.current = [];

    // Add markers for each threat
    threats.forEach((t) => {
      const color = t.lethality === "CRITICAL" ? "#dc2626" :
                    t.lethality === "HIGH" ? "#ea580c" :
                    t.lethality === "MEDIUM" ? "#ca8a04" : "#2563eb";

      const el = document.createElement("div");
      el.style.cssText = `
        width: 20px; height: 20px; border-radius: 50%;
        background: ${color}40; border: 2px solid ${color};
        cursor: pointer;
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([t.lon, t.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 15 }).setHTML(
            `<div style="color:#000">
              <strong>${t.name}</strong><br/>
              Category: ${t.category}<br/>
              Range: ${t.rangeNm} NM<br/>
              Lethality: ${t.lethality}
            </div>`
          )
        )
        .addTo(map);

      threatMarkersRef.current.push(marker);
    });
  }, [threats]);

  return <div ref={containerRef} className="w-full h-full rounded-lg" />;
}
