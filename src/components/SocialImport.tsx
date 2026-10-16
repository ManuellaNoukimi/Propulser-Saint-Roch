"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

// « Importer depuis tes réseaux » (comptes Entreprise) : AFFICHAGE SEULEMENT, rien n'est branché.
// But : le commerce publie déjà ailleurs ; il connecte ses comptes une fois et ses publications arrivent ici toutes seules.
// Ce qu'il faudrait pour le brancher (accès officiels, approbations) est résumé dans le panneau de chaque réseau.

type Network = {
  id: string;
  name: string;
  mark: string; // lettre ou symbole affiché dans la pastille
  color: string;
  imports: string;
  access: string;
};

const NETWORKS: Network[] = [
  { id: "facebook", name: "Facebook", mark: "f", color: "#1877f2", imports: "Publications et événements de ta page", access: "API officielle de Meta pour les pages, avec examen de l'app par Meta" },
  { id: "instagram", name: "Instagram", mark: "◎", color: "#d62976", imports: "Photos, carrousels et vidéos de ton compte professionnel", access: "API Instagram de Meta (compte professionnel ou créateur)" },
  { id: "linkedin", name: "LinkedIn", mark: "in", color: "#0a66c2", imports: "Publications de ta page d'entreprise et offres d'emploi", access: "API de LinkedIn pour les pages d'entreprise, sur approbation de LinkedIn" },
  { id: "google", name: "Fiche Google", mark: "G", color: "#ea4335", imports: "Nouveautés, offres, heures d'ouverture et photos de ta fiche Google", access: "API Google Business Profile, sur demande d'accès à Google" },
  { id: "tiktok", name: "TikTok", mark: "♪", color: "#111111", imports: "Tes vidéos publiques", access: "API d'affichage de TikTok, avec l'accord du compte" },
  { id: "x", name: "X (Twitter)", mark: "𝕏", color: "#000000", imports: "Tes messages publics", access: "API de X, offre payante pour lire les messages" },
  { id: "site", name: "Site web ou blogue", mark: "⌂", color: "#6d4aff", imports: "Les nouvelles de ton site (flux RSS)", access: "Aucune approbation : il suffit de l'adresse du site" },
];

const STEPS = [
  { title: "Tu te connectes", text: "Sur la vraie page du réseau. Complices ne voit jamais ton mot de passe." },
  { title: "Tu choisis", text: "Tout importer, ou seulement certaines publications (promos, emplois, événements)." },
  { title: "C'est automatique", text: "Chaque nouvelle publication arrive ici toute seule, avec ses photos." },
];

export function SocialImport() {
  const [open, setOpen] = useState<Network | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const close = () => setOpen(null);

  return (
    <section className="rounded-2xl border border-line p-4">
      <p className="text-sm font-semibold">Tu publies déjà ailleurs ?</p>
      <p className="mt-0.5 text-xs text-muted">Connecte tes comptes une fois : tes publications arrivent ici toutes seules. Rien à refaire.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {NETWORKS.map((n) => (
          <button key={n.id} type="button" onClick={() => setOpen(n)}
            className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-left text-sm transition hover:bg-soft active:scale-[0.98]">
            <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white" style={{ background: n.color }}>{n.mark}</span>
            <span className="truncate">{n.name}</span>
          </button>
        ))}
      </div>

      {open && (
        <dialog ref={dialog} aria-labelledby={headingId} className="join-dialog" onCancel={close} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="w-full pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line md:hidden" aria-hidden />
            <div className="flex items-center justify-between border-b border-sep px-5 py-4">
              <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: open.color }}>{open.mark}</span>
              <h2 id={headingId} className="text-base font-bold">Importer depuis {open.name}</h2>
              <button type="button" onClick={close} aria-label="Fermer" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-soft">
                <X size={22} />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <p className="rounded-xl bg-soft p-3 text-sm"><span className="font-semibold">On importe :</span> {open.imports}.</p>
              <ol className="space-y-3">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ig-blue/10 text-xs font-bold text-ig-blue">{i + 1}</span>
                    <p className="text-sm leading-snug"><span className="font-semibold">{s.title}.</span> {s.text}</p>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-muted">Accès prévu : {open.access}.</p>
              <button type="button" disabled className="w-full rounded-xl py-2.5 text-sm font-semibold text-white opacity-60" style={{ background: open.color }}>
                Se connecter avec {open.name}
              </button>
              <p className="text-center text-xs text-muted">Bientôt disponible : concept présenté pour la démo.</p>
            </div>
          </div>
        </dialog>
      )}
    </section>
  );
}
