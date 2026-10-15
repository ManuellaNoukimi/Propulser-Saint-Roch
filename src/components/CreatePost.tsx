"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { CATEGORIES, NEEDS, PLACES, actorTypeOf, type CategoryId, type NeedId } from "@/lib/constants";
import { localInputToIso } from "@/lib/format";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { AuthPrompt } from "./AuthPrompt";
import { Avatar } from "./Avatar";
import { ImagePicker } from "./ImagePicker";

// « Nouvelle publication » : photos, légende, lieu, date, catégorie, besoins → Partager.
export function CreatePost() {
  const router = useRouter();
  const { user, loading, refresh } = useSession();
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CategoryId>("communautaire");
  const [place, setPlace] = useState<string>(PLACES[0]);
  const [customPlace, setCustomPlace] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [needs, setNeeds] = useState<NeedId[]>(["participants"]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <div className="p-10 text-center text-muted">Chargement…</div>;
  if (!user)
    return <AuthPrompt title="Publie ton idée pour Saint-Roch" text="Habitant·e, travailleur·euse, commerce, organisme : tout le monde peut publier. Il suffit d'un compte." next="/creer" />;

  const toggleNeed = (n: NeedId) => setNeeds((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));

  async function share(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, category, place: place === "autre" ? customPlace : place, startsAt: localInputToIso(startsAt), needs, images }),
    }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setSending(false);
    if (!res?.ok) return setError(d?.error ?? "Publication impossible. Vérifie ta connexion.");
    toast("🎉 Ta publication a été partagée !");
    refresh();
    router.push(`/p/${d.id}`);
  }

  return (
    <form onSubmit={share} className="mx-auto max-w-[700px] md:px-6 md:py-9">
      <div className="glass-header sticky top-[68px] z-20 flex items-center justify-between gap-2 border-b border-line px-4 py-4 md:static md:rounded-t-2xl md:border md:border-line">
        <button type="button" onClick={() => router.back()} className="text-sm">Annuler</button>
        <h1 className="text-base font-semibold">Nouvelle publication</h1>
        <button type="submit" disabled={sending} className="font-semibold text-ig-blue disabled:opacity-40">
          {sending ? "Partage…" : "Partager"}
        </button>
      </div>

      <div className="space-y-5 bg-bg p-5 md:rounded-b-2xl md:border md:border-t-0 md:border-line md:p-6">
        <ImagePicker images={images} onChange={setImages} />

        <div className="flex items-center gap-3">
          <Avatar user={user} size={28} />
          <span className="font-semibold">{user.displayName}</span>
          <span className="text-xs text-muted">{actorTypeOf(user.accountType)?.label}</span>
        </div>

        <label className="block"><span className="mb-2 block text-xs font-semibold">Ton idée en quelques mots</span><input required maxLength={90} value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. : Un dîner entre voisins" className="ig-input text-lg font-semibold" /></label>
        <textarea aria-label="Description de l’idée, facultatif" maxLength={1500} rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Écris une légende… Qu'est-ce que tu veux faire, pour qui, et pourquoi c'est bien pour le quartier ?"
          className="ig-input resize-none" />
        <p className="text-right text-xs text-muted">{description.length}/1 500</p>

        <div className="divide-y divide-sep border-y border-sep">
          <label className="flex items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-2"><MapPin size={18} /> Lieu</span>
            <select value={place} onChange={(e) => setPlace(e.target.value)} className="max-w-[60%] bg-transparent text-right outline-none">
              {PLACES.map((p) => <option key={p} value={p}>{p}</option>)}
              <option value="autre">Autre lieu…</option>
            </select>
          </label>
          {place === "autre" && (
            <input aria-label="Adresse ou nom du lieu" maxLength={120} value={customPlace} onChange={(e) => setCustomPlace(e.target.value)}
              placeholder="Adresse ou nom du lieu" className="ig-input my-3" />
          )}
          <label className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span>📅 Date de l&apos;événement</span>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="bg-transparent text-right outline-none" />
          </label>
        </div>

        <div>
          <p className="mb-2 font-semibold">Catégorie</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${category === c.id ? "bg-fg text-bg" : "bg-sep"}`}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 font-semibold">De quoi as-tu besoin ?</p>
          <div className="grid grid-cols-2 gap-2">
            {NEEDS.map((n) => {
              const on = needs.includes(n.id);
              return (
                <button key={n.id} type="button" aria-pressed={on} onClick={() => toggleNeed(n.id)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition active:scale-[0.98] ${on ? "border-ig-blue bg-ig-blue/10 font-semibold" : "border-line"}`}>
                  {n.emoji} {n.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p role="alert" className="rounded-xl bg-ig-red/10 p-3 text-sm text-ig-red">{error}</p>}
        <button type="submit" disabled={sending} className="ig-btn w-full py-2.5 md:hidden">{sending ? "Partage…" : "Partager"}</button>
      </div>
    </form>
  );
}
