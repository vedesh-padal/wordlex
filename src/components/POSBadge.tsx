import { cn, formatPOS, getPOSColor } from "../lib/utils";

interface POSBadgeProps {
  pos: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Colour-coded part-of-speech badge.
 *
 * Renders a pill-shaped badge with a coloured dot and label.
 * Sizes: sm (inline), md (default), lg (section headers).
 */
export function POSBadge({ pos, size = "md" }: POSBadgeProps) {
  const color = getPOSColor(pos);
  const label = formatPOS(pos);

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-1 text-xs",
    lg: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full",
        "uppercase tracking-wider",
        color.bg,
        color.text,
        sizeClasses[size]
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", color.dot)} />
      {label}
    </span>
  );
}
