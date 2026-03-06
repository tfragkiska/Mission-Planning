import { useState, useRef, useEffect } from "react";
import { api } from "../lib/api";
import { exportMapAsPng } from "../map/map-export";

interface ExportMenuProps {
  missionId: string;
  missionName: string;
  mapInstance: any;
}

export default function ExportMenu({ missionId, missionName, mapInstance }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExport(format: string) {
    setOpen(false);

    if (format === "map-png") {
      if (mapInstance) exportMapAsPng(mapInstance, missionName);
      return;
    }

    try {
      const blob = await api.exports.download(missionId, format);
      const extensions: Record<string, string> = {
        csv: "csv",
        "waypoints-csv": "csv",
        kml: "kml",
        geojson: "geojson",
      };
      const prefixes: Record<string, string> = {
        csv: "mission",
        "waypoints-csv": "waypoints",
        kml: "mission",
        geojson: "mission",
      };
      const ext = extensions[format] || "dat";
      const prefix = prefixes[format] || "export";
      downloadBlob(blob, `${prefix}-${missionId.slice(0, 8)}.${ext}`);
    } catch {
      // Export failed silently
    }
  }

  const options = [
    { key: "csv", label: "Export CSV", icon: "CSV" },
    { key: "waypoints-csv", label: "Export Waypoints CSV", icon: "WPT" },
    { key: "kml", label: "Export KML (Google Earth)", icon: "KML" },
    { key: "geojson", label: "Export GeoJSON", icon: "GEO" },
    { key: "map-png", label: "Export Map PNG", icon: "PNG" },
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="glass-panel px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-military-300 hover:text-gray-100 hover:border-military-500 border border-military-700/50 transition-all duration-200 flex items-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        <span className="hidden sm:inline">Export</span>
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 glass-panel border border-military-600/60 rounded-lg shadow-xl shadow-black/40 py-1 min-w-[220px] animate-fade-in">
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleExport(opt.key)}
              className="w-full text-left px-4 py-2.5 text-sm text-military-300 hover:text-white hover:bg-military-700/50 transition-colors flex items-center gap-3"
            >
              <span className="text-[10px] font-bold font-mono tracking-wider text-tactical-500 w-7">
                {opt.icon}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
