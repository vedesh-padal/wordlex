import type { WordSense } from "../types";

interface SenseCardProps {
  sense: WordSense;
  index: number;
  onWordClick: (word: string) => void;
}

export function SenseCard({ sense, index, onWordClick }: SenseCardProps) {
  return (
    <div className="sense-card" style={{ animationDelay: `${index * 50}ms` }}>
      <span className="sense-number">{index + 1}.</span>
      <div className="sense-content">
        <p className="sense-def">{sense.definition}</p>

        {sense.synonyms.length > 0 && (
          <div className="sense-relations">
            <span className="sense-rel-label">Synonyms:</span>
            {sense.synonyms.map((syn, i) => (
              <span key={syn}>
                <button
                  onClick={() => onWordClick(syn)}
                  className="sense-rel-word"
                >
                  {syn}
                </button>
                {i < sense.synonyms.length - 1 && (
                  <span style={{ color: "var(--color-text-muted)" }}>, </span>
                )}
              </span>
            ))}
          </div>
        )}

        {sense.antonyms.length > 0 && (
          <div className="sense-relations">
            <span className="sense-rel-label">Antonyms:</span>
            {sense.antonyms.map((ant, i) => (
              <span key={ant}>
                <button
                  onClick={() => onWordClick(ant)}
                  className="sense-rel-word antonym"
                >
                  {ant}
                </button>
                {i < sense.antonyms.length - 1 && (
                  <span style={{ color: "var(--color-text-muted)" }}>, </span>
                )}
              </span>
            ))}
          </div>
        )}

        {sense.examples.length > 0 && (
          <div className="sense-examples">
            {sense.examples.map((ex, i) => (
              <p key={i} className="sense-example">"{ex}"</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
