import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth-store";

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await api.auth.login(email, password);
      setAuth(token, user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.loginFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] tactical-grid font-sans px-4 sm:px-6">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-command-500/5 rounded-full blur-3xl" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative glass-panel bg-[var(--color-bg-secondary)]/60 p-6 sm:p-10 rounded-xl w-full max-w-sm sm:max-w-md border border-[var(--color-border-primary)] shadow-2xl animate-fade-in"
      >
        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-xl border border-tactical-500/10 animate-pulse-slow pointer-events-none" />

        {/* Header section */}
        <div className="text-center mb-6 sm:mb-8">
          {/* Tactical crosshair icon */}
          <div className="flex justify-center mb-4">
            <svg
              className="w-10 h-10 sm:w-12 sm:h-12 text-tactical-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </div>

          {/* Decorative line above title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-military-600 to-transparent" />
            <span className="text-[10px] font-mono tracking-[0.3em] text-[var(--color-text-muted)] uppercase">
              {t("login.authorizedAccessOnly")}
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-military-600 to-transparent" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-[0.2em] text-[var(--color-text-primary)] mb-1">
            {t("nav.opord")}
          </h1>
          <p className="text-xs font-mono tracking-[0.35em] text-[var(--color-text-secondary)] uppercase">
            {t("login.missionPlanningSystem")}
          </p>

          {/* Decorative line below title */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-military-600 to-transparent" />
            <div className="w-1.5 h-1.5 rotate-45 border border-[var(--color-border-primary)]" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-military-600 to-transparent" />
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-danger-500/10 border border-danger-500/40 text-danger-400 px-4 py-2.5 rounded-lg mb-5 flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-danger-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        {/* Email field */}
        <div className="mb-5">
          <label
            htmlFor="email"
            className="block text-xs font-mono font-semibold tracking-wider text-[var(--color-text-secondary)] uppercase mb-2"
          >
            {t("login.email")}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--color-bg-tertiary)]/60 border border-[var(--color-border-primary)] border-l-2 border-l-command-500/50 rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-input-placeholder)] focus:outline-none focus:border-command-500/40 focus:border-l-command-400 focus:bg-[var(--color-bg-tertiary)]/80 transition-all duration-200"
            placeholder={t("login.emailPlaceholder")}
            required
          />
        </div>

        {/* Password field */}
        <div className="mb-7">
          <label
            htmlFor="password"
            className="block text-xs font-mono font-semibold tracking-wider text-[var(--color-text-secondary)] uppercase mb-2"
          >
            {t("login.password")}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--color-bg-tertiary)]/60 border border-[var(--color-border-primary)] border-l-2 border-l-command-500/50 rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-input-placeholder)] focus:outline-none focus:border-command-500/40 focus:border-l-command-400 focus:bg-[var(--color-bg-tertiary)]/80 transition-all duration-200"
            placeholder={t("login.passwordPlaceholder")}
            required
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-command-500 hover:bg-command-400 hover:shadow-glow-blue disabled:bg-command-600 disabled:opacity-50 rounded-lg font-semibold tracking-wider uppercase text-sm text-[var(--color-text-primary)] transition-all duration-200"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t("login.authenticating")}
            </span>
          ) : (
            t("login.authenticate")
          )}
        </button>

        {/* Classification marking style demo credentials */}
        <div className="mt-6 pt-4 border-t border-[var(--color-border-subtle)]">
          <p className="text-[10px] font-mono tracking-[0.25em] text-[var(--color-text-muted)] text-center uppercase">
            {t("login.demoCredentials")}
          </p>
          <p className="text-[11px] font-mono text-[var(--color-text-muted)] text-center mt-1">
            planner@mission.mil / password123
          </p>
        </div>
      </form>
    </div>
  );
}
