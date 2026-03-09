import type { ActivityEntry } from "../hooks/use-mission-socket";

interface Props {
  activities: ActivityEntry[];
}

const TYPE_ICON: Record<string, { icon: string; color: string }> = {
  waypoint_added: { icon: "+", color: "text-tactical-500 bg-tactical-600/20" },
  waypoint_updated: { icon: "~", color: "text-command-400 bg-command-600/20" },
  waypoint_deleted: { icon: "-", color: "text-danger-500 bg-danger-600/20" },
  status_changed: { icon: "S", color: "text-accent-400 bg-accent-600/20" },
  threat_added: { icon: "T", color: "text-danger-500 bg-danger-600/20" },
  threat_removed: { icon: "T", color: "text-[var(--color-text-secondary)] bg-military-600/20" },
  weather_added: { icon: "W", color: "text-command-400 bg-command-600/20" },
  deconfliction_run: { icon: "D", color: "text-accent-400 bg-accent-600/20" },
  lock_acquired: { icon: "L", color: "text-command-400 bg-command-600/20" },
  lock_released: { icon: "U", color: "text-[var(--color-text-secondary)] bg-military-600/20" },
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ActivityFeed({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-4 border border-[var(--color-border-primary)]">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
          Activity Feed
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] text-center py-4 font-mono">
          No activity yet. Changes will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl p-4 border border-[var(--color-border-primary)]">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
        Activity Feed
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[var(--color-scrollbar-thumb)] scrollbar-track-transparent">
        {activities.map((entry) => {
          const typeInfo = TYPE_ICON[entry.type] || { icon: "?", color: "text-[var(--color-text-secondary)] bg-military-600/20" };
          return (
            <div
              key={entry.id}
              className="flex items-start gap-2.5 py-1.5 border-b border-[var(--color-border-subtle)] last:border-0 animate-fade-in"
            >
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-md ${typeInfo.color} flex items-center justify-center text-xs font-bold font-mono mt-0.5`}
              >
                {typeInfo.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--color-text-primary)] leading-relaxed">
                  {entry.userName && (
                    <span className="font-semibold text-[var(--color-text-primary)]">{entry.userName} </span>
                  )}
                  {entry.message}
                </p>
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                  {formatTimestamp(entry.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
