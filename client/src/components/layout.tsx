import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "../stores/auth-store";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import OfflineIndicator from "./offline-indicator";
import ThemeToggle from "./theme-toggle";
import NotificationBell from "./notification-bell";
import LanguageSwitcher from "./language-switcher";
import ShortcutHelp from "./shortcut-help";
import CommandPalette from "./command-palette";
import GlobalSearch from "./global-search";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";

const roleBadgeStyles: Record<string, string> = {
  planner: "bg-command-500/20 text-command-400 border-command-500/40",
  pilot: "bg-tactical-500/20 text-tactical-500 border-tactical-500/40",
  commander: "bg-accent-500/20 text-accent-400 border-accent-500/40",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const toggleHelp = useCallback(() => setShowShortcutHelp((v) => !v), []);
  const closeHelp = useCallback(() => setShowShortcutHelp(false), []);
  const togglePalette = useCallback(() => setShowCommandPalette((v) => !v), []);
  const closePalette = useCallback(() => setShowCommandPalette(false), []);

  useKeyboardShortcuts([
    {
      key: "?",
      handler: () => {
        if (showCommandPalette) return;
        toggleHelp();
      },
    },
    {
      key: "Ctrl+/",
      handler: () => {
        if (showCommandPalette) return;
        toggleHelp();
      },
    },
    {
      key: "Ctrl+K",
      handler: () => {
        if (showShortcutHelp) return;
        togglePalette();
      },
    },
    {
      key: "G>D",
      handler: () => navigate("/dashboard"),
      sequence: true,
    },
    {
      key: "G>A",
      handler: () => navigate("/audit"),
      sequence: true,
    },
    {
      key: "Escape",
      handler: () => {
        if (showCommandPalette) closePalette();
        else if (showShortcutHelp) closeHelp();
        else setMobileMenuOpen(false);
      },
    },
  ]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const roleKey = user?.role?.toLowerCase() ?? "";
  const badgeStyle = roleBadgeStyles[roleKey] ?? "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border-primary)]";

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] font-sans">
      <OfflineIndicator />
      <nav className="relative z-50 glass-panel bg-[var(--color-bg-secondary)]/80 border-b border-[var(--color-border-primary)] px-4 sm:px-6 py-3 flex items-center justify-between">
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
              <h1 className="text-sm sm:text-lg font-bold tracking-wider text-[var(--color-text-primary)] group-hover:text-[var(--color-text-primary)] transition-colors">
                {t("nav.opord")}
              </h1>
              <span className="hidden sm:block text-[10px] font-mono tracking-widest text-[var(--color-text-secondary)] uppercase leading-none">
                {t("nav.missionPlanning")}
              </span>
            </div>
          </div>

          {/* Vertical separator - hidden on mobile */}
          <div className="hidden md:block h-8 w-px bg-[var(--color-bg-elevated)]/50" />

          {/* User info and role badge - hidden on mobile, shown in mobile menu */}
          {user && (
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm text-[var(--color-text-primary)] font-medium">
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
          {/* Global search */}
          <GlobalSearch />

          {/* Audit Log link - visible to COMMANDER and PLANNER */}
          {user && (user.role === "COMMANDER" || user.role === "PLANNER") && (
            <button
              onClick={() => navigate("/audit")}
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-tactical-400 transition-colors duration-200 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              {t("nav.auditLog")}
            </button>
          )}

          {/* Notification bell */}
          <NotificationBell />

          {/* Language switcher */}
          <LanguageSwitcher />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Vertical separator */}
          <div className="h-6 w-px bg-[var(--color-bg-elevated)]/50" />

          {/* Status bar with current time */}
          <div className="hidden sm:flex items-center gap-2 text-[var(--color-text-muted)]">
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
          <div className="hidden sm:block h-6 w-px bg-[var(--color-bg-elevated)]/50" />

          {/* Sign out */}
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-accent-400 transition-colors duration-200 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t("nav.signOut")}
          </button>
        </div>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]/50 transition-colors"
          aria-label={t("nav.toggleMenu")}
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
        <div className="md:hidden glass-panel bg-[var(--color-bg-secondary)]/95 border-b border-[var(--color-border-primary)] px-4 py-4 space-y-4 animate-fade-in">
          {/* User info */}
          {user && (
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--color-border-subtle)]">
              <span className="text-sm text-[var(--color-text-primary)] font-medium">
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
              <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-mono">{t("nav.theme")}</span>
              <ThemeToggle />
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
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
              className="w-full text-sm font-medium text-[var(--color-text-secondary)] hover:text-tactical-400 transition-colors duration-200 flex items-center gap-1.5 py-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              {t("nav.auditLog")}
            </button>
          )}

          {/* Sign out */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            className="w-full text-sm font-medium text-[var(--color-text-secondary)] hover:text-accent-400 transition-colors duration-200 flex items-center gap-1.5 py-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t("nav.signOut")}
          </button>
        </div>
      )}

      <main className="p-3 sm:p-6 tactical-grid min-h-[calc(100vh-3.5rem)]">
        {children}
      </main>

      {/* Shortcut hint */}
      <div className="fixed bottom-3 right-3 z-30 hidden sm:flex items-center gap-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer select-none" onClick={toggleHelp}>
        <span className="text-[10px] font-mono tracking-wide">Press</span>
        <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)]/80 border border-[var(--color-border-primary)] text-[10px] font-mono">?</kbd>
        <span className="text-[10px] font-mono tracking-wide">for shortcuts</span>
      </div>

      {/* Modals */}
      {showShortcutHelp && <ShortcutHelp onClose={closeHelp} />}
      {showCommandPalette && <CommandPalette onClose={closePalette} />}
    </div>
  );
}
