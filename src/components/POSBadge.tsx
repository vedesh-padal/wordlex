import { formatPOS } from "../lib/utils";

interface POSBadgeProps {
  pos: string;
  size?: "sm" | "md" | "lg";
}

export function POSBadge({ pos, size = "md" }: POSBadgeProps) {
  const label = formatPOS(pos);

  // We set custom properties inline to leverage the CSS variables we defined in index.css
  const style = {
    backgroundColor: `var(--color-${pos}-bg, rgba(255,255,255,0.1))`,
    color: `var(--color-${pos}-text, #fff)`,
  };
  
  const dotStyle = {
    backgroundColor: `var(--color-${pos}-text, #fff)`,
  };

  // Add specific sizing tweaks if it's small or large
  const sizeStyle = size === "sm" ? { padding: "0.15rem 0.35rem", fontSize: "0.55rem" } :
                    size === "lg" ? { padding: "0.25rem 0.6rem", fontSize: "0.7rem" } : {};

  return (
    <span className="pos-badge" style={{ ...style, ...sizeStyle }}>
      <span className="dot" style={dotStyle} />
      {label}
    </span>
  );
}
