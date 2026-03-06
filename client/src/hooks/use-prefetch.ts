import { useCallback, useRef } from "react";
import { api } from "../lib/api";
import type { Mission } from "../lib/types";

/** Simple in-memory cache for prefetched mission data */
const prefetchCache = new Map<string, { data: Mission; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(id: string): Mission | null {
  const entry = prefetchCache.get(id);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    prefetchCache.delete(id);
    return null;
  }
  return entry.data;
}

/**
 * Hook that prefetches mission data on hover with a configurable delay.
 * Returns `onMouseEnter` and `onMouseLeave` handlers to attach to mission cards.
 *
 * Usage:
 * ```tsx
 * const { onMouseEnter, onMouseLeave, getCachedMission } = usePrefetch();
 * <div onMouseEnter={() => onMouseEnter(mission.id)} onMouseLeave={onMouseLeave}>
 * ```
 */
export function usePrefetch(delayMs: number = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingIdRef = useRef<string | null>(null);

  const onMouseEnter = useCallback(
    (missionId: string) => {
      // Already cached — skip
      if (getCached(missionId)) return;

      pendingIdRef.current = missionId;
      timerRef.current = setTimeout(async () => {
        if (pendingIdRef.current !== missionId) return;
        try {
          const data = await api.missions.get(missionId);
          prefetchCache.set(missionId, { data, fetchedAt: Date.now() });
        } catch {
          // Prefetch is best-effort — swallow errors
        }
      }, delayMs);
    },
    [delayMs],
  );

  const onMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingIdRef.current = null;
  }, []);

  const getCachedMission = useCallback((id: string): Mission | null => {
    return getCached(id);
  }, []);

  return { onMouseEnter, onMouseLeave, getCachedMission };
}
