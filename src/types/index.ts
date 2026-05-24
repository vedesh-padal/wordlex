/** A single word sense — one meaning within a synset. */
export interface WordSense {
  synset_id: number;
  /** Part of speech code: "n", "v", "a", "r", "s" */
  pos: string;
  definition: string;
  synonyms: string[];
  antonyms: string[];
  examples: string[];
  /** Ordering within the synset (lower = more common) */
  sense_num: number;
}

/** Full detail for a looked-up word. */
export interface WordDetail {
  word: string;
  senses: WordSense[];
  /** "Type of" relationships */
  hypernyms: string[];
  /** "Types" relationships */
  hyponyms: string[];
  /** Words derived from this word */
  derived_forms: string[];
}

/** Lightweight search result for the type-ahead dropdown. */
export interface SearchResult {
  word: string;
  /** All POS codes this word appears as */
  pos_list: string[];
  /** First definition only */
  short_def: string;
}

/** POS code → display label mapping */
export const POS_LABELS: Record<string, string> = {
  n: "noun",
  v: "verb",
  a: "adjective",
  s: "adjective",
  r: "adverb",
};

/** POS code → sort order (nouns first, adverbs last) */
export const POS_ORDER: Record<string, number> = {
  n: 1,
  v: 2,
  a: 3,
  s: 4,
  r: 5,
};
