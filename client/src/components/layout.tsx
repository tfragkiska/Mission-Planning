import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/auth-store";
import { useNavigate } from "react-router-dom";

const roleBadgeStyles: Record<string, string> = {
  planner: "bg-command-500/20 text-command-400 border-command-500/40",
  pilot: "bg-tactical-500/20 text-tactical-500 border-tactical-500/40",
  commander: "bg-accent-500/20 text-accent-400 border-accent-500/40",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

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
      <nav className="relative glass-panel bg-military-900/80 border-b border-military-700/50 px-6 py-3 flex items-center justify-between">
        {/* Bottom border glow */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-tactical-500/30 to-transparent" />

        <div className="flex items-center gap-5">
          {/* Logo / title area */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate("/dashboard")}
          >
            {/* Tactical crosshair icon */}
            <svg
              className="w-8 h-8 text-tactical-500 group-hover:text-tactical-400 transition-colors"
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
              <h1 className="text-lg font-bold tracking-wider text-gray-100 group-hover:text-white transition-colors">
                OPORD
              </h1>
              <span className="text-[10px] font-mono tracking-widest text-military-400 uppercase leading-none">
                Mission Planning
              </span>
            </div>
          </div>

          {/* Vertical separator */}
          <div className="h-8 w-px bg-military-700/50" />

          {/* User info and role badge */}
          {user && (
            <div className="flex items-center gap-3">
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

        <div className="flex items-center gap-5">
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
      </nav>

      <main className="p-6 tactical-grid min-h-[calc(100vh-3.5rem)]">
        {children}
      </main>
    </div>
  );
}
