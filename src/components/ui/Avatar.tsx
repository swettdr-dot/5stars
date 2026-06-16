/** Paletas de avatar (bg, texto) que rotan por índice — del handoff. */
const PALETTE: [string, string][] = [
  ["#EEF0FF", "#4F46E5"],
  ["#E9F7EE", "#16A34A"],
  ["#FDF0E6", "#D97706"],
  ["#FCE9F0", "#DB2777"],
  ["#E6F4F8", "#0891B2"],
  ["#F0ECFA", "#7C3AED"],
];

export function avatarPalette(index: number): { bg: string; fg: string } {
  const [bg, fg] = PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length];
  return { bg, fg };
}

export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/** Avatar circular con iniciales y color por índice. */
export function Avatar({
  name,
  index = 0,
  size = 34,
}: {
  name: string;
  index?: number;
  size?: number;
}) {
  const { bg, fg } = avatarPalette(index);
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.37 }}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}
