export interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  context: "global" | "dashboard" | "mission";
  sequence?: boolean; // true for multi-key sequences like "G then D"
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Global shortcuts
  {
    id: "show-help",
    keys: ["?", "Ctrl+/"],
    description: "Show keyboard shortcuts",
    context: "global",
  },
  {
    id: "command-palette",
    keys: ["Ctrl+K"],
    description: "Open command palette",
    context: "global",
  },
  {
    id: "go-dashboard",
    keys: ["G then D"],
    description: "Go to dashboard",
    context: "global",
    sequence: true,
  },
  {
    id: "go-audit",
    keys: ["G then A"],
    description: "Go to audit log",
    context: "global",
    sequence: true,
  },
  {
    id: "close",
    keys: ["Escape"],
    description: "Close modals / panels",
    context: "global",
  },

  // Dashboard shortcuts
  {
    id: "focus-search",
    keys: ["Ctrl+K", "/"],
    description: "Focus search",
    context: "dashboard",
  },
  {
    id: "new-mission",
    keys: ["Ctrl+N", "N"],
    description: "New mission (Planner only)",
    context: "dashboard",
  },

  // Mission page shortcuts
  {
    id: "save-briefing",
    keys: ["Ctrl+S"],
    description: "Download briefing package",
    context: "mission",
  },
  {
    id: "export-map",
    keys: ["Ctrl+E"],
    description: "Export map as PNG",
    context: "mission",
  },
  {
    id: "toggle-measure",
    keys: ["M"],
    description: "Toggle measurement tool",
    context: "mission",
  },
  {
    id: "toggle-terrain",
    keys: ["T"],
    description: "Toggle terrain layer",
    context: "mission",
  },
];

export function getShortcutsByContext(context: KeyboardShortcut["context"]): KeyboardShortcut[] {
  return KEYBOARD_SHORTCUTS.filter((s) => s.context === context);
}

export function formatKey(key: string): string {
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  return key
    .replace(/Ctrl/g, isMac ? "\u2318" : "Ctrl")
    .replace(/Alt/g, isMac ? "\u2325" : "Alt")
    .replace(/Shift/g, isMac ? "\u21E7" : "Shift")
    .replace(/Escape/g, "Esc");
}
