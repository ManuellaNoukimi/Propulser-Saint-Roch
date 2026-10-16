"use client";
import { notifyResidentProgress } from "@/lib/resident-feedback";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { CONTRIBUTIONS, type ContributionId, type NeedId } from "@/lib/constants";
import { toast } from "@/lib/toast";

// Panneau qui monte du bas (mobile) / fenêtre centrée (ordinateur) : « Comment veux-tu aider ? »
export function JoinSheet({
  ideaId,
  title,
  needs,
  open,
  onClose,
  onJoined,
}: {
  ideaId: string;
  title: string;
  needs: NeedId[];
  open: boolean;
  onClose: () => void;
  onJoined?: () => void;
}) {
  const [contribution, setContribution] = useState<ContributionId>("participer");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (!open) return null;

  const ordered = [...CONTRIBUTIONS].sort((a, b) => Number(needs.includes(b.need as NeedId)) - Number(needs.includes(a.need as NeedId)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await fetch(`/api/ideas/${ideaId}/complices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contribution, message }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSending(false);
    if (!res?.ok) {
      setError(data?.error ?? "Impossible d'envoyer. Vérifie ta connexion.");
      return;
    }
    setMessage("");
    toast("🎉 Tu es maintenant complice !");
    notifyResidentProgress();
    onJoined?.();
    onClose();
  }

  return (
    <dialog ref={dialog} aria-labelledby={headingId} aria-describedby={descriptionId} className="join-dialog" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line md:hidden" aria-hidden />
        <div className="flex items-center justify-between border-b border-sep px-5 py-4">
          <span className="w-6" />
          <h2 id={headingId} className="text-base font-bold">Un coup de main change tout.</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-soft">
            <X size={24} />
          </button>
        </div>
        <div className="space-y-5 p-5">
          <p id={descriptionId} className="text-sm text-muted">
            Pour « <span className="font-semibold text-fg">{title}</span> ». Comment veux-tu aider ?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ordered.map((c) => {
              const wanted = needs.includes(c.need as NeedId);
              const on = contribution === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setContribution(c.id)}
                  aria-pressed={on}
                  className={`min-h-[68px] rounded-xl border px-3 py-3 text-left text-xs transition active:scale-[0.98] ${
                    on ? "border-ig-blue bg-ig-blue/10 font-semibold ring-1 ring-ig-blue" : "border-line hover:bg-soft"
                  }`}
                >
                  {c.emoji} {c.label}
                  {wanted && <span className="block text-[11px] font-semibold text-ig-blue">Recherché</span>}
                </button>
              );
            })}
          </div>
          <textarea
            rows={2}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Un petit mot (facultatif)… ex. : J'ai 3 jeux de boules."
            aria-label="Un petit mot pour l’organisateur, facultatif"
            className="ig-input resize-none"
          />
          {error && <p role="alert" className="rounded-xl bg-ig-red/10 p-3 text-sm text-ig-red">{error}</p>}
          <button type="submit" disabled={sending} className="ig-btn w-full py-2.5">
            {sending ? "Envoi…" : "Je suis complice"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
