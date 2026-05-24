import { LogoIcon } from "./LogoIcon";
import { emit } from "@tauri-apps/api/event";

export function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon-container">
        <LogoIcon size={48} color="var(--color-ring)" />
      </div>

      <h2 className="empty-title">Start typing to look up a word</h2>
      <p className="empty-subtitle">
        Search through 150,000+ English words with definitions, <br />
        synonyms, antonyms, and related words.
      </p>

      <div style={{ marginTop: "2rem" }}>
        <button 
          onClick={() => emit("show-random-word")}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--color-ring)",
            padding: "0.5rem 1rem",
            borderRadius: "9999px",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: "0.95rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.2s ease",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-bg-secondary)";
            e.currentTarget.style.color = "var(--color-text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--color-ring)";
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
          Surprise me with a word
        </button>
      </div>

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
