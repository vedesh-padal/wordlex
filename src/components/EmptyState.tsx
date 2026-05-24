import { LogoIcon } from "./LogoIcon";

export function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon-container">
        <LogoIcon size={48} color="var(--color-ring)" />
      </div>

      <h2 className="empty-title">Start typing to look up a word</h2>
      <p className="empty-desc">
        Search through 150,000+ English words with definitions,
        <br />
        synonyms, antonyms, and related words.
      </p>

      <div className="shortcuts-grid">
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
    <div className="shortcut-item">
      <kbd className="kbd-shortcut">{icon}</kbd>
      <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
        {label}
      </span>
    </div>
  );
}
