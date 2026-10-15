"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BUSINESS_POST_TYPES, isEstablishment, type BusinessPostTypeId } from "@/lib/constants";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { AuthPrompt } from "./AuthPrompt";
import { Avatar } from "./Avatar";
import { ImagePicker } from "./ImagePicker";

// Publier dans l'onglet « Entreprises » (comptes Entreprise seulement). Une activité se publie dans « Vie Saint-Roch ».
export function BusinessPostForm() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [postType, setPostType] = useState<BusinessPostTypeId>("promo");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <div className="p-10 text-center text-muted">Chargement…</div>;
  if (!user) return <AuthPrompt title="Publier pour ton commerce" text="Crée un compte Entreprise pour annoncer tes promos, nouveautés et offres d'emploi au quartier." next="/entreprises/publier" />;
  if (!isEstablishment(user.accountType))
    return (
      <div className="mx-auto my-12 max-w-sm px-6 text-center">
        <p className="text-4xl">🏪</p>
        <h1 className="mt-4 text-lg font-semibold">Réservé aux comptes Entreprise</h1>
        <p className="mt-2 text-sm text-muted">L&apos;onglet Entreprises sert aux commerces, restos, entreprises et organismes. Pour proposer une activité, utilise « Vie Saint-Roch ».</p>
        <Link href="/creer" className="ig-btn mt-6 inline-flex">Proposer une activité</Link>
      </div>
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await fetch("/api/entreprises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postType, title, description, images }),
    }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setSending(false);
    if (!res?.ok) return setError(d?.error ?? "Publication impossible. Vérifie ta connexion.");
    toast("Publié dans l'onglet Entreprises 🏪");
    router.push("/entreprises");
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-[640px] space-y-5 px-4 py-6 md:py-10">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => router.back()} className="text-sm">Annuler</button>
        <h1 className="text-base font-semibold">Publier pour mon commerce</h1>
        <button type="submit" disabled={sending} className="font-semibold text-ig-blue disabled:opacity-40">{sending ? "Envoi…" : "Publier"}</button>
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-soft p-3">
        <Avatar user={user} size={36} />
        <div className="leading-tight">
          <p className="font-semibold">{user.displayName}</p>
          <p className="text-xs text-muted">Visible dans l&apos;onglet 🏪 Entreprises</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Qu&apos;est-ce que tu annonces ?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BUSINESS_POST_TYPES.map((t) => (
            <button key={t.id} type="button" aria-pressed={postType === t.id} onClick={() => setPostType(t.id)}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm transition active:scale-[0.98] ${postType === t.id ? "border-ig-blue bg-ig-blue/10 font-semibold" : "border-line"}`}>
              {t.emoji} {t.label}
              <span className="block text-[11px] font-normal text-muted">{t.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <input required maxLength={90} value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre (ex. : 2 pour 1 sur les cafés ce midi)" className="ig-input text-base font-semibold" />
      <textarea maxLength={1500} rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder="Les détails : quand, pour qui, comment en profiter…" className="ig-input resize-none" />
      <ImagePicker images={images} onChange={setImages} />

      {error && <p className="rounded-lg bg-ig-red/10 p-3 text-sm text-ig-red">{error}</p>}
      <button type="submit" disabled={sending} className="ig-btn w-full py-2.5">{sending ? "Envoi…" : "Publier"}</button>
    </form>
  );
}
