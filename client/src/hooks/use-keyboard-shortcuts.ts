import { useEffect, useRef, useCallback } from "react";

type ShortcutHandler = (e: KeyboardEvent) => void;

interface ShortcutBinding {
  /** Key combo string, e.g. "Ctrl+K", "?", "Shift+N", "Escape" */
  key: string;
  handler: ShortcutHandler;
  /** If true, this is part of a sequence (e.g. "G then D") — handled separately */
  sequence?: boolean;
}

function isInputTarget(e: KeyboardEvent): boolean {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((e.target as HTMLElement)?.isContentEditable) return true;
  return false;
}

function parseCombo(combo: string): { ctrl: boolean; shift: boolean; alt: boolean; key: string } {
  const parts = combo.split("+").map((p) => p.trim());
  const ctrl = parts.includes("Ctrl");
  const shift = parts.includes("Shift");
  const alt = parts.includes("Alt");
  const key = parts.filter((p) => !["Ctrl", "Shift", "Alt"].includes(p))[0] || "";
  return { ctrl, shift, alt, key };
}

function matchesCombo(
  e: KeyboardEvent,
  combo: { ctrl: boolean; shift: boolean; alt: boolean; key: string },
): boolean {
  const ctrlOrMeta = e.ctrlKey || e.metaKey;
  if (combo.ctrl !== ctrlOrMeta) return false;
  if (combo.shift !== e.shiftKey) return false;
  if (combo.alt !== e.altKey) return false;

  const pressedKey = e.key.length === 1 ? e.key : e.key;
  // Handle special keys
  if (combo.key === "?") return pressedKey === "?";
  if (combo.key === "/") return pressedKey === "/" || e.code === "Slash";
  if (combo.key === "Escape") return e.key === "Escape";

  return pressedKey.toLowerCase() === combo.key.toLowerCase();
}

/**
 * Register global keyboard shortcuts.
 *
 * Supports:
 * - Simple keys: "?", "/", "N", "M", "T"
 * - Modifier combos: "Ctrl+K", "Ctrl+S", "Ctrl+N"
 * - Key sequences: pass `sequence: true` for bindings like "G then D"
 *   (the first key of the sequence should be registered as "G>D")
 *
 * Shortcuts are suppressed when focus is inside an input, textarea, or contenteditable.
 * Modifier combos (Ctrl+X) still fire even in inputs (they preventDefault to avoid browser defaults).
 */
export function useKeyboardShortcuts(bindings: ShortcutBinding[], enabled = true) {
  const sequenceBuffer = useRef<{ key: string; timestamp: number } | null>(null);
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const inInput = isInputTarget(e);
      const now = Date.now();

      for (const binding of bindingsRef.current) {
        // Handle sequences like "G>D" meaning press G, then D within 1 second
        if (binding.sequence) {
          const [firstKey, secondKey] = binding.key.split(">");
          if (!firstKey || !secondKey) continue;

          // Check if this keystroke is the second key of the sequence
          if (
            sequenceBuffer.current &&
            sequenceBuffer.current.key === firstKey.toLowerCase() &&
            now - sequenceBuffer.current.timestamp < 1000 &&
            e.key.toLowerCase() === secondKey.toLowerCase() &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.altKey
          ) {
            if (inInput) continue;
            e.preventDefault();
            sequenceBuffer.current = null;
            binding.handler(e);
            return;
          }
          continue;
        }

        const combo = parseCombo(binding.key);

        if (matchesCombo(e, combo)) {
          // Allow non-modifier keys only when not in an input
          if (!combo.ctrl && !combo.alt && inInput) continue;

          e.preventDefault();
          binding.handler(e);
          return;
        }
      }

      // Track potential sequence starters (single letter, no modifiers)
      if (
        !inInput &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        sequenceBuffer.current = { key: e.key.toLowerCase(), timestamp: now };
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        sequenceBuffer.current = null;
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}
