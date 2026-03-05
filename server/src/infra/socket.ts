import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join a mission room to receive updates for that mission
    socket.on("join-mission", (missionId: string) => {
      socket.join(`mission:${missionId}`);
      console.log(`${socket.id} joined mission:${missionId}`);
    });

    // Leave a mission room
    socket.on("leave-mission", (missionId: string) => {
      socket.leave(`mission:${missionId}`);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

// Emit an event to all clients watching a specific mission
export function emitMissionUpdate(missionId: string, event: string, data: unknown) {
  if (io) {
    io.to(`mission:${missionId}`).emit(event, data);
  }
}
