import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem("token");
    socket = io("http://localhost:3001", {
      autoConnect: false,
      auth: token ? { token } : undefined,
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    // Refresh auth token before connecting
    const token = localStorage.getItem("token");
    if (token) {
      s.auth = { token };
    }
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function joinMission(missionId: string) {
  const s = getSocket();
  s.emit("join-mission", missionId);
}

export function leaveMission(missionId: string) {
  const s = getSocket();
  s.emit("leave-mission", missionId);
}

export function requestEditLock(missionId: string) {
  const s = getSocket();
  s.emit("lock:request", missionId);
}

export function releaseEditLock(missionId: string) {
  const s = getSocket();
  s.emit("lock:release", missionId);
}

export function sendCursorMove(missionId: string, lat: number, lng: number) {
  const s = getSocket();
  s.emit("cursor:move", { missionId, lat, lng });
}

export function sendLockHeartbeat(missionId: string) {
  const s = getSocket();
  s.emit("lock:heartbeat", missionId);
}
