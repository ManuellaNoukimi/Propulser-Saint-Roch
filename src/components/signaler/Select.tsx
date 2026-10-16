"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption<T extends string> = { value: T; label: string; hint?: string; icon?: ReactNode; color?: string };

/**
 * Menu déroulant maison (le <select> natif ne se met pas en forme) : bouton + liste animée, couleurs de la catégorie,
 * clavier complet (flèches, Début/Fin, Entrée, Échap, première lettre) et fermeture au clic dehors.
 */
export function Select<T extends string>({ label, value, options, onChange, placeholder = "Choisir…", accent, optional }: {
  label: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T | null) => void;
  placeholder?: string;
  accent?: string;
  optional?: boolean; // ajoute « Aucune précision » en tête de liste
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const all: (SelectOption<T> | null)[] = optional ? [null, ...options] : options;
  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function show() {
    const i = all.findIndex((o) => (o?.value ?? null) === value);
    setActive(i < 0 ? 0 : i);
    setOpen(true);
  }
  function pick(i: number) {
    onChange(all[i]?.value ?? null);
    setOpen(false);
    root.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }
  function onKey(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); show(); }
      return;
    }
    const last = all.length - 1;
    const moves: Record<string, number> = { ArrowDown: Math.min(last, active + 1), ArrowUp: Math.max(0, active - 1), Home: 0, End: last, PageDown: Math.min(last, active + 5), PageUp: Math.max(0, active - 5) };
    if (e.key in moves) { e.preventDefault(); setActive(moves[e.key]); return; }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(active); return; }
    if (e.key === "Escape" || e.key === "Tab") { if (e.key === "Escape") e.preventDefault(); setOpen(false); return; }
    if (e.key.length === 1) {
      const k = e.key.toLowerCase();
      const i = all.findIndex((o, n) => n > active && o?.label.toLowerCase().startsWith(k));
      const j = i >= 0 ? i : all.findIndex((o) => o?.label.toLowerCase().startsWith(k));
      if (j >= 0) setActive(j);
    }
  }

  return (
    <div ref={root} className="sg-select" data-open={open} style={accent ? ({ "--sg-accent": accent } as React.CSSProperties) : undefined}>
      <span id={`${id}-label`} className="sg-label">{label}{optional && <span className="sg-optional"> · facultatif</span>}</span>
      <button type="button" role="combobox" className="sg-select-button" aria-haspopup="listbox" aria-expanded={open} aria-labelledby={`${id}-label ${id}-value`}
        aria-controls={`${id}-list`} aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKey}>
        {selected?.icon && <span className="sg-select-icon" style={selected.color ? { color: selected.color } : undefined}>{selected.icon}</span>}
        <span id={`${id}-value`} className={`sg-select-value ${selected ? "" : "is-placeholder"}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={18} className="sg-select-chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul ref={list} id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className="sg-select-list">
          {all.map((o, i) => {
            const isSel = (o?.value ?? null) === value;
            return (
              <li key={o?.value ?? "aucune"} id={`${id}-opt-${i}`} data-index={i} role="option" aria-selected={isSel}
                data-active={i === active} onPointerEnter={() => setActive(i)} onClick={() => pick(i)} className="sg-select-option">
                {o?.icon ? <span className="sg-select-icon" style={o.color ? { color: o.color } : undefined}>{o.icon}</span> : <span className="sg-select-dot" aria-hidden="true" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{o?.label ?? "Aucune précision"}</span>
                  {o?.hint && <span className="block truncate text-xs text-muted">{o.hint}</span>}
                </span>
                {isSel && <Check size={16} className="shrink-0 text-[var(--sg-accent)]" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
