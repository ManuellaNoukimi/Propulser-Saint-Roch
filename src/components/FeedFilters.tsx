"use client";

import { useEffect, useId, useRef } from "react";
import { Menu, RotateCcw } from "lucide-react";

type FilterField = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { id: string; label: string }[];
};

function fitMenu(menu: HTMLDetailsElement | null) {
  if (!menu?.open) return;
  const inset = window.matchMedia("(max-width: 767px)").matches ? 96 : 24;
  const available = window.innerHeight - menu.getBoundingClientRect().bottom - 12 - inset;
  menu.style.setProperty("--filters-max-height", `${Math.max(100, Math.min(480, available))}px`);
}

export function FeedFilters({ fields, count, onReset }: { fields: FilterField[]; count: number; onReset: () => void }) {
  const id = useId();
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !menu.current?.open) return;
      event.preventDefault();
      menu.current.open = false;
      menu.current.querySelector("summary")?.focus();
    }
    const resize = () => fitMenu(menu.current);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <details ref={menu} onToggle={() => fitMenu(menu.current)} className="group relative shrink-0">
      <summary title="Filtres" aria-label={count ? `Filtres (${count} actifs)` : "Filtres"} className={`relative grid h-11 w-11 list-none place-items-center rounded-lg border transition [&::-webkit-details-marker]:hidden ${count ? "border-ig-blue bg-ig-blue/10 text-ig-blue" : "border-line bg-bg hover:bg-soft"} group-open:border-ig-blue group-open:text-ig-blue`}>
        <Menu size={20} />
        {count > 0 && <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-ig-blue px-1 text-[10px] font-bold text-white">{count}</span>}
      </summary>
      <div className="absolute right-0 top-full z-30 mt-3 max-h-[var(--filters-max-height,480px)] w-[300px] max-w-[calc(100vw-32px)] overflow-y-auto overscroll-contain rounded-lg border border-line bg-bg p-5 shadow-xl">
        <h2 className="mb-5 text-sm font-semibold">Filtres</h2>
        <div className="space-y-5">
          {fields.map((field, index) => (
            <div key={field.label} className="space-y-2">
              <label htmlFor={`${id}-${index}`} className="block text-xs font-medium text-muted">{field.label}</label>
              <select id={`${id}-${index}`} value={field.value} onChange={(event) => field.onChange(event.target.value)} className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm">
                {field.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </div>
          ))}
        </div>
        <button type="button" onClick={onReset} disabled={count === 0} className="mt-5 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-ig-blue disabled:cursor-default disabled:opacity-40"><RotateCcw size={14} /> Réinitialiser</button>
      </div>
    </details>
  );
}
