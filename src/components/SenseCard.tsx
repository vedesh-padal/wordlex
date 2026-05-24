import type { WordSense } from "../types";

interface SenseCardProps {
  sense: WordSense;
  index: number;
  onWordClick: (word: string) => void;
}

/**
 * Renders a single word sense — definition, synonyms, antonyms, and examples.
 *
 * Synonyms and antonyms are clickable, triggering a new lookup.
 * Examples are shown in italic with a left border accent.
 */
export function SenseCard({ sense, index, onWordClick }: SenseCardProps) {
  return (
    <div
      className="group py-3 animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Definition number + text */}
      <div className="flex gap-3">
        <span
          className="text-sm font-semibold shrink-0 w-6 text-right tabular-nums"
          style={{ color: "var(--color-fg-muted)" }}
        >
          {index + 1}.
        </span>
        <div className="flex-1 min-w-0 space-y-2">
          {/* Definition */}
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-fg)" }}>
            {sense.definition}
          </p>

          {/* Synonyms */}
          {sense.synonyms.length > 0 && (
            <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
              <span
                className="text-xs font-medium"
                style={{ color: "var(--color-fg-muted)" }}
              >
                Synonyms:
              </span>
              {sense.synonyms.map((syn, i) => (
                <span key={syn}>
                  <button
                    onClick={() => onWordClick(syn)}
                    className="text-xs font-medium transition-colors duration-150
                               hover:underline underline-offset-2"
                    style={{ color: "var(--color-ring)" }}
                  >
                    {syn}
                  </button>
                  {i < sense.synonyms.length - 1 && (
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-fg-muted)" }}
                    >
                      ,{" "}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Antonyms */}
          {sense.antonyms.length > 0 && (
            <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
              <span
                className="text-xs font-medium"
                style={{ color: "var(--color-fg-muted)" }}
              >
                Antonyms:
              </span>
              {sense.antonyms.map((ant, i) => (
                <span key={ant}>
                  <button
                    onClick={() => onWordClick(ant)}
                    className="text-xs font-medium transition-colors duration-150
                               hover:underline underline-offset-2 text-rose-500"
                  >
                    {ant}
                  </button>
                  {i < sense.antonyms.length - 1 && (
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-fg-muted)" }}
                    >
                      ,{" "}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Examples */}
          {sense.examples.length > 0 && (
            <div className="space-y-1 pt-1">
              {sense.examples.map((ex, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 pl-3 border-l-2"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <p
                    className="text-xs italic leading-relaxed"
                    style={{ color: "var(--color-fg-secondary)" }}
                  >
                    "{ex}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
