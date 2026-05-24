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

/**
 * Full definition view for a looked-up word.
 *
 * Senses are grouped by part of speech, with each group getting a section
 * header with a POS badge. Within each group, senses are numbered sequentially.
 *
 * Below the senses, related words are shown (hypernyms, hyponyms, derived forms).
 */
export function WordDetailView({ word, onWordClick }: WordDetailProps) {
  // Group senses by POS
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

  // Build plain text for clipboard
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
    navigator.clipboard.writeText(lines.join("\n"));
  };

  return (
    <article className="flex-1 overflow-y-auto px-6 py-5 space-y-6 animate-fade-in">
      {/* Word heading */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: "var(--color-fg)" }}
          >
            {word.word}
          </h1>
          {word.derived_forms.length > 0 && (
            <p
              className="text-xs mt-1"
              style={{ color: "var(--color-fg-muted)" }}
            >
              Forms: {word.derived_forms.join(", ")}
            </p>
          )}
        </div>
        <button
          onClick={copyDefinition}
          title="Copy full definition"
          className="shrink-0 p-2 rounded-lg transition-colors duration-150
                     hover:bg-[var(--color-surface-hover)]"
          style={{ color: "var(--color-fg-muted)" }}
        >
          <Copy size={16} />
        </button>
      </div>

      {/* Divider */}
      <div
        className="h-px"
        style={{ backgroundColor: "var(--color-border)" }}
      />

      {/* Senses grouped by POS */}
      {posOrder.map((pos) => {
        const senses = groupedSenses[pos];
        return (
          <section key={pos} className="space-y-1">
            {/* POS section header */}
            <div className="flex items-center gap-3 pb-1">
              <POSBadge pos={pos} size="lg" />
              <span
                className="text-xs"
                style={{ color: "var(--color-fg-muted)" }}
              >
                {senses.length} {senses.length === 1 ? "sense" : "senses"}
              </span>
            </div>

            {/* Sense cards */}
            <div className="pl-1">
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

      {/* Related words */}
      {(word.hypernyms.length > 0 ||
        word.hyponyms.length > 0) && (
        <>
          <div
            className="h-px"
            style={{ backgroundColor: "var(--color-border)" }}
          />
          <div className="space-y-4 pb-4">
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
          </div>
        </>
      )}
    </article>
  );
}
