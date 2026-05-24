interface RelatedWordsProps {
  title: string;
  words: string[];
  onWordClick: (word: string) => void;
}

/**
 * Horizontally scrolling chip list for related words.
 *
 * Used for hypernyms ("Type of"), hyponyms ("Types"), and derived forms.
 * Each chip is clickable, triggering a new word lookup.
 */
export function RelatedWords({
  title,
  words,
  onWordClick,
}: RelatedWordsProps) {
  if (words.length === 0) return null;

  return (
    <div className="space-y-2 animate-fade-in">
      <h3
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-fg-muted)" }}
      >
        {title}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {words.map((word) => (
          <button
            key={word}
            onClick={() => onWordClick(word)}
            className="px-2.5 py-1 text-xs font-medium rounded-full
                       border transition-all duration-150
                       hover:scale-[1.03] active:scale-[0.97]"
            style={{
              color: "var(--color-fg-secondary)",
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-bg-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "var(--color-surface-hover)";
              e.currentTarget.style.borderColor = "var(--color-ring)";
              e.currentTarget.style.color = "var(--color-ring)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                "var(--color-bg-secondary)";
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.color = "var(--color-fg-secondary)";
            }}
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}
