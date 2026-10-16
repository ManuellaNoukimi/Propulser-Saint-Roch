"use client";

import { useEffect, useState } from "react";
import { Link2, Link2Off, Loader2, RefreshCw } from "lucide-react";
import type { LinkedPages as LinkedPagesState } from "@/lib/db";
import { PUBLICATION_SOURCES } from "@/lib/quartier";
import { toast } from "@/lib/toast";

type Source = "facebook" | "instagram";
const SOURCES: { id: Source; label: string; emoji: string; action: string }[] = [
  { id: "facebook", label: "Page Facebook", emoji: "📘", action: "Lier ma page Facebook" },
  { id: "instagram", label: "Compte Instagram", emoji: "📸", action: "Lier mon compte Instagram" },
];

/**
 * F3 — « Le commerçant ne publie pas : il importe une fois, ou il répond. »
 * Visible seulement sur son propre profil d'établissement.
 */
export function LinkedPages({ onChange, only }: { onChange?: () => void; only?: Source }) {
  const [pages, setPages] = useState<LinkedPagesState | null>(null);
  const [busy, setBusy] = useState<Source | null>(null);

  useEffect(() => {
    fetch("/api/pages/link", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { pages: {} }))
      .then((d) => setPages(d.pages ?? {}))
      .catch(() => setPages({}));
  }, []);

  async function call(source: Source, method: "POST" | "DELETE") {
    setBusy(source);
    try {
      const r = await fetch("/api/pages/link", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Action impossible.");
      setPages(d.pages ?? {});
      if (method === "POST") toast(d.added ? `${d.added} publication${d.added > 1 ? "s" : ""} importée${d.added > 1 ? "s" : ""}` : "Déjà à jour, rien de nouveau");
      else toast(`Page déliée${d.removed ? ` · ${d.removed} publication${d.removed > 1 ? "s" : ""} retirée${d.removed > 1 ? "s" : ""}` : ""}`);
      onChange?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  }

  if (!pages) return null;

  // Dans le panneau d'un réseau (bloc « Tu publies déjà ailleurs ? ») : seulement la ligne de ce réseau.
  const sources = only ? SOURCES.filter((s) => s.id === only) : SOURCES;
  return (
    <section className={only ? "" : "rounded-2xl border border-line bg-bg p-4"}>
      {!only && (
        <>
          <h2 className="font-semibold">Mes pages</h2>
          <p className="mt-1 text-xs text-muted">
            Tu publies déjà ailleurs ? Lie ta page : tes publications arrivent dans Complices sans que tu les réécrives.
          </p>
        </>
      )}

      <ul className={only ? "space-y-2" : "mt-4 space-y-2"}>
        {sources.map(({ id, label, emoji, action }) => {
          const linked = pages[id];
          const working = busy === id;
          return (
            <li key={id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-soft p-3">
              <span className="text-xl" aria-hidden>{emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-[11px] text-muted">
                  {linked ? `Liée · ${PUBLICATION_SOURCES.find((s) => s.id === id)?.label}` : "Pas encore liée"}
                </span>
              </span>
              {linked ? (
                <span className="flex shrink-0 items-center gap-2">
                  <button type="button" disabled={working} onClick={() => call(id, "POST")}
                    className="ig-btn-secondary text-xs disabled:opacity-60" aria-label={`Synchroniser ${label}`}>
                    {working ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Synchroniser
                  </button>
                  <button type="button" disabled={working} onClick={() => call(id, "DELETE")}
                    className="ig-btn-secondary text-xs disabled:opacity-60" aria-label={`Délier ${label}`}>
                    <Link2Off size={14} /> Délier
                  </button>
                </span>
              ) : (
                <button type="button" disabled={working} onClick={() => call(id, "POST")}
                  className="ig-btn shrink-0 text-xs disabled:opacity-60">
                  {working ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} {action}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
