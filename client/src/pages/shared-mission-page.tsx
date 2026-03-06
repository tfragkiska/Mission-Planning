import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MissionMap from "../map/mission-map";
import { MapErrorBoundary } from "../map/map-error-boundary";
import { api } from "../lib/api";
import type { Waypoint, Threat } from "../lib/types";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-gray-600 text-gray-300",
  PLANNED: "bg-green-900 text-green-400",
  UNDER_REVIEW: "bg-amber-900 text-amber-400",
  APPROVED: "bg-blue-900 text-blue-400",
  BRIEFED: "bg-blue-800 text-blue-300",
  EXECUTING: "bg-green-800 text-green-300",
  DEBRIEFED: "bg-gray-700 text-gray-400",
  REJECTED: "bg-red-900 text-red-400",
};

const TYPE_PILL: Record<string, string> = {
  TRAINING: "bg-blue-900/30 text-blue-400 border border-blue-700/40",
  COMBAT: "bg-red-900/30 text-red-400 border border-red-700/40",
  OPERATIONAL: "bg-green-900/30 text-green-400 border border-green-700/40",
};

const PRIORITY_PILL: Record<string, string> = {
  LOW: "bg-gray-700 text-gray-400 border border-gray-600",
  MEDIUM: "bg-amber-900/20 text-amber-400 border border-amber-700/30",
  HIGH: "bg-red-900/20 text-red-400 border border-red-700/30",
  CRITICAL: "bg-red-900/30 text-red-400 border border-red-500/40",
};

export default function SharedMissionPage() {
  const { token } = useParams<{ token: string }>();
  const [mission, setMission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.shared
      .get(token)
      .then((data) => {
        setMission(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Mission not found or sharing has been disabled.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-military-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-command-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-military-400 font-mono text-sm tracking-wide">LOADING SHARED MISSION...</p>
        </div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="min-h-screen bg-military-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-danger-600/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-danger-500 text-2xl font-bold">!</span>
          </div>
          <h1 className="text-xl font-bold text-gray-100 mb-2">Mission Not Available</h1>
          <p className="text-military-400 text-sm">
            {error || "This shared link is invalid or sharing has been disabled for this mission."}
          </p>
        </div>
      </div>
    );
  }

  const waypoints: Waypoint[] = mission.waypoints || [];
  const threats: Threat[] = (mission.missionThreats || []).map((mt: any) => mt.threat);
  const weatherReports = mission.weatherReports || [];
  const aircraft = mission.aircraft || [];
  const crewMembers = mission.crewMembers || [];

  return (
    <div className="min-h-screen bg-military-900 text-gray-100">
      {/* Read-only banner */}
      <div className="bg-command-600/20 border-b border-command-500/30 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-command-400 animate-pulse" />
          <span className="text-command-300 text-sm font-medium tracking-wide uppercase">
            Read-Only Shared View
          </span>
          <span className="text-military-500 text-xs">
            -- This is a shared mission view. No modifications can be made.
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Mission Header */}
        <div className="bg-military-800/60 backdrop-blur border border-military-700/50 rounded-xl p-5 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
                  {mission.name}
                </h1>
                <span
                  className={`self-start px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_BADGE[mission.status] || "bg-gray-700 text-gray-400"}`}
                >
                  {mission.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${TYPE_PILL[mission.type] || "bg-gray-700 text-gray-400"}`}
                >
                  {mission.type}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${PRIORITY_PILL[mission.priority] || "bg-gray-700 text-gray-400"}`}
                >
                  {mission.priority} PRIORITY
                </span>
                {mission.createdBy && (
                  <>
                    <span className="hidden sm:inline w-px h-4 bg-military-600" />
                    <span className="text-military-400 text-xs">
                      Created by {mission.createdBy.name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Schedule info */}
          {(mission.scheduledStart || mission.scheduledEnd) && (
            <div className="flex flex-wrap gap-4 pt-3 border-t border-military-700/50 text-sm text-military-400">
              {mission.scheduledStart && (
                <div>
                  <span className="text-military-500 text-xs uppercase tracking-wide">Start: </span>
                  <span className="font-mono">{new Date(mission.scheduledStart).toLocaleString()}</span>
                </div>
              )}
              {mission.scheduledEnd && (
                <div>
                  <span className="text-military-500 text-xs uppercase tracking-wide">End: </span>
                  <span className="font-mono">{new Date(mission.scheduledEnd).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map + Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Map */}
          <div className="lg:col-span-2 h-[300px] sm:h-[400px] lg:h-[600px] rounded-xl overflow-hidden border border-military-700/50 shadow-lg">
            <MapErrorBoundary>
              <MissionMap
                waypoints={waypoints}
                threats={threats}
                editable={false}
                onMapClick={() => {}}
                onWaypointDrag={() => {}}
              />
            </MapErrorBoundary>
          </div>

          {/* Sidebar details */}
          <div className="lg:col-span-1 space-y-4 lg:max-h-[600px] overflow-y-auto pr-0 lg:pr-1">
            {/* Waypoints */}
            <div className="bg-military-800/60 backdrop-blur border border-military-700/50 rounded-xl p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-military-300 mb-3">
                Waypoints ({waypoints.length})
              </h3>
              {waypoints.length === 0 ? (
                <p className="text-military-500 text-xs">No waypoints defined.</p>
              ) : (
                <div className="space-y-2">
                  {waypoints.map((wp, i) => (
                    <div
                      key={wp.id}
                      className="flex items-center justify-between bg-military-700/40 rounded-lg px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-command-500/20 text-command-400 flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </span>
                        <span className="text-gray-200 font-medium">
                          {wp.name || `WP ${i + 1}`}
                        </span>
                        <span className="text-military-500 uppercase text-[10px]">
                          {wp.type}
                        </span>
                      </div>
                      <div className="text-military-400 font-mono text-[10px]">
                        {wp.lat.toFixed(4)}, {wp.lon.toFixed(4)}
                        {wp.altitude != null && ` | ${wp.altitude}ft`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Aircraft & Crew */}
            {(aircraft.length > 0 || crewMembers.length > 0) && (
              <div className="bg-military-800/60 backdrop-blur border border-military-700/50 rounded-xl p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-military-300 mb-3">
                  Aircraft & Crew
                </h3>
                {aircraft.length > 0 && (
                  <div className="mb-3">
                    <p className="text-military-500 text-[10px] uppercase tracking-wide mb-1">Aircraft</p>
                    {aircraft.map((ac: any) => (
                      <div key={ac.id} className="flex gap-2 text-xs text-gray-300 bg-military-700/40 rounded-lg px-3 py-2 mb-1">
                        <span className="font-medium">{ac.callsign}</span>
                        <span className="text-military-400">{ac.type}</span>
                        <span className="text-military-500 font-mono">{ac.tailNumber}</span>
                      </div>
                    ))}
                  </div>
                )}
                {crewMembers.length > 0 && (
                  <div>
                    <p className="text-military-500 text-[10px] uppercase tracking-wide mb-1">Crew</p>
                    {crewMembers.map((cm: any) => (
                      <div key={cm.id} className="flex gap-2 text-xs text-gray-300 bg-military-700/40 rounded-lg px-3 py-2 mb-1">
                        <span className="font-medium">{cm.name}</span>
                        <span className="text-military-500">{cm.role}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Threats */}
            {threats.length > 0 && (
              <div className="bg-military-800/60 backdrop-blur border border-military-700/50 rounded-xl p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-military-300 mb-3">
                  Threats ({threats.length})
                </h3>
                <div className="space-y-2">
                  {threats.map((t) => (
                    <div key={t.id} className="flex items-center justify-between bg-military-700/40 rounded-lg px-3 py-2 text-xs">
                      <div>
                        <span className="text-gray-200 font-medium">{t.name}</span>
                        <span className="text-military-500 ml-2 uppercase text-[10px]">{t.category}</span>
                      </div>
                      <span className="text-danger-500 text-[10px] font-semibold uppercase">{t.lethality}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weather */}
            {weatherReports.length > 0 && (
              <div className="bg-military-800/60 backdrop-blur border border-military-700/50 rounded-xl p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-military-300 mb-3">
                  Weather Reports ({weatherReports.length})
                </h3>
                <div className="space-y-2">
                  {weatherReports.map((wr: any) => (
                    <div key={wr.id} className="bg-military-700/40 rounded-lg px-3 py-2 text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-200 font-medium">{wr.stationId}</span>
                        <span className="text-military-500 uppercase text-[10px]">{wr.type}</span>
                      </div>
                      <p className="text-military-400 font-mono text-[10px] break-all">{wr.rawReport}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
