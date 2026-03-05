import { useEffect, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout";
import MissionMap from "../map/mission-map";
import { MapErrorBoundary } from "../map/map-error-boundary";
import WaypointPanel from "../components/waypoint-panel";
import AircraftCrewPanel from "../components/aircraft-crew-panel";
import ThreatPanel from "../components/threat-panel";
import WeatherPanel from "../components/weather-panel";
import DeconflictionPanel from "../components/deconfliction-panel";
import VersionHistoryPanel from "../components/version-history-panel";
import AltitudeProfile from "../components/altitude-profile";
import AirspacePanel from "../components/airspace-panel";
import { updateAirspaceLayers } from "../map/airspace-layer";
import type { Airspace } from "../lib/airspace-types";
import { useMissionStore } from "../stores/mission-store";
import { useWaypointStore } from "../stores/waypoint-store";
import { useAuthStore } from "../stores/auth-store";
import { api } from "../lib/api";
import { exportMapAsPng } from "../map/map-export";
import { useMissionSocket } from "../hooks/use-mission-socket";
import type { MissionStatus, Threat, WeatherReport, DeconflictionResult, Aircraft, CrewMember } from "../lib/types";

const NEXT_STATUS: Partial<Record<MissionStatus, { label: string; status: MissionStatus; roles: string[] }>> = {
  DRAFT: { label: "Mark as Planned", status: "PLANNED", roles: ["PLANNER"] },
  PLANNED: { label: "Submit for Review", status: "UNDER_REVIEW", roles: ["PLANNER"] },
  UNDER_REVIEW: { label: "Approve", status: "APPROVED", roles: ["COMMANDER"] },
  APPROVED: { label: "Mark as Briefed", status: "BRIEFED", roles: ["PLANNER", "PILOT"] },
  BRIEFED: { label: "Begin Execution", status: "EXECUTING", roles: ["PLANNER"] },
  EXECUTING: { label: "Complete Debrief", status: "DEBRIEFED", roles: ["PLANNER"] },
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-military-600 text-military-300 shadow-glow-green",
  PLANNED: "bg-tactical-700 text-tactical-500 shadow-glow-green",
  UNDER_REVIEW: "bg-accent-600/20 text-accent-400 shadow-glow-amber",
  APPROVED: "bg-command-600/20 text-command-400 shadow-glow-blue",
  BRIEFED: "bg-command-500/20 text-command-400 shadow-glow-blue",
  EXECUTING: "bg-tactical-600/20 text-tactical-500 shadow-glow-green animate-pulse-slow",
  DEBRIEFED: "bg-military-700 text-military-400",
  REJECTED: "bg-danger-600/20 text-danger-500",
};

const TYPE_PILL: Record<string, string> = {
  TRAINING: "bg-command-600/20 text-command-400 border border-command-600/30",
  COMBAT: "bg-danger-600/20 text-danger-500 border border-danger-600/30",
  OPERATIONAL: "bg-tactical-600/20 text-tactical-500 border border-tactical-600/30",
};

const PRIORITY_PILL: Record<string, string> = {
  LOW: "bg-military-700 text-military-400 border border-military-600",
  MEDIUM: "bg-accent-600/15 text-accent-400 border border-accent-600/30",
  HIGH: "bg-danger-600/15 text-danger-500 border border-danger-600/30",
  CRITICAL: "bg-danger-600/25 text-danger-500 border border-danger-500/40 animate-pulse-slow",
};

export default function MissionPage() {
  const { id } = useParams<{ id: string }>();
  const { currentMission, fetchMission, transitionMission } = useMissionStore();
  const { waypoints, fetchWaypoints, addWaypoint, updateWaypoint, deleteWaypoint } =
    useWaypointStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [missionAircraft, setMissionAircraft] = useState<Aircraft[]>([]);
  const [missionCrew, setMissionCrew] = useState<CrewMember[]>([]);
  const [missionThreats, setMissionThreats] = useState<Threat[]>([]);
  const [weatherReports, setWeatherReports] = useState<WeatherReport[]>([]);
  const [deconflictionResults, setDeconflictionResults] = useState<DeconflictionResult[]>([]);
  const [deconflictionLoading, setDeconflictionLoading] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [airspaces, setAirspaces] = useState<Airspace[]>([]);
  const [visibleAirspaceIds, setVisibleAirspaceIds] = useState<Set<string>>(new Set());

  const refetchMission = useCallback(() => { if (id) fetchMission(id); }, [id, fetchMission]);
  const refetchWaypoints = useCallback(() => { if (id) fetchWaypoints(id); }, [id, fetchWaypoints]);
  const refetchThreats = useCallback(() => {
    if (id) api.threats.listByMission(id).then(setMissionThreats).catch(() => {});
  }, [id]);
  const refetchWeather = useCallback(() => {
    if (id) api.weather.list(id).then(setWeatherReports).catch(() => {});
  }, [id]);
  const refetchDeconfliction = useCallback(() => {
    if (id) api.deconfliction.list(id).then(setDeconflictionResults).catch(() => {});
  }, [id]);
  const refetchAircraft = useCallback(() => {
    if (id) {
      api.aircraft.list(id).then(setMissionAircraft).catch(() => {});
      api.crew.list(id).then(setMissionCrew).catch(() => {});
    }
  }, [id]);

  useMissionSocket({
    missionId: id,
    onMissionUpdated: refetchMission,
    onWaypointsChanged: refetchWaypoints,
    onThreatsChanged: refetchThreats,
    onAircraftChanged: refetchAircraft,
    onWeatherChanged: refetchWeather,
    onDeconflictionChanged: refetchDeconfliction,
  });

  useEffect(() => {
    if (id) {
      fetchMission(id);
      fetchWaypoints(id);
      api.threats.listByMission(id).then(setMissionThreats).catch(() => {});
      api.weather.list(id).then(setWeatherReports).catch(() => {});
      api.deconfliction.list(id).then(setDeconflictionResults).catch(() => {});
    }
    // Load airspaces globally
    api.airspaces.list({ active: true }).then((data: any) => {
      setAirspaces(data);
      setVisibleAirspaceIds(new Set((data as Airspace[]).map((a: Airspace) => a.id)));
    }).catch(() => {});
  }, [id, fetchMission, fetchWaypoints]);

  // Update airspace layers on map when airspaces or visibility changes
  useEffect(() => {
    if (mapInstance && airspaces.length > 0) {
      updateAirspaceLayers(mapInstance, airspaces, visibleAirspaceIds);
    }
  }, [mapInstance, airspaces, visibleAirspaceIds]);

  useEffect(() => {
    if (currentMission) {
      setMissionAircraft(currentMission.aircraft || []);
      setMissionCrew(currentMission.crewMembers || []);
    }
  }, [currentMission]);

  const handleMapClick = useCallback(
    (lat: number, lon: number) => {
      if (id && currentMission?.status === "DRAFT" && user?.role === "PLANNER") {
        addWaypoint(id, { lat, lon });
      }
    },
    [id, addWaypoint, currentMission?.status, user?.role],
  );

  const handleWaypointDrag = useCallback(
    (waypointId: string, lat: number, lon: number) => {
      if (id) updateWaypoint(id, waypointId, { lat, lon });
    },
    [id, updateWaypoint],
  );

  const handleDelete = useCallback(
    (waypointId: string) => {
      if (id) deleteWaypoint(id, waypointId);
    },
    [id, deleteWaypoint],
  );

  const handleAddThreat = useCallback(async (threatId: string) => {
    if (!id) return;
    await api.threats.addToMission(id, threatId);
    const threats = await api.threats.listByMission(id);
    setMissionThreats(threats);
  }, [id]);

  const handleRemoveThreat = useCallback(async (threatId: string) => {
    if (!id) return;
    await api.threats.removeFromMission(id, threatId);
    setMissionThreats((prev) => prev.filter((t) => t.id !== threatId));
  }, [id]);

  const handleAddWeather = useCallback((report: WeatherReport) => {
    setWeatherReports((prev) => [...prev, report]);
  }, []);

  const handleDeleteWeather = useCallback(async (reportId: string) => {
    if (!id) return;
    await api.weather.delete(id, reportId);
    setWeatherReports((prev) => prev.filter((r) => r.id !== reportId));
  }, [id]);

  const handleRunDeconfliction = useCallback(async () => {
    if (!id) return;
    setDeconflictionLoading(true);
    try {
      const results = await api.deconfliction.run(id);
      setDeconflictionResults(results);
    } finally {
      setDeconflictionLoading(false);
    }
  }, [id]);

  const handleResolveConflict = useCallback(async (conflictId: string) => {
    if (!id) return;
    const updated = await api.deconfliction.resolve(id, conflictId);
    setDeconflictionResults((prev) => prev.map((r) => (r.id === conflictId ? updated : r)));
  }, [id]);

  const handleAddAircraft = useCallback(async (data: { type: string; tailNumber: string; callsign: string }) => {
    if (!id) return;
    const ac = await api.aircraft.add(id, data);
    setMissionAircraft((prev) => [...prev, ac]);
  }, [id]);

  const handleRemoveAircraft = useCallback(async (acId: string) => {
    if (!id) return;
    await api.aircraft.remove(id, acId);
    setMissionAircraft((prev) => prev.filter((a) => a.id !== acId));
  }, [id]);

  const handleAddCrew = useCallback(async (data: { name: string; role: string; aircraftId?: string }) => {
    if (!id) return;
    const crew = await api.crew.add(id, data);
    setMissionCrew((prev) => [...prev, crew]);
  }, [id]);

  const handleRemoveCrew = useCallback(async (crewId: string) => {
    if (!id) return;
    await api.crew.remove(id, crewId);
    setMissionCrew((prev) => prev.filter((c) => c.id !== crewId));
  }, [id]);

  const handleClone = async () => {
    if (!id) return;
    const name = prompt("Name for cloned mission:", `${currentMission?.name} (Copy)`);
    if (!name) return;
    try {
      const cloned = await api.missions.clone(id, name);
      navigate(`/missions/${cloned.id}`);
    } catch {}
  };

  const handleSaveTemplate = async () => {
    if (!id) return;
    const templateName = prompt("Template name:");
    if (!templateName) return;
    const description = prompt("Template description (optional):") || undefined;
    try {
      await api.missions.saveAsTemplate(id, templateName, description);
      alert("Saved as template!");
    } catch {}
  };

  if (!currentMission) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-command-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-military-400 font-mono text-sm tracking-wide">LOADING MISSION DATA...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const editable = currentMission.status === "DRAFT" && user?.role === "PLANNER";
  const nextAction = NEXT_STATUS[currentMission.status];
  const canTransition = nextAction && user && nextAction.roles.includes(user.role);

  function handleDownloadBriefing() {
    if (!id) return;
    const token = useAuthStore.getState().token;
    fetch(`/api/missions/${id}/briefing`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mission-briefing-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {});
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-fade-in">
        {/* Mission Header */}
        <div className="glass-panel rounded-xl p-5 mb-5 border border-military-700/50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-3xl font-bold text-gray-100 tracking-tight">{currentMission.name}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_BADGE[currentMission.status] || "bg-military-700 text-military-400"}`}>
                  {currentMission.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${TYPE_PILL[currentMission.type] || "bg-military-700 text-military-400"}`}>
                  {currentMission.type}
                </span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${PRIORITY_PILL[currentMission.priority] || "bg-military-700 text-military-400"}`}>
                  {currentMission.priority} PRIORITY
                </span>
                <span className="w-px h-4 bg-military-600" />
                <span className="text-military-400 text-xs font-mono">ID: {id?.slice(0, 8)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-military-700/50">
            <button
              onClick={handleClone}
              className="glass-panel px-4 py-2 rounded-lg text-sm font-medium text-military-300 hover:text-gray-100 hover:border-military-500 border border-military-700/50 transition-all duration-200"
            >
              Clone
            </button>
            {user?.role === "PLANNER" && (
              <button
                onClick={handleSaveTemplate}
                className="glass-panel px-4 py-2 rounded-lg text-sm font-medium text-military-300 hover:text-gray-100 hover:border-military-500 border border-military-700/50 transition-all duration-200"
              >
                Save as Template
              </button>
            )}
            <button
              onClick={handleDownloadBriefing}
              className="glass-panel px-4 py-2 rounded-lg text-sm font-medium text-military-300 hover:text-gray-100 hover:border-military-500 border border-military-700/50 transition-all duration-200"
            >
              Download Briefing
            </button>
            <button
              onClick={() => mapInstance && exportMapAsPng(mapInstance, currentMission.name)}
              className="glass-panel px-4 py-2 rounded-lg text-sm font-medium text-military-300 hover:text-gray-100 hover:border-military-500 border border-military-700/50 transition-all duration-200"
            >
              Export Map
            </button>

            <span className="flex-1" />

            {currentMission.status === "UNDER_REVIEW" && user?.role === "COMMANDER" && (
              <button
                onClick={() => {
                  const comments = prompt("Rejection reason:");
                  if (comments && id) transitionMission(id, "REJECTED", comments);
                }}
                className="px-5 py-2 bg-danger-600 hover:bg-danger-500 rounded-lg text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 shadow-lg hover:shadow-danger-500/25"
              >
                Reject
              </button>
            )}
            {canTransition && (
              <button
                onClick={() => id && transitionMission(id, nextAction.status)}
                className="px-5 py-2 bg-command-500 hover:bg-command-400 rounded-lg text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 shadow-lg shadow-glow-blue"
              >
                {nextAction.label}
              </button>
            )}
          </div>
        </div>

        {/* Commander Feedback */}
        {currentMission.commanderComments && (
          <div className="glass-panel bg-danger-600/10 border border-danger-600/40 rounded-xl px-5 py-4 mb-5 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-danger-600/20 flex items-center justify-center mt-0.5">
                <span className="text-danger-500 text-lg font-bold">!</span>
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-danger-500 mb-1">Commander Feedback</p>
                <p className="text-sm text-red-200 leading-relaxed">{currentMission.commanderComments}</p>
              </div>
            </div>
          </div>
        )}

        {/* Map + Sidebar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-[600px] rounded-xl overflow-hidden border border-military-700/50 shadow-lg">
            <MapErrorBoundary>
              <MissionMap
                waypoints={waypoints}
                threats={missionThreats}
                editable={editable}
                onMapClick={handleMapClick}
                onWaypointDrag={handleWaypointDrag}
                onMapReady={setMapInstance}
              />
            </MapErrorBoundary>
          </div>
          <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-military-700 scrollbar-track-transparent">
            <WaypointPanel
              waypoints={waypoints}
              editable={editable}
              onDelete={handleDelete}
            />
            <AircraftCrewPanel
              missionId={id || ""}
              aircraft={missionAircraft}
              crewMembers={missionCrew}
              editable={editable}
              onAddAircraft={handleAddAircraft}
              onAddCrew={handleAddCrew}
              onRemoveAircraft={handleRemoveAircraft}
              onRemoveCrew={handleRemoveCrew}
            />
            <ThreatPanel
              missionId={id || ""}
              missionThreats={missionThreats}
              editable={editable}
              onAdd={handleAddThreat}
              onRemove={handleRemoveThreat}
            />
            <WeatherPanel
              missionId={id || ""}
              reports={weatherReports}
              editable={editable}
              onAdd={handleAddWeather}
              onDelete={handleDeleteWeather}
            />
            <DeconflictionPanel
              results={deconflictionResults}
              editable={editable}
              onRunCheck={handleRunDeconfliction}
              onResolve={handleResolveConflict}
              loading={deconflictionLoading}
            />
            <AirspacePanel
              airspaces={airspaces}
              editable={editable}
              onToggleVisibility={(airspaceId, visible) => {
                setVisibleAirspaceIds((prev) => {
                  const next = new Set(prev);
                  if (visible) next.add(airspaceId);
                  else next.delete(airspaceId);
                  return next;
                });
              }}
              onCreateAirspace={async (data) => {
                const created = await api.airspaces.create(data);
                setAirspaces((prev) => [...prev, created as Airspace]);
              }}
              onDeleteAirspace={async (airspaceId) => {
                await api.airspaces.delete(airspaceId);
                setAirspaces((prev) => prev.filter((a) => a.id !== airspaceId));
              }}
            />
            <AltitudeProfile waypoints={waypoints} />
            <VersionHistoryPanel missionId={id!} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
