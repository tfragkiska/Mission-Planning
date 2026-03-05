import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/auth-store";
import { useNavigate } from "react-router-dom";
import OfflineIndicator from "./offline-indicator";
import ThemeToggle from "./theme-toggle";
import NotificationBell from "./notification-bell";

const roleBadgeStyles: Record<string, string> = {
  planner: "bg-command-500/20 text-command-400 border-command-500/40",
  pilot: "bg-tactical-500/20 text-tactical-500 border-tactical-500/40",
  commander: "bg-accent-500/20 text-accent-400 border-accent-500/40",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const roleKey = user?.role?.toLowerCase() ?? "";
  const badgeStyle = roleBadgeStyles[roleKey] ?? "bg-military-700 text-military-400 border-military-600";

  return (
    <div className="min-h-screen bg-military-950 font-sans">
      <OfflineIndicator />
      <nav className="relative glass-panel bg-military-900/80 border-b border-military-700/50 px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Bottom border glow */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-tactical-500/30 to-transparent" />

        <div className="flex items-center gap-3 sm:gap-5">
          {/* Logo / title area */}
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
            onClick={() => navigate("/dashboard")}
          >
            {/* Tactical crosshair icon */}
            <svg
              className="w-6 h-6 sm:w-8 sm:h-8 text-tactical-500 group-hover:text-tactical-400 transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
            <div className="flex flex-col">
              <h1 className="text-sm sm:text-lg font-bold tracking-wider text-gray-100 group-hover:text-white transition-colors">
                OPORD
              </h1>
              <span className="hidden sm:block text-[10px] font-mono tracking-widest text-military-400 uppercase leading-none">
                Mission Planning
              </span>
            </div>
          </div>

          {/* Vertical separator - hidden on mobile */}
          <div className="hidden md:block h-8 w-px bg-military-700/50" />

          {/* User info and role badge - hidden on mobile, shown in mobile menu */}
          {user && (
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm text-military-300 font-medium">
                {user.name}
              </span>
              <span
                className={`text-xs font-mono font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeStyle}`}
              >
                {user.role}
              </span>
            </div>
          )}
        </div>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-5">
          {/* Audit Log link - visible to COMMANDER and PLANNER */}
          {user && (user.role === "COMMANDER" || user.role === "PLANNER") && (
            <button
              onClick={() => navigate("/audit")}
              className="text-sm font-medium text-military-400 hover:text-tactical-400 transition-colors duration-200 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Audit Log
            </button>
          )}

          {/* Notification bell */}
          <NotificationBell />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Vertical separator */}
          <div className="h-6 w-px bg-military-700/50" />

          {/* Status bar with current time */}
          <div className="hidden sm:flex items-center gap-2 text-military-500">
            <div className="w-1.5 h-1.5 rounded-full bg-tactical-500 animate-pulse-slow" />
            <span className="text-xs font-mono tracking-wider">
              {currentTime.toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
              Z
            </span>
          </div>

          {/* Vertical separator */}
          <div className="hidden sm:block h-6 w-px bg-military-700/50" />

          {/* Sign out */}
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-military-400 hover:text-accent-400 transition-colors duration-200 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-military-400 hover:text-white hover:bg-military-700/50 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile slide-out menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel bg-military-900/95 border-b border-military-700/50 px-4 py-4 space-y-4 animate-fade-in">
          {/* User info */}
          {user && (
            <div className="flex items-center gap-3 pb-3 border-b border-military-700/30">
              <span className="text-sm text-military-300 font-medium">
                {user.name}
              </span>
              <span
                className={`text-xs font-mono font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeStyle}`}
              >
                {user.role}
              </span>
            </div>
          )}

          {/* Notifications and Theme (mobile) */}
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-2">
              <span className="text-xs text-military-500 uppercase tracking-wider font-mono">Theme</span>
              <ThemeToggle />
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center gap-2 text-military-500">
            <div className="w-1.5 h-1.5 rounded-full bg-tactical-500 animate-pulse-slow" />
            <span className="text-xs font-mono tracking-wider">
              {currentTime.toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
              Z
            </span>
          </div>

          {/* Audit Log link (mobile) */}
          {user && (user.role === "COMMANDER" || user.role === "PLANNER") && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/audit");
              }}
              className="w-full text-sm font-medium text-military-400 hover:text-tactical-400 transition-colors duration-200 flex items-center gap-1.5 py-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Audit Log
            </button>
          )}

          {/* Sign out */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            className="w-full text-sm font-medium text-military-400 hover:text-accent-400 transition-colors duration-200 flex items-center gap-1.5 py-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      )}

      <main className="p-3 sm:p-6 tactical-grid min-h-[calc(100vh-3.5rem)]">
        {children}
      </main>
    </div>
  );
}
