import { useMemo } from "react";
import type { WordDetail as WordDetailType, WordSense } from "../types";
import { POSBadge } from "./POSBadge";
import { SenseCard } from "./SenseCard";
import { RelatedWords } from "./RelatedWords";
import { POS_LABELS } from "../types";
import { Copy } from "lucide-react";

interface WordDetailProps {
  word: WordDetailType;
  onWordClick: (word: string) => void;
}

export function WordDetailView({ word, onWordClick }: WordDetailProps) {
  const groupedSenses = useMemo(() => {
    const groups: Record<string, WordSense[]> = {};
    for (const sense of word.senses) {
      const key = sense.pos;
      if (!groups[key]) groups[key] = [];
      groups[key].push(sense);
    }
    return groups;
  }, [word.senses]);

  const posOrder = Object.keys(groupedSenses);

  const copyDefinition = () => {
    const lines: string[] = [`${word.word}\n`];
    for (const pos of posOrder) {
      const senses = groupedSenses[pos];
      const label = POS_LABELS[pos] ?? pos;
      lines.push(`  ${label.toUpperCase()}`);
      senses.forEach((s, i) => {
        lines.push(`    ${i + 1}. ${s.definition}`);
        if (s.synonyms.length > 0) {
          lines.push(`       Synonyms: ${s.synonyms.join(", ")}`);
        }
        if (s.antonyms.length > 0) {
          lines.push(`       Antonyms: ${s.antonyms.join(", ")}`);
        }
        s.examples.forEach((ex) => {
          lines.push(`       Example: "${ex}"`);
        });
      });
      lines.push("");
    }
    if (word.hypernyms.length > 0) {
      lines.push(`  Type of: ${word.hypernyms.join(", ")}`);
    }
    if (word.hyponyms.length > 0) {
      lines.push(`  Types: ${word.hyponyms.join(", ")}`);
    }
    if (word.holonyms.length > 0) {
      lines.push(`  Part of: ${word.holonyms.join(", ")}`);
    }
    if (word.meronyms.length > 0) {
      lines.push(`  Parts: ${word.meronyms.join(", ")}`);
    }
    navigator.clipboard.writeText(lines.join("\n"));
  };

  return (
    <article style={{ animation: "fadeIn 0.3s ease-out" }}>
      <div className="word-header">
        <div>
          <h1 className="word-title">{word.word}</h1>
          {word.derived_forms.length > 0 && (
            <p className="word-forms">Forms: {word.derived_forms.join(", ")}</p>
          )}
        </div>
        <button
          onClick={copyDefinition}
          title="Copy full definition"
          className="titlebar-btn"
          style={{ width: "2.5rem", height: "2.5rem", borderRadius: "10px", background: "rgba(255,255,255,0.05)" }}
        >
          <Copy size={18} />
        </button>
      </div>

      <div className="divider" />

      {posOrder.map((pos) => {
        const senses = groupedSenses[pos];
        return (
          <section key={pos} className="sense-group">
            <div className="sense-header">
              <POSBadge pos={pos} size="lg" />
              <span className="sense-count">
                {senses.length} {senses.length === 1 ? "sense" : "senses"}
              </span>
            </div>

            <div style={{ paddingLeft: "0.25rem" }}>
              {senses.map((sense, i) => (
                <SenseCard
                  key={sense.synset_id}
                  sense={sense}
                  index={i}
                  onWordClick={onWordClick}
                />
              ))}
            </div>
          </section>
        );
      })}

      {(word.hypernyms.length > 0 || word.hyponyms.length > 0 || word.meronyms.length > 0 || word.holonyms.length > 0) && (
        <>
          <div className="divider" />
          <div style={{ paddingBottom: "1rem" }}>
            <RelatedWords
              title="Type of"
              words={word.hypernyms}
              onWordClick={onWordClick}
            />
            <RelatedWords
              title="Types"
              words={word.hyponyms}
              onWordClick={onWordClick}
            />
            <RelatedWords
              title="Part of"
              words={word.holonyms}
              onWordClick={onWordClick}
            />
            <RelatedWords
              title="Parts"
              words={word.meronyms}
              onWordClick={onWordClick}
            />
          </div>
        </>
      )}
    </article>
  );
}
