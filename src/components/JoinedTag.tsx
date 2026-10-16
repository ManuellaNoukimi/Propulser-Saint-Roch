"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "@/lib/toast";

// Comment on participe, en un mot (« Inscrit·e · bénévole, matériel »)
const SHORT: Record<string, string> = { benevole: "bénévole", materiel: "matériel", lieu: "lieu", commandite: "commandite", expertise: "expertise" };

/**
 * Remplace « Je me propose » / « J'y vais » une fois inscrit·e : étiquette « Inscrit·e » (+ comment on participe)
 * et « Se désinscrire » (en deux temps pour éviter un clic par erreur). DELETE /api/ideas/:id/complices.
 */
export function JoinedTag({ ideaId, contributions, onLeft, size = "md" }: {
  ideaId: string; contributions: string[]; onLeft: (removed: number) => void; size?: "sm" | "md";
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const how = contributions.filter((c) => c !== "participer").map((c) => SHORT[c] ?? c);
  const sm = size === "sm";

  async function leave() {
    setBusy(true);
    const r = await fetch(`/api/ideas/${ideaId}/complices`, { method: "DELETE" }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    setConfirm(false);
    if (!r?.ok) return toast(d?.error ?? "Désinscription impossible. Réessaie.");
    toast("Tu t'es désinscrit·e");
    onLeft(d?.removed ?? contributions.length);
  }

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-ig-green/40 bg-ig-green/15 font-semibold text-[#3f6d1f] dark:text-[#b5e08f] ${sm ? "min-h-9 px-2.5 text-xs" : "min-h-11 px-3 text-sm"}`}>
        <Check size={sm ? 14 : 16} className="shrink-0" />
        <span className="truncate">Inscrit·e{how.length ? ` · ${how.join(", ")}` : ""}</span>
      </span>
      {confirm ? (
        <button type="button" disabled={busy} onClick={() => void leave()}
          className={`shrink-0 rounded-lg border border-ig-red/40 bg-ig-red/10 font-semibold text-ig-red ${sm ? "min-h-9 px-2.5 text-xs" : "min-h-11 px-3 text-sm"}`}>
          {busy ? "…" : "Confirmer"}
        </button>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} aria-label="Se désinscrire" title="Se désinscrire"
          className={`inline-flex shrink-0 items-center gap-1 rounded-lg border border-line font-medium text-muted transition hover:bg-soft hover:text-fg ${sm ? "min-h-9 px-2.5 text-xs" : "min-h-11 px-3 text-sm"}`}>
          <X size={sm ? 13 : 15} /> <span className="max-[400px]:sr-only">Se désinscrire</span>
        </button>
      )}
    </span>
  );
}
