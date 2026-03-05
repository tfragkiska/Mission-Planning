import { useEffect } from "react";
import { connectSocket, joinMission, leaveMission } from "../lib/socket";

interface UseMissionSocketOptions {
  missionId: string | undefined;
  onMissionUpdated?: () => void;
  onWaypointsChanged?: () => void;
  onThreatsChanged?: () => void;
  onAircraftChanged?: () => void;
  onWeatherChanged?: () => void;
  onDeconflictionChanged?: () => void;
}

export function useMissionSocket({
  missionId,
  onMissionUpdated,
  onWaypointsChanged,
  onThreatsChanged,
  onAircraftChanged,
  onWeatherChanged,
  onDeconflictionChanged,
}: UseMissionSocketOptions) {
  useEffect(() => {
    if (!missionId) return;

    const socket = connectSocket();
    joinMission(missionId);

    if (onMissionUpdated) socket.on("mission:updated", onMissionUpdated);
    if (onWaypointsChanged) socket.on("waypoints:changed", onWaypointsChanged);
    if (onThreatsChanged) socket.on("threats:changed", onThreatsChanged);
    if (onAircraftChanged) socket.on("aircraft:changed", onAircraftChanged);
    if (onWeatherChanged) socket.on("weather:changed", onWeatherChanged);
    if (onDeconflictionChanged) socket.on("deconfliction:changed", onDeconflictionChanged);

    return () => {
      leaveMission(missionId);
      socket.off("mission:updated", onMissionUpdated);
      socket.off("waypoints:changed", onWaypointsChanged);
      socket.off("threats:changed", onThreatsChanged);
      socket.off("aircraft:changed", onAircraftChanged);
      socket.off("weather:changed", onWeatherChanged);
      socket.off("deconfliction:changed", onDeconflictionChanged);
    };
  }, [missionId, onMissionUpdated, onWaypointsChanged, onThreatsChanged, onAircraftChanged, onWeatherChanged, onDeconflictionChanged]);
}
