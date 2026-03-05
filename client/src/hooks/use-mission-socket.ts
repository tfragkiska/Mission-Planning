import { useEffect, useCallback, useRef, useState } from "react";
import { connectSocket, joinMission, leaveMission, sendCursorMove, sendLockHeartbeat } from "../lib/socket";

// --- Presence types ---
export interface PresenceUser {
  socketId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: number;
}

// --- Cursor types ---
export interface CursorPosition {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  lastUpdate: number;
}

// --- Lock types ---
export interface LockState {
  locked: boolean;
  holder?: { userId: string; userName: string };
  isOwnLock?: boolean;
}

// --- Activity types ---
export interface ActivityEntry {
  id: string;
  missionId: string;
  type: string;
  message: string;
  userId?: string;
  userName?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

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
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [lockState, setLockState] = useState<LockState>({ locked: false });
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const currentUserIdRef = useRef<string | null>(null);

  // Load current user ID from storage
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        currentUserIdRef.current = user.id;
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!missionId) return;

    const socket = connectSocket();
    joinMission(missionId);

    // --- Existing event handlers ---
    if (onMissionUpdated) socket.on("mission:updated", onMissionUpdated);
    if (onWaypointsChanged) socket.on("waypoints:changed", onWaypointsChanged);
    if (onThreatsChanged) socket.on("threats:changed", onThreatsChanged);
    if (onAircraftChanged) socket.on("aircraft:changed", onAircraftChanged);
    if (onWeatherChanged) socket.on("weather:changed", onWeatherChanged);
    if (onDeconflictionChanged) socket.on("deconfliction:changed", onDeconflictionChanged);

    // --- Presence ---
    const handlePresenceUpdate = (data: { missionId: string; users: PresenceUser[] }) => {
      if (data.missionId === missionId) {
        setPresenceUsers(data.users);
      }
    };
    socket.on("presence:update", handlePresenceUpdate);

    // --- Cursors ---
    const handleCursorUpdate = (data: CursorPosition) => {
      setCursors((prev) => {
        const next = new Map(prev);
        next.set(data.userId, { ...data, lastUpdate: Date.now() });
        return next;
      });
    };
    socket.on("cursor:update", handleCursorUpdate);

    // --- Edit lock events ---
    const handleLockState = (data: { missionId: string; locked: boolean; holder?: { userId: string; userName: string } }) => {
      if (data.missionId === missionId) {
        setLockState({
          locked: data.locked,
          holder: data.holder,
          isOwnLock: data.holder?.userId === currentUserIdRef.current,
        });
      }
    };
    socket.on("lock:state", handleLockState);

    const handleLockGrant = (data: { missionId: string }) => {
      if (data.missionId === missionId) {
        setLockState({ locked: true, holder: undefined, isOwnLock: true });
      }
    };
    socket.on("lock:grant", handleLockGrant);

    const handleLockDenied = (data: { missionId: string; holder?: { userId: string; userName: string }; reason: string }) => {
      if (data.missionId === missionId) {
        setLockState({
          locked: true,
          holder: data.holder,
          isOwnLock: false,
        });
      }
    };
    socket.on("lock:denied", handleLockDenied);

    const handleLockAcquired = (data: { missionId: string; userId: string; userName: string }) => {
      if (data.missionId === missionId) {
        setLockState({
          locked: true,
          holder: { userId: data.userId, userName: data.userName },
          isOwnLock: data.userId === currentUserIdRef.current,
        });
      }
    };
    socket.on("lock:acquired", handleLockAcquired);

    const handleLockReleased = (data: { missionId: string; userId: string; userName: string; reason: string }) => {
      if (data.missionId === missionId) {
        setLockState({ locked: false });
      }
    };
    socket.on("lock:released", handleLockReleased);

    // --- Activity feed ---
    const handleActivity = (entry: ActivityEntry) => {
      if (entry.missionId === missionId) {
        setActivities((prev) => [entry, ...prev].slice(0, 50)); // Keep last 50
      }
    };
    socket.on("activity:new", handleActivity);

    // --- Stale cursor cleanup interval ---
    const cursorCleanup = setInterval(() => {
      setCursors((prev) => {
        const now = Date.now();
        const next = new Map(prev);
        let changed = false;
        for (const [userId, cursor] of next) {
          if (now - cursor.lastUpdate > 10_000) {
            next.delete(userId);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 5_000);

    return () => {
      leaveMission(missionId);
      clearInterval(cursorCleanup);

      socket.off("mission:updated", onMissionUpdated);
      socket.off("waypoints:changed", onWaypointsChanged);
      socket.off("threats:changed", onThreatsChanged);
      socket.off("aircraft:changed", onAircraftChanged);
      socket.off("weather:changed", onWeatherChanged);
      socket.off("deconfliction:changed", onDeconflictionChanged);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("cursor:update", handleCursorUpdate);
      socket.off("lock:state", handleLockState);
      socket.off("lock:grant", handleLockGrant);
      socket.off("lock:denied", handleLockDenied);
      socket.off("lock:acquired", handleLockAcquired);
      socket.off("lock:released", handleLockReleased);
      socket.off("activity:new", handleActivity);

      // Reset state on unmount
      setPresenceUsers([]);
      setCursors(new Map());
      setLockState({ locked: false });
      setActivities([]);
    };
  }, [missionId, onMissionUpdated, onWaypointsChanged, onThreatsChanged, onAircraftChanged, onWeatherChanged, onDeconflictionChanged]);

  // Throttled cursor emit
  const lastCursorEmit = useRef(0);
  const emitCursorMove = useCallback(
    (lat: number, lng: number) => {
      if (!missionId) return;
      const now = Date.now();
      if (now - lastCursorEmit.current < 50) return; // Throttle to ~20fps
      lastCursorEmit.current = now;
      sendCursorMove(missionId, lat, lng);
    },
    [missionId],
  );

  // Lock heartbeat — keeps lock alive while user has it
  useEffect(() => {
    if (!missionId || !lockState.isOwnLock) return;
    const interval = setInterval(() => {
      sendLockHeartbeat(missionId);
    }, 60_000); // Every minute
    return () => clearInterval(interval);
  }, [missionId, lockState.isOwnLock]);

  return {
    presenceUsers,
    cursors,
    lockState,
    activities,
    emitCursorMove,
  };
}
