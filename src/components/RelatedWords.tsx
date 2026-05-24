interface RelatedWordsProps {
  title: string;
  words: string[];
  onWordClick: (word: string) => void;
}

export function RelatedWords({
  title,
  words,
  onWordClick,
}: RelatedWordsProps) {
  if (words.length === 0) return null;

  return (
    <div className="chip-section">
      <h3 className="chip-title">{title}</h3>
      <div className="chip-list">
        {words.map((word) => (
          <button
            key={word}
            onClick={() => onWordClick(word)}
            className="chip"
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}
