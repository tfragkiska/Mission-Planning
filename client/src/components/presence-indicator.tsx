import type { PresenceUser } from "../hooks/use-mission-socket";

interface Props {
  users: PresenceUser[];
  currentUserId?: string;
}

const AVATAR_COLORS = [
  "bg-command-500",
  "bg-tactical-500",
  "bg-accent-500",
  "bg-danger-500",
  "bg-command-400",
  "bg-tactical-400",
  "bg-accent-400",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const ROLE_LABEL: Record<string, string> = {
  PLANNER: "Planner",
  PILOT: "Pilot",
  COMMANDER: "Commander",
};

export default function PresenceIndicator({ users, currentUserId }: Props) {
  if (users.length === 0) return null;

  const otherUsers = users.filter((u) => u.userId !== currentUserId);
  const maxVisible = 5;
  const visible = otherUsers.slice(0, maxVisible);
  const overflow = otherUsers.length - maxVisible;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--color-text-secondary)] text-xs font-mono uppercase tracking-wider mr-1">
        Online
      </span>
      <div className="flex -space-x-2">
        {visible.map((user) => (
          <div
            key={user.userId}
            className="relative group"
          >
            <div
              className={`w-8 h-8 rounded-full ${getColor(user.userId)} flex items-center justify-center text-xs font-bold text-[var(--color-text-primary)] ring-2 ring-[var(--color-bg-primary)] cursor-default transition-transform hover:scale-110 hover:z-10`}
              title={`${user.name} (${ROLE_LABEL[user.role] || user.role})`}
            >
              {getInitials(user.name)}
            </div>
            {/* Online dot */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-[var(--color-bg-primary)]" />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] rounded text-xs text-[var(--color-text-primary)] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
              {user.name}
              <span className="text-[var(--color-text-secondary)] ml-1">({ROLE_LABEL[user.role] || user.role})</span>
            </div>
          </div>
        ))}
        {overflow > 0 && (
          <div className="w-8 h-8 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center text-xs font-bold text-[var(--color-text-primary)] ring-2 ring-[var(--color-bg-primary)]">
            +{overflow}
          </div>
        )}
      </div>
      <span className="text-[var(--color-text-muted)] text-xs font-mono">
        {otherUsers.length === 0
          ? "Only you"
          : `${otherUsers.length} other${otherUsers.length !== 1 ? "s" : ""}`}
      </span>
    </div>
  );
}
