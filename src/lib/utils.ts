import { clsx, type ClassValue } from "clsx";

/** Merge class names with clsx (no twMerge needed in Tailwind v4). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

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

/** Get a color class for a POS code. Returns Tailwind color tokens. */
export function getPOSColor(pos: string): {
  bg: string;
  text: string;
  dot: string;
} {
  const colors: Record<string, { bg: string; text: string; dot: string }> = {
    n: {
      bg: "bg-blue-500/10",
      text: "text-blue-600 dark:text-blue-400",
      dot: "bg-blue-500",
    },
    v: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-500",
    },
    a: {
      bg: "bg-amber-500/10",
      text: "text-amber-600 dark:text-amber-400",
      dot: "bg-amber-500",
    },
    s: {
      bg: "bg-amber-500/10",
      text: "text-amber-600 dark:text-amber-400",
      dot: "bg-amber-500",
    },
    r: {
      bg: "bg-purple-500/10",
      text: "text-purple-600 dark:text-purple-400",
      dot: "bg-purple-500",
    },
  };
  return (
    colors[pos] ?? {
      bg: "bg-gray-500/10",
      text: "text-gray-600 dark:text-gray-400",
      dot: "bg-gray-500",
    }
  );
}
