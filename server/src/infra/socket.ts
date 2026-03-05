import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "./config";

let io: Server | null = null;

// --- Presence tracking ---
interface PresenceUser {
  socketId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: number;
}

// missionId -> Map<socketId, PresenceUser>
const missionPresence = new Map<string, Map<string, PresenceUser>>();

function getPresenceList(missionId: string): PresenceUser[] {
  const room = missionPresence.get(missionId);
  if (!room) return [];
  return Array.from(room.values());
}

function addPresence(missionId: string, user: PresenceUser): void {
  if (!missionPresence.has(missionId)) {
    missionPresence.set(missionId, new Map());
  }
  missionPresence.get(missionId)!.set(user.socketId, user);
}

function removePresence(missionId: string, socketId: string): void {
  const room = missionPresence.get(missionId);
  if (!room) return;
  room.delete(socketId);
  if (room.size === 0) {
    missionPresence.delete(missionId);
  }
}

// --- Edit lock tracking ---
interface EditLock {
  userId: string;
  userName: string;
  socketId: string;
  acquiredAt: number;
  lastActivity: number;
}

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// missionId -> EditLock
const editLocks = new Map<string, EditLock>();

function isLockExpired(lock: EditLock): boolean {
  return Date.now() - lock.lastActivity > LOCK_TIMEOUT_MS;
}

function tryAcquireLock(
  missionId: string,
  userId: string,
  userName: string,
  socketId: string,
): { granted: boolean; holder?: { userId: string; userName: string } } {
  const existing = editLocks.get(missionId);

  // No lock or expired lock — grant
  if (!existing || isLockExpired(existing)) {
    editLocks.set(missionId, {
      userId,
      userName,
      socketId,
      acquiredAt: Date.now(),
      lastActivity: Date.now(),
    });
    return { granted: true };
  }

  // Same user already holds it — refresh
  if (existing.userId === userId) {
    existing.lastActivity = Date.now();
    return { granted: true };
  }

  // Someone else holds it
  return { granted: false, holder: { userId: existing.userId, userName: existing.userName } };
}

function releaseLock(missionId: string, userId: string): boolean {
  const lock = editLocks.get(missionId);
  if (!lock) return false;
  if (lock.userId !== userId && !isLockExpired(lock)) return false;
  editLocks.delete(missionId);
  return true;
}

function releaseAllLocksForSocket(socketId: string): string[] {
  const released: string[] = [];
  for (const [missionId, lock] of editLocks.entries()) {
    if (lock.socketId === socketId) {
      editLocks.delete(missionId);
      released.push(missionId);
    }
  }
  return released;
}

function refreshLockActivity(missionId: string, userId: string): void {
  const lock = editLocks.get(missionId);
  if (lock && lock.userId === userId) {
    lock.lastActivity = Date.now();
  }
}

// --- Socket ID to user info mapping ---
const socketUserMap = new Map<string, { userId: string; name: string; email: string; role: string }>();

// --- Socket ID to joined missions mapping ---
const socketMissions = new Map<string, Set<string>>();

// --- Lock expiry sweep ---
function startLockExpirySweep(): void {
  setInterval(() => {
    if (!io) return;
    for (const [missionId, lock] of editLocks.entries()) {
      if (isLockExpired(lock)) {
        editLocks.delete(missionId);
        io.to(`mission:${missionId}`).emit("lock:released", {
          missionId,
          userId: lock.userId,
          userName: lock.userName,
          reason: "timeout",
        });
      }
    }
  }, 30_000); // Check every 30 seconds
}

export function initSocketServer(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Auth middleware — extract user info from token in handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // Allow unauthenticated connections but mark them
      (socket as any).userData = null;
      return next();
    }
    try {
      const payload = jwt.verify(token, config.jwtSecret) as {
        userId: string;
        email: string;
        name?: string;
        role: string;
      };
      (socket as any).userData = {
        userId: payload.userId,
        email: payload.email,
        name: payload.name || payload.email.split("@")[0],
        role: payload.role,
      };
      next();
    } catch {
      // Still allow connection, just no user data
      (socket as any).userData = null;
      next();
    }
  });

  io.on("connection", (socket: Socket) => {
    const userData = (socket as any).userData as {
      userId: string;
      name: string;
      email: string;
      role: string;
    } | null;

    console.log(`Client connected: ${socket.id}${userData ? ` (${userData.name})` : ""}`);

    if (userData) {
      socketUserMap.set(socket.id, userData);
      // Join user-specific room for targeted notifications
      socket.join(`user:${userData.userId}`);
    }
    socketMissions.set(socket.id, new Set());

    // --- Join a mission room ---
    socket.on("join-mission", (missionId: string) => {
      socket.join(`mission:${missionId}`);
      socketMissions.get(socket.id)?.add(missionId);
      console.log(`${socket.id} joined mission:${missionId}`);

      // Add to presence
      if (userData) {
        addPresence(missionId, {
          socketId: socket.id,
          userId: userData.userId,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          joinedAt: Date.now(),
        });

        // Broadcast updated presence to everyone in the room
        io!.to(`mission:${missionId}`).emit("presence:update", {
          missionId,
          users: getPresenceList(missionId),
        });
      }

      // Send current lock state to the joining user
      const lock = editLocks.get(missionId);
      if (lock && !isLockExpired(lock)) {
        socket.emit("lock:state", {
          missionId,
          locked: true,
          holder: { userId: lock.userId, userName: lock.userName },
        });
      } else {
        socket.emit("lock:state", { missionId, locked: false });
      }
    });

    // --- Leave a mission room ---
    socket.on("leave-mission", (missionId: string) => {
      socket.leave(`mission:${missionId}`);
      socketMissions.get(socket.id)?.delete(missionId);

      if (userData) {
        removePresence(missionId, socket.id);
        io!.to(`mission:${missionId}`).emit("presence:update", {
          missionId,
          users: getPresenceList(missionId),
        });
      }
    });

    // --- Cursor movement relay ---
    socket.on("cursor:move", (data: { missionId: string; lat: number; lng: number }) => {
      if (!userData) return;
      socket.to(`mission:${data.missionId}`).emit("cursor:update", {
        userId: userData.userId,
        name: userData.name,
        lat: data.lat,
        lng: data.lng,
      });
    });

    // --- Edit lock request ---
    socket.on("lock:request", (missionId: string) => {
      if (!userData) {
        socket.emit("lock:denied", { missionId, reason: "Not authenticated" });
        return;
      }

      const result = tryAcquireLock(missionId, userData.userId, userData.name, socket.id);

      if (result.granted) {
        socket.emit("lock:grant", { missionId });
        // Notify others that this user now holds the lock
        socket.to(`mission:${missionId}`).emit("lock:acquired", {
          missionId,
          userId: userData.userId,
          userName: userData.name,
        });
      } else {
        socket.emit("lock:denied", {
          missionId,
          holder: result.holder,
          reason: `Edit lock held by ${result.holder?.userName}`,
        });
      }
    });

    // --- Edit lock release ---
    socket.on("lock:release", (missionId: string) => {
      if (!userData) return;
      const released = releaseLock(missionId, userData.userId);
      if (released) {
        io!.to(`mission:${missionId}`).emit("lock:released", {
          missionId,
          userId: userData.userId,
          userName: userData.name,
          reason: "manual",
        });
      }
    });

    // --- Edit lock activity heartbeat ---
    socket.on("lock:heartbeat", (missionId: string) => {
      if (!userData) return;
      refreshLockActivity(missionId, userData.userId);
    });

    // --- Disconnect ---
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}${userData ? ` (${userData.name})` : ""}`);

      // Clean up presence from all missions this socket was in
      const missions = socketMissions.get(socket.id);
      if (missions && userData) {
        for (const missionId of missions) {
          removePresence(missionId, socket.id);
          io!.to(`mission:${missionId}`).emit("presence:update", {
            missionId,
            users: getPresenceList(missionId),
          });
        }
      }

      // Release any edit locks held by this socket
      if (userData) {
        const releasedMissions = releaseAllLocksForSocket(socket.id);
        for (const missionId of releasedMissions) {
          io!.to(`mission:${missionId}`).emit("lock:released", {
            missionId,
            userId: userData.userId,
            userName: userData.name,
            reason: "disconnect",
          });
        }
      }

      socketUserMap.delete(socket.id);
      socketMissions.delete(socket.id);
    });
  });

  startLockExpirySweep();

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

// Emit an event to a specific user (for notifications)
export function emitToUser(userId: string, event: string, data: unknown) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

// Emit an activity event for a mission
export function emitActivity(
  missionId: string,
  activity: {
    type: string;
    message: string;
    userId?: string;
    userName?: string;
    details?: Record<string, unknown>;
  },
) {
  if (io) {
    io.to(`mission:${missionId}`).emit("activity:new", {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      missionId,
      timestamp: new Date().toISOString(),
      ...activity,
    });
  }
}
