"use client";

export type ChipOption = { id: string; label: string; emoji?: string };

// Rangée de filtres défilante (pastilles), style Instagram.
export function Chips({ options, value, onChange, label }: { options: ChipOption[]; value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div className="space-y-2" role="group" aria-label={label}>
      {label && <p className="px-4 text-[10px] font-semibold uppercase tracking-wider text-muted md:px-0">{label}</p>}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 md:px-0">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={`min-h-10 shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition active:scale-95 ${on ? "border-fg bg-fg text-bg shadow-sm" : "border-line bg-bg hover:border-muted"}`}
          >
            {o.emoji ? `${o.emoji} ` : ""}
            {o.label}
          </button>
        );
      })}
      </div>
    </div>
  );
}
