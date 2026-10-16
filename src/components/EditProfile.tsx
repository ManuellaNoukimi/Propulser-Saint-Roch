"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ACTOR_TYPES, SECTORS, isEstablishment, type ActorTypeId, type SectorId } from "@/lib/constants";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import type { SessionUser } from "@/lib/types";
import { AuthPrompt } from "./AuthPrompt";
import { Avatar } from "./Avatar";

export function EditProfile() {
  const { user, loading } = useSession();
  if (loading) return <div className="p-10 text-center text-muted">Chargement…</div>;
  if (!user) return <AuthPrompt title="Ton profil" text="Connecte-toi pour modifier ton profil." next="/moi/modifier" />;
  return <EditProfileForm key={user.id} user={user} />;
}

function EditProfileForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const { refresh, logout } = useSession();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [accountType, setAccountType] = useState<ActorTypeId>(user.accountType);
  const [sector, setSector] = useState<SectorId | "">(user.sector ?? "");
  const [address, setAddress] = useState(user.address ?? "");
  const [description, setDescription] = useState(user.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const establishment = isEstablishment(accountType);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, accountType, sector: establishment ? sector || null : null, address: establishment ? address : "", description }),
    }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setSending(false);
    if (!res?.ok) return setError(d?.error ?? "Enregistrement impossible.");
    await refresh();
    toast("Profil mis à jour");
    router.push(isEstablishment(accountType) ? `/u/${user.id}` : "/moi");
  }

  const row = "grid gap-1.5 md:grid-cols-[160px_1fr] md:items-center md:gap-8";

  return (
    <form onSubmit={submit} className="mx-auto max-w-[680px] space-y-6 bg-bg p-5 md:my-9 md:rounded-2xl md:border md:border-line md:p-8">
      <div><h1 className="text-2xl font-bold tracking-tight">Ton profil, à ton image<span className="text-ig-blue">.</span></h1><p className="mt-1 text-sm text-muted">Quelques mots pour faire connaissance.</p></div>
      <div className="flex items-center gap-4 rounded-2xl bg-soft p-4">
        <Avatar user={{ id: user.id, displayName, accountType }} size={56} />
        <div>
          <p className="font-semibold">{displayName || "…"}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </div>

      <label className={row}>
        <span className="font-semibold">Nom</span>
        <input required maxLength={60} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="ig-input" />
      </label>
      <label className={row}>
        <span className="font-semibold">Type de compte</span>
        <select value={accountType} onChange={(e) => setAccountType(e.target.value as ActorTypeId)} className="ig-input">
          {ACTOR_TYPES.map((a) => <option key={a.id} value={a.id}>{a.emoji} {a.label}</option>)}
        </select>
      </label>
      {establishment && (
        <>
          <label className={row}>
            <span className="font-semibold">Secteur</span>
            <select value={sector} onChange={(e) => setSector(e.target.value as SectorId)} className="ig-input">
              <option value="">Aucun (facultatif)</option>
              {SECTORS.filter((s) => (s.for as readonly string[]).includes(accountType)).map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
            </select>
          </label>
          <label className={row}>
            <span className="font-semibold">Adresse</span>
            <input maxLength={120} value={address} onChange={(e) => setAddress(e.target.value)} className="ig-input" />
          </label>
        </>
      )}
      <label className={row}>
        <span className="font-semibold">Bio</span>
        <textarea maxLength={300} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="ig-input resize-none" />
      </label>
      {error && <p role="alert" className="rounded-xl bg-ig-red/10 p-3 text-sm text-ig-red">{error}</p>}
      <div className="flex items-center justify-between">
        <button type="button" onClick={async () => { await logout(); toast("Tu es déconnecté·e"); router.push("/"); }} className="font-semibold text-ig-red">
          Se déconnecter
        </button>
        <button type="submit" disabled={sending} className="ig-btn">{sending ? "Enregistrement…" : "Enregistrer"}</button>
      </div>
    </form>
  );
}
