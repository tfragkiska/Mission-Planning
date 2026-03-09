import { useEffect } from "react";
import { KEYBOARD_SHORTCUTS, formatKey } from "../lib/keyboard-shortcuts";
import type { KeyboardShortcut } from "../lib/keyboard-shortcuts";

interface Props {
  onClose: () => void;
}

function KeyCombo({ keys }: { keys: string }) {
  const parts = keys.split("+").flatMap((part) =>
    part.includes(" then ") ? part.split(" then ") : [part],
  );
  const isThenSequence = keys.includes(" then ");

  return (
    <span className="inline-flex items-center gap-1">
      {parts.map((part, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && !isThenSequence && (
            <span className="text-[var(--color-text-muted)] text-[10px]">+</span>
          )}
          {i > 0 && isThenSequence && (
            <span className="text-[var(--color-text-muted)] text-[10px] mx-0.5">then</span>
          )}
          <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] text-xs font-mono font-semibold shadow-[0_1px_0_1px_rgba(0,0,0,0.3)]">
            {formatKey(part.trim())}
          </kbd>
        </span>
      ))}
    </span>
  );
}

function ShortcutRow({ shortcut }: { shortcut: KeyboardShortcut }) {
  return (
    <div className="flex items-center justify-between py-2 px-1">
      <span className="text-sm text-[var(--color-text-primary)]">{shortcut.description}</span>
      <div className="flex items-center gap-2 ml-4">
        {shortcut.keys.map((k, i) => (
          <span key={k} className="inline-flex items-center gap-1">
            {i > 0 && (
              <span className="text-[var(--color-text-muted)] text-xs mx-1">or</span>
            )}
            <KeyCombo keys={k} />
          </span>
        ))}
      </div>
    </div>
  );
}

function ShortcutGroup({
  title,
  shortcuts,
}: {
  title: string;
  shortcuts: KeyboardShortcut[];
}) {
  if (shortcuts.length === 0) return null;
  return (
    <div className="mb-5 last:mb-0">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-tactical-500 mb-2 pb-1 border-b border-[var(--color-border-primary)]">
        {title}
      </h3>
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {shortcuts.map((s) => (
          <ShortcutRow key={s.id} shortcut={s} />
        ))}
      </div>
    </div>
  );
}

export default function ShortcutHelp({ onClose }: Props) {
  const globalShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.context === "global");
  const dashboardShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.context === "dashboard");
  const missionShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.context === "mission");

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative glass-panel bg-[var(--color-bg-secondary)]/95 border border-[var(--color-border-primary)] rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--color-bg-secondary)]/95 backdrop-blur-sm border-b border-[var(--color-border-primary)] px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-tactical-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h4M18 12h.01M6 16h.01M10 16h4M18 16h.01" />
            </svg>
            <h2 className="text-base font-bold tracking-wide text-[var(--color-text-primary)] uppercase">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-1"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <ShortcutGroup title="Global" shortcuts={globalShortcuts} />
          <ShortcutGroup title="Dashboard" shortcuts={dashboardShortcuts} />
          <ShortcutGroup title="Mission Page" shortcuts={missionShortcuts} />
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--color-border-primary)] px-6 py-3 text-center">
          <span className="text-xs text-[var(--color-text-muted)] font-mono">
            Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] text-[10px] font-mono mx-0.5">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
