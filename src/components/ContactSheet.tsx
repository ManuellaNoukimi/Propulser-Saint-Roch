"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { toast } from "@/lib/toast";

/** « Contacter » un acteur : petit message laissé dans l'app (le courriel n'est jamais montré). */
export function ContactSheet({ to, open, onClose, onSent }: { to: { id: string; displayName: string }; open: boolean; onClose: () => void; onSent?: () => void }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toId: to.id, message }),
    }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setSending(false);
    if (!res?.ok) return setError(d?.error ?? "Envoi impossible. Vérifie ta connexion.");
    setMessage("");
    toast(`Message envoyé à ${to.displayName}`);
    onSent?.();
    onClose();
  }

  return (
    <dialog ref={dialog} aria-labelledby={headingId} className="join-dialog" onCancel={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line md:hidden" aria-hidden />
        <div className="flex items-center justify-between gap-3 border-b border-sep px-5 py-4">
          <h2 id={headingId} className="min-w-0 truncate text-base font-bold">Contacter {to.displayName}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-soft"><X size={22} /></button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-muted">Présente-toi et propose ton idée de collaboration. {to.displayName} verra ton message dans son tableau de bord et pourra te répondre.</p>
          <textarea required autoFocus maxLength={800} rows={5} value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Ex. : Bonjour ! On organise un marché de Noël sur le parvis, ça vous dirait d'avoir un kiosque ?" className="ig-input resize-none" />
          {error && <p role="alert" className="rounded-lg bg-ig-red/10 p-3 text-sm text-ig-red">{error}</p>}
          <button type="submit" disabled={sending || !message.trim()} className="ig-btn w-full"><Send size={16} /> {sending ? "Envoi…" : "Envoyer"}</button>
        </div>
      </form>
    </dialog>
  );
}
