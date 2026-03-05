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
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("click", (e: maplibregl.MapMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.lngLat.lat, e.lngLat.lng);
      }
    });

    mapRef.current = map;

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
      map.fitBounds(bounds, { padding: 80, maxZoom: 12 });
    }
  }, [waypoints, editable]);

  return <div ref={containerRef} className="w-full h-full rounded-lg" />;
}
