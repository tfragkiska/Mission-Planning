import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MissionCard from "./mission-card";
import type { Mission } from "../lib/types";

interface Props {
  missions: Mission[];
  loading: boolean;
}

export default function DashboardPilot({ missions, loading }: Props) {
  const navigate = useNavigate();

  const activeMissions = useMemo(
    () => missions.filter((m) => ["APPROVED", "BRIEFED", "EXECUTING"].includes(m.status)),
    [missions],
  );

  const upcoming = useMemo(
    () =>
      activeMissions
        .filter((m) => m.scheduledStart && ["APPROVED", "BRIEFED"].includes(m.status))
        .sort(
          (a, b) =>
            new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime(),
        ),
    [activeMissions],
  );

  const inProgress = useMemo(
    () => activeMissions.filter((m) => m.status === "EXECUTING").length,
    [activeMissions],
  );

  const completed = useMemo(
    () => missions.filter((m) => m.status === "DEBRIEFED").length,
    [missions],
  );

  const briefedMissions = useMemo(
    () => activeMissions.filter((m) => m.status === "BRIEFED"),
    [activeMissions],
  );

  const stats = [
    {
      label: "Upcoming",
      value: upcoming.length,
      color: "text-command-400",
      borderColor: "border-t-command-500",
      indicator: "bg-command-500",
    },
    {
      label: "In Progress",
      value: inProgress,
      color: "text-accent-400",
      borderColor: "border-t-accent-500",
      indicator: "bg-accent-500",
    },
    {
      label: "Completed",
      value: completed,
      color: "text-tactical-500",
      borderColor: "border-t-tactical-500",
      indicator: "bg-tactical-500",
    },
  ];

  return (
    <>
      {/* Header */}
      <div className="relative mb-6 sm:mb-8">
        <div className="absolute inset-0 tactical-grid opacity-20 rounded-xl" />
        <div className="relative glass-panel rounded-xl border border-[var(--color-border-primary)] px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-2 h-2 rounded-full bg-tactical-500 animate-pulse-slow shadow-glow-green" />
                <span className="text-xs font-mono uppercase tracking-[0.3em] text-tactical-500">
                  Pilot Console
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Flight Operations
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1 font-mono">
                {activeMissions.length} assigned missions // {upcoming.length} upcoming
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`glass-panel rounded-xl border border-[var(--color-border-subtle)] border-t-2 ${stat.borderColor} px-3 sm:px-4 py-3 sm:py-4 text-center transition-all duration-200 hover:border-[var(--color-border-primary)]`}
          >
            <div className="flex justify-center mb-2">
              <div className={`w-1.5 h-1.5 rounded-full ${stat.indicator} animate-pulse-slow`} />
            </div>
            <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-secondary)] mt-1.5 font-medium">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Missions */}
      {upcoming.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-command-500 animate-pulse-slow" />
            <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-command-400">
              Upcoming Missions
            </h2>
          </div>
          <div className="space-y-3">
            {upcoming.map((mission) => (
              <div
                key={mission.id}
                onClick={() => navigate(`/missions/${mission.id}`)}
                className="glass-panel rounded-xl border border-[var(--color-border-subtle)] p-4 cursor-pointer transition-all duration-200 hover:border-command-500/40 hover:shadow-glow-blue group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center px-3 py-2 bg-command-500/10 rounded-lg border border-command-500/20 min-w-[60px]">
                      <span className="text-[10px] font-mono uppercase text-command-400">
                        {new Date(mission.scheduledStart!).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-xl font-bold font-mono text-command-400">
                        {new Date(mission.scheduledStart!).getDate()}
                      </span>
                      <span className="text-[10px] font-mono text-command-500">
                        {new Date(mission.scheduledStart!).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--color-text-primary)] group-hover:text-tactical-500 transition-colors">
                        {mission.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded bg-[var(--color-bg-elevated)]/80 text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-primary)]">
                          {mission.type}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
                          mission.status === "BRIEFED"
                            ? "bg-purple-600/20 text-purple-400"
                            : "bg-tactical-500/20 text-tactical-500"
                        }`}>
                          {mission.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {mission.aircraft.length > 0 && mission.aircraft[0].callsign}
                        </span>
                      </div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-command-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Briefing Packages */}
      {briefedMissions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse-slow" />
            <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-purple-400">
              Briefing Packages
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {briefedMissions.map((mission) => (
              <div
                key={mission.id}
                className="glass-panel rounded-xl border border-purple-500/20 p-4 transition-all duration-200 hover:border-purple-500/40"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">{mission.name}</h3>
                    {mission.scheduledStart && (
                      <span className="text-xs text-[var(--color-text-muted)] font-mono">
                        {new Date(mission.scheduledStart).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/missions/${mission.id}/briefing`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg text-purple-300 text-xs font-mono transition-all duration-200"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      PDF
                    </a>
                    <button
                      onClick={() => navigate(`/missions/${mission.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-bg-elevated)]/50 hover:bg-[var(--color-bg-elevated)]/50 border border-[var(--color-border-subtle)] rounded-lg text-[var(--color-text-primary)] text-xs font-mono transition-all duration-200"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Assigned Missions */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-tactical-500 animate-pulse-slow" />
        <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-tactical-500">
          All Assigned Missions
        </h2>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
            <div className="w-2 h-2 rounded-full bg-tactical-500 animate-pulse-slow" />
            <span className="font-mono text-sm tracking-wide">Loading missions...</span>
          </div>
        </div>
      )}

      {!loading && activeMissions.length === 0 && (
        <div className="glass-panel rounded-xl border border-[var(--color-border-subtle)] py-16 text-center">
          <div className="text-[var(--color-text-muted)] text-4xl mb-3">--</div>
          <p className="text-[var(--color-text-secondary)] font-mono text-sm">No missions currently assigned</p>
        </div>
      )}

      {!loading && activeMissions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {activeMissions.map((mission) => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      )}
    </>
  );
}
