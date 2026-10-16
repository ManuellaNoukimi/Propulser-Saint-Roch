"use client";

import { useEffect, useState } from "react";
import { Link2, Link2Off, Loader2, RefreshCw } from "lucide-react";
import type { LinkedPages as LinkedPagesState } from "@/lib/db";
import { toast } from "@/lib/toast";

type Source = "facebook" | "instagram" | "linkedin";
// Pastille aux couleurs du réseau (comme dans « Tu publies déjà ailleurs ? »), sans emoji.
const SOURCES: { id: Source; label: string; mark: string; color: string; action: string }[] = [
  { id: "facebook", label: "Page Facebook", mark: "f", color: "#1877f2", action: "Lier ma page" },
  { id: "instagram", label: "Compte Instagram", mark: "◎", color: "#d62976", action: "Lier mon compte" },
  { id: "linkedin", label: "Page LinkedIn", mark: "in", color: "#0a66c2", action: "Lier ma page" },
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
        {sources.map(({ id, label, mark, color, action }) => {
          const linked = pages[id];
          const working = busy === id;
          return (
            // Téléphone : le nom en haut, les boutons en dessous sur toute la largeur ; ordinateur : sur une ligne (16 oct., Danny)
            <li key={id} className="flex flex-col gap-3 rounded-lg border border-line bg-soft p-3.5 sm:flex-row sm:items-center">
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: color }}>{mark}</span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-snug">{label}</span>
                  <span className={`block text-sm ${linked ? "font-medium text-[#3d7a1f]" : "text-muted"}`}>{linked ? "Liée : tes publications arrivent ici" : "Pas encore liée"}</span>
                </span>
              </span>
              {linked ? (
                <span className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                  <button type="button" disabled={working} onClick={() => call(id, "POST")}
                    className="ig-btn-secondary min-h-11 text-sm disabled:opacity-60" aria-label={`Synchroniser ${label}`}>
                    {working ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Synchroniser
                  </button>
                  <button type="button" disabled={working} onClick={() => call(id, "DELETE")}
                    className="ig-btn-secondary min-h-11 text-sm disabled:opacity-60" aria-label={`Délier ${label}`}>
                    <Link2Off size={16} /> Délier
                  </button>
                </span>
              ) : (
                <button type="button" disabled={working} onClick={() => call(id, "POST")}
                  className="ig-btn min-h-11 w-full text-sm disabled:opacity-60 sm:w-auto sm:shrink-0">
                  {working ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />} {action}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
