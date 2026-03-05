import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../stores/notification-store";
import type { Notification } from "../lib/types";

const typeIcons: Record<string, string> = {
  APPROVAL: "check-circle",
  REJECTION: "x-circle",
  REVIEW_REQUESTED: "clipboard",
  MISSION_STATUS: "arrow-right-circle",
  MISSION_ASSIGNED: "user-plus",
  DECONFLICTION_ALERT: "alert-triangle",
};

const typeColors: Record<string, string> = {
  APPROVAL: "text-green-400",
  REJECTION: "text-accent-400",
  REVIEW_REQUESTED: "text-command-400",
  MISSION_STATUS: "text-tactical-500",
  MISSION_ASSIGNED: "text-blue-400",
  DECONFLICTION_ALERT: "text-yellow-400",
};

function NotificationIcon({ type }: { type: string }) {
  const iconType = typeIcons[type] || "bell";
  const color = typeColors[type] || "text-military-400";

  switch (iconType) {
    case "check-circle":
      return (
        <svg className={`w-5 h-5 ${color} flex-shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "x-circle":
      return (
        <svg className={`w-5 h-5 ${color} flex-shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
    case "clipboard":
      return (
        <svg className={`w-5 h-5 ${color} flex-shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
      );
    case "alert-triangle":
      return (
        <svg className={`w-5 h-5 ${color} flex-shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "user-plus":
      return (
        <svg className={`w-5 h-5 ${color} flex-shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      );
    default:
      return (
        <svg className={`w-5 h-5 ${color} flex-shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors duration-150 hover:bg-military-700/50 border-b border-military-700/30 last:border-b-0 ${
        notification.read ? "opacity-60" : ""
      }`}
    >
      <NotificationIcon type={notification.type} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm font-semibold truncate ${notification.read ? "text-military-400" : "text-gray-100"}`}>
            {notification.title}
          </span>
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-tactical-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-military-400 mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <span className="text-[10px] font-mono text-military-500 mt-1 block">
          {formatTimeAgo(notification.createdAt)}
        </span>
      </div>
    </button>
  );
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markRead,
    markAllRead,
    initSocketListener,
  } = useNotificationStore();

  // Fetch notifications on mount and set up socket listener
  useEffect(() => {
    fetchNotifications();
    const cleanup = initSocketListener();
    return cleanup;
  }, [fetchNotifications, initSocketListener]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      markRead(notification.id);
    }
    if (notification.missionId) {
      navigate(`/missions/${notification.missionId}`);
    }
    setIsOpen(false);
  }

  function handleMarkAllRead() {
    markAllRead();
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-military-400 hover:text-tactical-400 transition-colors duration-200 p-1"
        aria-label="Notifications"
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-accent-500 rounded-full border-2 border-military-900">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-96 max-h-[480px] flex flex-col glass-panel bg-military-900/95 border border-military-700/60 rounded-lg shadow-2xl shadow-black/50 z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-military-700/50">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-100 tracking-wide uppercase">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono font-semibold text-tactical-500 bg-tactical-500/10 border border-tactical-500/30 rounded-full px-2 py-0.5">
                  {unreadCount} NEW
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-command-400 hover:text-command-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-military-500">
                <svg
                  className="w-10 h-10 mb-3 opacity-50"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="text-sm font-medium">No notifications</span>
                <span className="text-xs mt-1">You're all caught up</span>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))
            )}
          </div>

          {/* Bottom glow line */}
          <div className="h-px bg-gradient-to-r from-transparent via-tactical-500/20 to-transparent" />
        </div>
      )}
    </div>
  );
}
