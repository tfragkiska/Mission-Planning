import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface OfflineChange {
  id: string;
  type: "create" | "update" | "delete";
  entity: "mission" | "waypoint";
  entityId: string;
  payload: unknown;
  timestamp: number;
}

interface MissionRecord {
  id: string;
  data: unknown;
  lastSynced: number;
}

interface WaypointRecord {
  id: string;
  missionId: string;
  data: unknown;
  lastSynced: number;
}

interface OfflineDB extends DBSchema {
  missions: {
    key: string;
    value: MissionRecord;
  };
  waypoints: {
    key: string;
    value: WaypointRecord;
    indexes: { "by-mission": string };
  };
  syncQueue: {
    key: string;
    value: OfflineChange;
    indexes: { "by-timestamp": number };
  };
}

const DB_NAME = "opord-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

function getDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("missions")) {
          db.createObjectStore("missions", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("waypoints")) {
          const waypointStore = db.createObjectStore("waypoints", {
            keyPath: "id",
          });
          waypointStore.createIndex("by-mission", "missionId");
        }

        if (!db.objectStoreNames.contains("syncQueue")) {
          const syncStore = db.createObjectStore("syncQueue", {
            keyPath: "id",
          });
          syncStore.createIndex("by-timestamp", "timestamp");
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Save a mission to local IndexedDB for offline access.
 */
export async function saveMissionLocally(
  id: string,
  data: unknown,
): Promise<void> {
  const db = await getDB();
  await db.put("missions", {
    id,
    data,
    lastSynced: Date.now(),
  });
}

/**
 * Retrieve all locally-stored missions.
 */
export async function getLocalMissions(): Promise<MissionRecord[]> {
  const db = await getDB();
  return db.getAll("missions");
}

/**
 * Retrieve a single locally-stored mission by ID.
 */
export async function getLocalMission(
  id: string,
): Promise<MissionRecord | undefined> {
  const db = await getDB();
  return db.get("missions", id);
}

/**
 * Save waypoints for a mission locally.
 */
export async function saveWaypointsLocally(
  missionId: string,
  waypoints: Array<{ id: string; data: unknown }>,
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("waypoints", "readwrite");
  for (const wp of waypoints) {
    await tx.store.put({
      id: wp.id,
      missionId,
      data: wp.data,
      lastSynced: Date.now(),
    });
  }
  await tx.done;
}

/**
 * Retrieve locally-stored waypoints for a mission.
 */
export async function getLocalWaypoints(
  missionId: string,
): Promise<WaypointRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex("waypoints", "by-mission", missionId);
}

/**
 * Queue a change made while offline for later sync.
 */
export async function queueOfflineChange(
  change: Omit<OfflineChange, "id" | "timestamp">,
): Promise<void> {
  const db = await getDB();
  await db.put("syncQueue", {
    ...change,
    id: `${change.entity}-${change.entityId}-${Date.now()}`,
    timestamp: Date.now(),
  });
}

/**
 * Retrieve all pending offline changes, ordered by timestamp.
 */
export async function getPendingChanges(): Promise<OfflineChange[]> {
  const db = await getDB();
  return db.getAllFromIndex("syncQueue", "by-timestamp");
}

/**
 * Attempt to sync all queued offline changes to the server.
 * Returns the number of successfully synced changes.
 */
export async function syncOfflineChanges(
  apiFn: (change: OfflineChange) => Promise<boolean>,
): Promise<number> {
  const db = await getDB();
  const pending = await db.getAllFromIndex("syncQueue", "by-timestamp");

  let synced = 0;

  for (const change of pending) {
    try {
      const success = await apiFn(change);
      if (success) {
        await db.delete("syncQueue", change.id);
        synced++;
      }
    } catch {
      // Stop syncing on first network failure — remaining items stay queued
      break;
    }
  }

  return synced;
}

/**
 * Clear all offline data (useful on logout).
 */
export async function clearOfflineData(): Promise<void> {
  const db = await getDB();
  const tx1 = db.transaction("missions", "readwrite");
  await tx1.store.clear();
  await tx1.done;

  const tx2 = db.transaction("waypoints", "readwrite");
  await tx2.store.clear();
  await tx2.done;

  const tx3 = db.transaction("syncQueue", "readwrite");
  await tx3.store.clear();
  await tx3.done;
}
