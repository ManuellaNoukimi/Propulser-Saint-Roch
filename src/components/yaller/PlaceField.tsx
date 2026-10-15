"use client";

import { useId, useRef, useState } from "react";
import { CalendarDays, Home, LoaderCircle, MapPin, SquareParking, X } from "lucide-react";
import type { Place } from "@/lib/y-aller-types";

const ICON = { evenement: CalendarDays, lieu: MapPin, adresse: Home, stationnement: SquareParking } as const;

/**
 * Champ « Je pars de… » / « Je vais à… » avec suggestions pendant la frappe
 * (événements, lieux de Saint-Roch, adresses officielles de la Ville, grands lieux de Québec).
 */
export function PlaceField({
  label,
  placeholder,
  value,
  onPick,
  dot,
  action,
}: {
  label: string;
  placeholder: string;
  value: Place | null;
  onPick: (p: Place | null) => void;
  dot: React.ReactNode;
  action?: React.ReactNode;
}) {
  const [text, setText] = useState<string | null>(null); // null = on affiche le lieu choisi
  const [results, setResults] = useState<Place[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const listId = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const shown = text ?? value?.label ?? "";

  function search(q: string) {
    if (timer.current) clearTimeout(timer.current);
    ctrl.current?.abort();
    if (q.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(() => {
      const c = new AbortController();
      ctrl.current = c;
      fetch(`/api/y-aller/lieux?q=${encodeURIComponent(q.trim())}`, { signal: c.signal })
        .then((r) => r.json())
        .then((d: { results: Place[]; unavailable: boolean }) => {
          setResults(d.results);
          setActive(0);
          setNote(d.results.length ? null : d.unavailable ? "Recherche indisponible pour l'instant." : "Aucun résultat. Essaie une adresse (ex. 450 rue Saint-Joseph Est).");
          setLoading(false);
        })
        .catch((e: Error) => {
          if (e.name !== "AbortError") setLoading(false);
        });
    }, 220);
  }

  function pick(p: Place) {
    setText(null);
    setResults(null);
    setNote(null);
    onPick(p);
  }

  const open = text !== null && (results !== null || note !== null);

  return (
    <div className="relative">
      <label className="flex items-center gap-3 rounded-2xl bg-soft px-3 transition focus-within:bg-bg focus-within:ring-2 focus-within:ring-ig-blue/30">
        <span className="grid w-5 shrink-0 place-items-center" aria-hidden>{dot}</span>
        <span className="sr-only">{label}</span>
        <input
          value={shown}
          onChange={(e) => {
            setText(e.target.value);
            if (value) onPick(null);
            search(e.target.value);
          }}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => setTimeout(() => { setResults(null); setNote(null); setText(null); }, 160)}
          onKeyDown={(e) => {
            if (!results?.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % results.length); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length); }
            if (e.key === "Enter") { e.preventDefault(); pick(results[active]); }
            if (e.key === "Escape") { setResults(null); setText(null); }
          }}
          placeholder={placeholder}
          aria-label={label}
          role="combobox"
          aria-controls={listId}
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          enterKeyHint="search"
          className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted md:text-sm"
        />
        {loading ? (
          <LoaderCircle size={17} className="shrink-0 animate-spin text-muted" />
        ) : shown ? (
          <button type="button" aria-label={`Effacer : ${label}`} onClick={() => { setText(""); setResults(null); onPick(null); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-hov">
            <X size={16} />
          </button>
        ) : null}
        {action}
      </label>

      {open && (
        <div id={listId} role="listbox" className="absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-2xl border border-line bg-bg shadow-xl animate-fade-in">
          {note && <p className="px-4 py-3 text-sm text-muted">{note}</p>}
          {results?.map((r, i) => {
            const Icon = ICON[r.kind];
            return (
              <button
                key={`${r.label}-${r.lat}-${r.lng}`}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
                className={`flex w-full items-center gap-3 border-t border-sep px-4 py-2.5 text-left first:border-t-0 ${i === active ? "bg-soft" : "hover:bg-soft"}`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${r.kind === "evenement" ? "bg-ig-red/10 text-ig-red" : r.kind === "stationnement" ? "bg-ig-blue/10 text-ig-blue" : "bg-sep text-fg"}`}>
                  <Icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{r.label}</span>
                  {r.detail && <span className="block truncate text-xs text-muted">{r.detail}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
