import { useEffect, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout";
import MissionMap from "../map/mission-map";
import { MapErrorBoundary } from "../map/map-error-boundary";
import MapControls from "../components/map-controls";
import WaypointPanel from "../components/waypoint-panel";
import AircraftCrewPanel from "../components/aircraft-crew-panel";
import ThreatPanel from "../components/threat-panel";
import WeatherPanel from "../components/weather-panel";
import DeconflictionPanel from "../components/deconfliction-panel";
import VersionHistoryPanel from "../components/version-history-panel";
import AltitudeProfile from "../components/altitude-profile";
import AirspacePanel from "../components/airspace-panel";
import PresenceIndicator from "../components/presence-indicator";
import EditLockBanner from "../components/edit-lock-banner";
import ActivityFeed from "../components/activity-feed";
import LiveCursors from "../components/live-cursors";
import { updateAirspaceLayers } from "../map/airspace-layer";
import { updateThreatLayers, removeThreatLayers } from "../map/threat-layer";
import { updateRouteCorridor, removeRouteCorridor } from "../map/route-corridor";
import { updateRouteLabels, removeRouteLabels } from "../map/route-labels";
import { switchBasemapStyle } from "../map/map-styles";
import type { Airspace } from "../lib/airspace-types";
import type { MapLayerPreset, MapLayerVisibility, MapStyleId } from "../lib/map-preset-types";
import { useMapPresetStore } from "../stores/map-preset-store";
import { useMissionStore } from "../stores/mission-store";
import { useWaypointStore } from "../stores/waypoint-store";
import { useAuthStore } from "../stores/auth-store";
import { api } from "../lib/api";
import ExportMenu from "../components/export-menu";
import ShareDialog from "../components/share-dialog";
import { useMissionSocket } from "../hooks/use-mission-socket";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";
import { toggleMeasurement } from "../map/measurement-tool";
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
  DRAFT: "bg-[var(--color-border-primary)] text-[var(--color-text-primary)] shadow-glow-green",
  PLANNED: "bg-tactical-700 text-tactical-500 shadow-glow-green",
  UNDER_REVIEW: "bg-accent-600/20 text-accent-400 shadow-glow-amber",
  APPROVED: "bg-command-600/20 text-command-400 shadow-glow-blue",
  BRIEFED: "bg-command-500/20 text-command-400 shadow-glow-blue",
  EXECUTING: "bg-tactical-600/20 text-tactical-500 shadow-glow-green animate-pulse-slow",
  DEBRIEFED: "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]",
  REJECTED: "bg-danger-600/20 text-danger-500",
};

const TYPE_PILL: Record<string, string> = {
  TRAINING: "bg-command-600/20 text-command-400 border border-command-600/30",
  COMBAT: "bg-danger-600/20 text-danger-500 border border-danger-600/30",
  OPERATIONAL: "bg-tactical-600/20 text-tactical-500 border border-tactical-600/30",
};

const PRIORITY_PILL: Record<string, string> = {
  LOW: "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border-primary)]",
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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [airspaces, setAirspaces] = useState<Airspace[]>([]);
  const [visibleAirspaceIds, setVisibleAirspaceIds] = useState<Set<string>>(new Set());
  const [threatLayerVisible, setThreatLayerVisible] = useState(true);
  const [corridorVisible, setCorridorVisible] = useState(true);
  const [labelsVisible, setLabelsVisible] = useState(true);
  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyleId>("dark");
  const clearActivePreset = useMapPresetStore((s) => s.clearActivePreset);

  // Mission page keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "Ctrl+S",
      handler: () => {
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
      },
    },
    {
      key: "Ctrl+E",
      handler: () => {
        if (mapInstance && currentMission) {
          // Dynamically import to avoid issues if exportMapAsPng is not available
          import("../map/map-export").then(({ exportMapAsPng }) => {
            exportMapAsPng(mapInstance, currentMission.name);
          });
        }
      },
    },
    {
      key: "M",
      handler: () => {
        if (mapInstance) toggleMeasurement(mapInstance);
      },
    },
    {
      key: "T",
      handler: () => {
        // Dispatch a click on the terrain toggle button
        const terrainBtn = document.querySelector<HTMLButtonElement>('button[title="Toggle terrain elevation overlay"]');
        if (terrainBtn) terrainBtn.click();
      },
    },
  ]);

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

  const { presenceUsers, cursors, lockState, activities, emitCursorMove } = useMissionSocket({
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

  // Update threat range rings on map
  useEffect(() => {
    if (!mapInstance) return;
    if (threatLayerVisible && missionThreats.length > 0) {
      updateThreatLayers(mapInstance, missionThreats);
    } else {
      removeThreatLayers(mapInstance);
    }
  }, [mapInstance, missionThreats, threatLayerVisible]);

  // Update route corridor on map
  useEffect(() => {
    if (!mapInstance) return;
    if (corridorVisible && waypoints.length >= 2) {
      updateRouteCorridor(mapInstance, waypoints, missionThreats);
    } else {
      removeRouteCorridor(mapInstance);
    }
  }, [mapInstance, waypoints, missionThreats, corridorVisible]);

  // Update distance/bearing labels on map
  useEffect(() => {
    if (!mapInstance) return;
    if (labelsVisible && waypoints.length >= 2) {
      updateRouteLabels(mapInstance, waypoints);
    } else {
      removeRouteLabels(mapInstance);
    }
  }, [mapInstance, waypoints, labelsVisible]);

  useEffect(() => {
    if (currentMission) {
      setMissionAircraft(currentMission.aircraft || []);
      setMissionCrew(currentMission.crewMembers || []);
    }
  }, [currentMission]);

  const currentLayers: MapLayerVisibility = {
    terrain: false,
    threatRings: threatLayerVisible,
    routeCorridor: corridorVisible,
    routeLabels: labelsVisible,
    airspaces: visibleAirspaceIds.size > 0,
    hillshade: false,
    satellite: currentMapStyle === "satellite",
  };

  const reapplyDataLayers = useCallback((
    map: any,
    layers: { threats: boolean; corridor: boolean; labels: boolean },
  ) => {
    if (layers.threats && missionThreats.length > 0) {
      updateThreatLayers(map, missionThreats);
    }
    if (layers.corridor && waypoints.length >= 2) {
      updateRouteCorridor(map, waypoints, missionThreats);
    }
    if (layers.labels && waypoints.length >= 2) {
      updateRouteLabels(map, waypoints);
    }
    if (airspaces.length > 0) {
      updateAirspaceLayers(map, airspaces, visibleAirspaceIds);
    }
  }, [missionThreats, waypoints, airspaces, visibleAirspaceIds]);

  const handleApplyPreset = useCallback((preset: MapLayerPreset) => {
    setThreatLayerVisible(preset.layers.threatRings);
    setCorridorVisible(preset.layers.routeCorridor);
    setLabelsVisible(preset.layers.routeLabels);

    if (preset.mapStyle !== currentMapStyle && mapInstance) {
      setCurrentMapStyle(preset.mapStyle);
      switchBasemapStyle(mapInstance, preset.mapStyle, () => {
        reapplyDataLayers(mapInstance, {
          threats: preset.layers.threatRings,
          corridor: preset.layers.routeCorridor,
          labels: preset.layers.routeLabels,
        });
      });
    }

    if (preset.zoom && mapInstance) {
      mapInstance.setZoom(preset.zoom);
    }
    if (preset.center && mapInstance) {
      mapInstance.setCenter(preset.center);
    }
  }, [currentMapStyle, mapInstance, reapplyDataLayers]);

  const handleChangeBasemap = useCallback((styleId: MapStyleId) => {
    if (!mapInstance || styleId === currentMapStyle) return;
    setCurrentMapStyle(styleId);
    clearActivePreset();
    switchBasemapStyle(mapInstance, styleId, () => {
      reapplyDataLayers(mapInstance, {
        threats: threatLayerVisible,
        corridor: corridorVisible,
        labels: labelsVisible,
      });
    });
  }, [mapInstance, currentMapStyle, threatLayerVisible, corridorVisible, labelsVisible, reapplyDataLayers, clearActivePreset]);

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

  const handleToggleAirspaceVisibility = useCallback((airspaceId: string, visible: boolean) => {
    setVisibleAirspaceIds((prev) => {
      const next = new Set(prev);
      if (visible) next.add(airspaceId);
      else next.delete(airspaceId);
      return next;
    });
  }, []);

  const handleCreateAirspace = useCallback(async (data: Parameters<typeof api.airspaces.create>[0]) => {
    const created = await api.airspaces.create(data);
    setAirspaces((prev) => [...prev, created as Airspace]);
  }, []);

  const handleDeleteAirspace = useCallback(async (airspaceId: string) => {
    await api.airspaces.delete(airspaceId);
    setAirspaces((prev) => prev.filter((a) => a.id !== airspaceId));
  }, []);

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
            <p className="text-[var(--color-text-secondary)] font-mono text-sm tracking-wide">LOADING MISSION DATA...</p>
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
        <div className="glass-panel rounded-xl p-4 sm:p-5 mb-4 sm:mb-5 border border-[var(--color-border-primary)]">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                <h2 className="text-xl sm:text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">{currentMission.name}</h2>
                <span className={`self-start px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_BADGE[currentMission.status] || "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]"}`}>
                  {currentMission.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${TYPE_PILL[currentMission.type] || "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]"}`}>
                  {currentMission.type}
                </span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${PRIORITY_PILL[currentMission.priority] || "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]"}`}>
                  {currentMission.priority} PRIORITY
                </span>
                <span className="hidden sm:inline w-px h-4 bg-[var(--color-border-primary)]" />
                <span className="text-[var(--color-text-secondary)] text-xs font-mono">ID: {id?.slice(0, 8)}</span>
              </div>
            </div>
            <PresenceIndicator users={presenceUsers} currentUserId={user?.id} />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-[var(--color-border-primary)]">
            <button
              onClick={handleClone}
              className="glass-panel px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-primary)] border border-[var(--color-border-primary)] transition-all duration-200"
            >
              Clone
            </button>
            {user?.role === "PLANNER" && (
              <button
                onClick={handleSaveTemplate}
                className="glass-panel px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-primary)] border border-[var(--color-border-primary)] transition-all duration-200"
              >
                <span className="hidden sm:inline">Save as Template</span>
                <span className="sm:hidden">Template</span>
              </button>
            )}
            <button
              onClick={() => navigate(`/missions/${id}/briefing`)}
              className="glass-panel px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-primary)] border border-[var(--color-border-primary)] transition-all duration-200"
            >
              <span className="hidden sm:inline">Preview Briefing</span>
              <span className="sm:hidden">Preview</span>
            </button>
            <button
              onClick={handleDownloadBriefing}
              className="glass-panel px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-primary)] border border-[var(--color-border-primary)] transition-all duration-200"
            >
              <span className="hidden sm:inline">Download Briefing</span>
              <span className="sm:hidden">Briefing</span>
            </button>
            <ExportMenu
              missionId={id || ""}
              missionName={currentMission.name}
              mapInstance={mapInstance}
            />
            {(user?.role === "COMMANDER" || currentMission.createdBy?.id === user?.id) && (
              <button
                onClick={() => setShareDialogOpen(true)}
                className="glass-panel px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-primary)] border border-[var(--color-border-primary)] transition-all duration-200"
              >
                Share
              </button>
            )}

            <span className="flex-1" />

            {currentMission.status === "UNDER_REVIEW" && user?.role === "COMMANDER" && (
              <button
                onClick={() => {
                  const comments = prompt("Rejection reason:");
                  if (comments && id) transitionMission(id, "REJECTED", comments);
                }}
                className="px-4 sm:px-5 py-2 bg-danger-600 hover:bg-danger-500 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wide text-[var(--color-text-primary)] transition-all duration-200 shadow-lg hover:shadow-danger-500/25"
              >
                Reject
              </button>
            )}
            {canTransition && (
              <button
                onClick={() => id && transitionMission(id, nextAction.status)}
                className="px-4 sm:px-5 py-2 bg-command-500 hover:bg-command-400 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wide text-[var(--color-text-primary)] transition-all duration-200 shadow-lg shadow-glow-blue"
              >
                {nextAction.label}
              </button>
            )}
          </div>
        </div>

        {/* Commander Feedback */}
        {currentMission.commanderComments && (
          <div className="glass-panel bg-danger-600/10 border border-danger-600/40 rounded-xl px-4 sm:px-5 py-4 mb-4 sm:mb-5 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-danger-600/20 flex items-center justify-center mt-0.5">
                <span className="text-danger-500 text-lg font-bold">!</span>
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-danger-500 mb-1">Commander Feedback</p>
                <p className="text-sm text-danger-400 leading-relaxed">{currentMission.commanderComments}</p>
              </div>
            </div>
          </div>
        )}

        {/* Edit Lock Banner */}
        {id && (
          <EditLockBanner
            missionId={id}
            lockState={lockState}
            canEdit={currentMission.status === "DRAFT" && user?.role === "PLANNER"}
          />
        )}

        {/* Map + Sidebar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          <div className="lg:col-span-2 h-[300px] sm:h-[400px] lg:h-[600px] rounded-xl overflow-hidden border border-[var(--color-border-primary)] shadow-lg relative">
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
            <LiveCursors
              mapInstance={mapInstance}
              cursors={cursors}
              onCursorMove={emitCursorMove}
            />
            <MapControls
              map={mapInstance}
              threatLayerVisible={threatLayerVisible}
              corridorVisible={corridorVisible}
              labelsVisible={labelsVisible}
              onToggleThreatLayer={() => setThreatLayerVisible((v) => !v)}
              onToggleCorridor={() => setCorridorVisible((v) => !v)}
              onToggleLabels={() => setLabelsVisible((v) => !v)}
              currentLayers={currentLayers}
              currentMapStyle={currentMapStyle}
              onApplyPreset={handleApplyPreset}
              onChangeBasemap={handleChangeBasemap}
            />
          </div>
          <div className="lg:col-span-1 space-y-4 lg:max-h-[600px] overflow-y-auto pr-0 lg:pr-1 scrollbar-thin scrollbar-thumb-[var(--color-scrollbar-thumb)] scrollbar-track-transparent">
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
              onToggleVisibility={handleToggleAirspaceVisibility}
              onCreateAirspace={handleCreateAirspace}
              onDeleteAirspace={handleDeleteAirspace}
            />
            <AltitudeProfile waypoints={waypoints} />
            <VersionHistoryPanel missionId={id!} />
            <ActivityFeed activities={activities} />
          </div>
        </div>
      </div>
      {id && (
        <ShareDialog
          missionId={id}
          open={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
        />
      )}
    </Layout>
  );
}
