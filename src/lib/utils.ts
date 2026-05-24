/** Maps a POS code to a human-readable label. */
export function formatPOS(pos: string): string {
  const labels: Record<string, string> = {
    n: "noun",
    v: "verb",
    a: "adjective",
    s: "adjective",
    r: "adverb",
  };
  return labels[pos] ?? pos;
}
