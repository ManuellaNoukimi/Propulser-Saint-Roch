import type { Badge } from "@/lib/types";

export function BadgeChips({ badges }: { badges: Badge[] }) {
  if (!badges.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {badges.map((b) => (
        <span key={b.id} title={`${b.label} : ${b.description}`} className="inline-flex items-center gap-1 rounded-full bg-sep px-2 py-0.5 text-[11px] font-semibold">
          {b.emoji} {b.label}
        </span>
      ))}
    </span>
  );
}
