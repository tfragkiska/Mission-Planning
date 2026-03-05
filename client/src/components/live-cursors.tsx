import { useEffect, useRef } from "react";
import type { CursorPosition } from "../hooks/use-mission-socket";

interface Props {
  mapInstance: any; // maplibregl.Map
  cursors: Map<string, CursorPosition>;
  onCursorMove: (lat: number, lng: number) => void;
}

const CURSOR_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
];

function getCursorColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export default function LiveCursors({ mapInstance, cursors, onCursorMove }: Props) {
  const cursorElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Handle mousemove on map container to emit cursor position
  useEffect(() => {
    if (!mapInstance) return;

    const canvas = mapInstance.getCanvas?.();
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      try {
        const lngLat = mapInstance.unproject([x, y]);
        if (lngLat) {
          onCursorMove(lngLat.lat, lngLat.lng);
        }
      } catch {
        // Map may not be ready
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mapInstance, onCursorMove]);

  // Update cursor element positions
  useEffect(() => {
    if (!mapInstance || !containerRef.current) return;

    const container = containerRef.current;
    const existingIds = new Set(cursorElementsRef.current.keys());
    const activeIds = new Set<string>();

    for (const [userId, cursor] of cursors) {
      activeIds.add(userId);

      try {
        const point = mapInstance.project([cursor.lng, cursor.lat]);
        if (!point) continue;

        let el = cursorElementsRef.current.get(userId);
        if (!el) {
          el = document.createElement("div");
          el.className = "absolute pointer-events-none transition-all duration-100 ease-out z-50";
          el.style.willChange = "transform";

          const color = getCursorColor(userId);

          el.innerHTML = `
            <div class="relative">
              <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color}; border: 2px solid white; box-shadow: 0 0 6px ${color}80;"></div>
              <div style="position: absolute; top: 16px; left: 8px; background: ${color}; color: white; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px; white-space: nowrap; font-family: monospace;">${cursor.name}</div>
            </div>
          `;

          container.appendChild(el);
          cursorElementsRef.current.set(userId, el);
        }

        el.style.transform = `translate(${point.x - 6}px, ${point.y - 6}px)`;
        el.style.display = "block";
      } catch {
        // Map projection can fail for out-of-bounds coords
      }
    }

    // Remove stale cursors
    for (const id of existingIds) {
      if (!activeIds.has(id)) {
        const el = cursorElementsRef.current.get(id);
        if (el) {
          el.remove();
          cursorElementsRef.current.delete(id);
        }
      }
    }
  }, [mapInstance, cursors]);

  // Update positions on map move/zoom
  useEffect(() => {
    if (!mapInstance) return;

    const updatePositions = () => {
      for (const [userId, cursor] of cursors) {
        const el = cursorElementsRef.current.get(userId);
        if (!el) continue;
        try {
          const point = mapInstance.project([cursor.lng, cursor.lat]);
          if (point) {
            el.style.transform = `translate(${point.x - 6}px, ${point.y - 6}px)`;
          }
        } catch { /* ignore */ }
      }
    };

    mapInstance.on("move", updatePositions);
    mapInstance.on("zoom", updatePositions);

    return () => {
      mapInstance.off("move", updatePositions);
      mapInstance.off("zoom", updatePositions);
    };
  }, [mapInstance, cursors]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const el of cursorElementsRef.current.values()) {
        el.remove();
      }
      cursorElementsRef.current.clear();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden z-50"
    />
  );
}
