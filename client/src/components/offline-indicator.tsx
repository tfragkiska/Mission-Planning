import { useEffect, useState } from "react";
import { getPendingChanges } from "../lib/offline-store";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) return;

    let cancelled = false;

    async function checkPending() {
      try {
        const changes = await getPendingChanges();
        if (!cancelled) {
          setPendingCount(changes.length);
        }
      } catch {
        // IndexedDB may not be available
      }
    }

    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOnline]);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-accent-600/90 backdrop-blur-sm text-white px-4 py-2 text-center text-sm font-mono tracking-wide flex items-center justify-center gap-3 border-b border-accent-500/50"
    >
      <svg
        className="w-4 h-4 flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
      <span>
        OFFLINE MODE — Changes will sync when reconnected
        {pendingCount > 0 && (
          <span className="ml-2 text-xs opacity-80">
            ({pendingCount} pending)
          </span>
        )}
      </span>
    </div>
  );
}
