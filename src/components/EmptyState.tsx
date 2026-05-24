import { BookOpen } from "lucide-react";

/**
 * Empty state shown when no word is selected.
 *
 * Displays a book icon, instructional text, and keyboard shortcut hints.
 * Serves as both a landing page and a gentle tutorial.
 */
export function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 animate-fade-in">
      {/* Icon */}
      <div
        className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg-tertiary)" }}
      >
        <BookOpen
          size={32}
          className="text-blue-500/70"
          strokeWidth={1.5}
        />
        {/* Decorative dot */}
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500/30 animate-pulse" />
      </div>

      {/* Text */}
      <div className="text-center space-y-2">
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--color-fg)" }}
        >
          Start typing to look up a word
        </h2>
        <p className="text-sm" style={{ color: "var(--color-fg-muted)" }}>
          Search through 150,000+ English words with definitions,
          <br />
          synonyms, antonyms, and related words.
        </p>
      </div>

      {/* Keyboard shortcuts */}
      <div className="flex flex-wrap justify-center gap-4 mt-2">
        <ShortcutHint icon="Alt+W" label="Open from anywhere" />
        <ShortcutHint icon="Ctrl+L" label="Focus search" />
        <ShortcutHint icon="↑ ↓" label="Navigate results" />
        <ShortcutHint icon="Enter" label="Select" />
        <ShortcutHint icon="Esc" label="Clear" />
      </div>
    </div>
  );
}

function ShortcutHint({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <kbd
        className="inline-flex items-center px-1.5 py-0.5
                    text-[10px] font-medium rounded border"
        style={{
          color: "var(--color-fg-muted)",
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-bg-secondary)",
        }}
      >
        {icon}
      </kbd>
      <span className="text-xs" style={{ color: "var(--color-fg-muted)" }}>
        {label}
      </span>
    </div>
  );
}
