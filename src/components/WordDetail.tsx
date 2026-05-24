import { useMemo, useState } from "react";
import type { WordDetail as WordDetailType, WordSense } from "../types";
import { POSBadge } from "./POSBadge";
import { SenseCard } from "./SenseCard";
import { RelatedWords } from "./RelatedWords";
import { POS_LABELS } from "../types";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { open } from "@tauri-apps/plugin-shell";
import { Copy, Globe } from "lucide-react";

interface WordDetailProps {
  word: WordDetailType;
  onWordClick: (word: string) => void;
}

export function WordDetailView({ word, onWordClick }: WordDetailProps) {
  const [copied, setCopied] = useState(false);

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

  const handleCopy = async () => {
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
    
    try {
      await writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback
      navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <article style={{ animation: "fadeIn 0.3s ease-out" }}>
      <div className="word-header">
        <div>
          <h1 className="word-title">
            {word.word}
            {word.pronunciation && (
              <span style={{ fontSize: "1.25rem", color: "var(--color-text-muted)", marginLeft: "1rem", fontWeight: "normal" }}>
                /{word.pronunciation}/
              </span>
            )}
          </h1>
          {word.derived_forms.length > 0 && (
            <p className="word-forms">Forms: {word.derived_forms.join(", ")}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => {
              open(`https://en.wikipedia.org/wiki/${encodeURIComponent(word.word)}`);
            }}
            className="titlebar-btn"
            title="Search Wikipedia"
            style={{ width: "2.5rem", height: "2.5rem", borderRadius: "12px", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <Globe size={18} />
          </button>
          <button
            onClick={handleCopy}
            className="titlebar-btn"
            title={copied ? "Copied!" : "Copy details"}
            style={{ width: "2.5rem", height: "2.5rem", borderRadius: "12px", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            {copied ? <span style={{fontSize: "0.8rem", fontWeight: "bold"}}>✓</span> : <Copy size={18} />}
          </button>
        </div>
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
