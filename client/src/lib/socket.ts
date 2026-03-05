import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io("http://localhost:3001", {
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
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
