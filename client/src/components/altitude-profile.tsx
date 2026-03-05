import { useRef, useEffect } from "react";
import type { Waypoint } from "../lib/types";

interface Props {
  waypoints: Waypoint[];
}

function haversineDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in NM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function AltitudeProfile({ waypoints }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waypoints.length < 2) return;

    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const PAD_LEFT = 60;
    const PAD_RIGHT = 20;
    const PAD_TOP = 20;
    const PAD_BOTTOM = 40;
    const plotW = W - PAD_LEFT - PAD_RIGHT;
    const plotH = H - PAD_TOP - PAD_BOTTOM;

    // Compute cumulative distances
    const distances: number[] = [0];
    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      distances.push(distances[i - 1] + haversineDistanceNm(prev.lat, prev.lon, curr.lat, curr.lon));
    }

    const totalDist = distances[distances.length - 1] || 1;
    const altitudes = waypoints.map((wp) => wp.altitude || 0);
    const maxAlt = Math.max(...altitudes, 1000);
    const minAlt = 0;

    // Clear
    ctx.fillStyle = "#1a2332";
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = "#2d3a4a";
    ctx.lineWidth = 0.5;
    const altSteps = 5;
    for (let i = 0; i <= altSteps; i++) {
      const y = PAD_TOP + (plotH * i) / altSteps;
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, y);
      ctx.lineTo(PAD_LEFT + plotW, y);
      ctx.stroke();

      // Y-axis labels (altitude)
      const altLabel = Math.round(maxAlt - (maxAlt - minAlt) * (i / altSteps));
      ctx.fillStyle = "#8899aa";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${altLabel}ft`, PAD_LEFT - 8, y + 3);
    }

    // X-axis labels (distance)
    const distSteps = Math.min(5, waypoints.length);
    for (let i = 0; i <= distSteps; i++) {
      const x = PAD_LEFT + (plotW * i) / distSteps;
      const dist = (totalDist * i) / distSteps;
      ctx.fillStyle = "#8899aa";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${dist.toFixed(0)} NM`, x, H - PAD_BOTTOM + 20);
    }

    // Altitude fill
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, PAD_TOP + plotH);
    waypoints.forEach((wp, i) => {
      const x = PAD_LEFT + (distances[i] / totalDist) * plotW;
      const y = PAD_TOP + plotH - ((wp.altitude || 0) / maxAlt) * plotH;
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(PAD_LEFT + plotW, PAD_TOP + plotH);
    ctx.closePath();
    ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
    ctx.fill();

    // Altitude line
    ctx.beginPath();
    waypoints.forEach((wp, i) => {
      const x = PAD_LEFT + (distances[i] / totalDist) * plotW;
      const y = PAD_TOP + plotH - ((wp.altitude || 0) / maxAlt) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Waypoint dots and labels
    waypoints.forEach((wp, i) => {
      const x = PAD_LEFT + (distances[i] / totalDist) * plotW;
      const y = PAD_TOP + plotH - ((wp.altitude || 0) / maxAlt) * plotH;

      // Dot
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#3b82f6";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(wp.name || `WP${i + 1}`, x, y - 12);
      if (wp.altitude) {
        ctx.fillStyle = "#8899aa";
        ctx.font = "9px sans-serif";
        ctx.fillText(`${wp.altitude}ft`, x, y - 2 > PAD_TOP ? y + 18 : y + 18);
      }
    });

    // Axis labels
    ctx.fillStyle = "#8899aa";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Distance (NM)", W / 2, H - 4);

    ctx.save();
    ctx.translate(12, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Altitude (ft)", 0, 0);
    ctx.restore();
  }, [waypoints]);

  if (waypoints.length < 2) {
    return (
      <div className="glass-panel border border-military-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-military-700/50">
          <span className="text-command-400 text-sm font-bold">{"//"}</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-military-300">Altitude Profile</h3>
        </div>
        <p className="text-military-500 text-sm italic">Add at least 2 waypoints to see altitude profile.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel border border-military-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-military-700/50">
        <span className="text-command-400 text-sm font-bold">{"//"}</span>
        <h3 className="text-xs font-bold uppercase tracking-widest text-military-300">Altitude Profile</h3>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg"
        style={{ height: "200px" }}
      />
    </div>
  );
}
