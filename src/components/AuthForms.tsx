"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, LoaderCircle } from "lucide-react";
import { ACCOUNT_GROUPS, SECTORS, isEstablishment, isGuest, type ActorTypeId, type SectorId } from "@/lib/constants";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";

/** Où aller après connexion : ?next=… (lu au moment de l'envoi, pour éviter useSearchParams). */
function nextUrl(fallback: string) {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="w-full rounded-3xl border border-line bg-bg px-6 py-7 shadow-[0_4px_24px_#00000003] sm:px-8">{children}</div>;
}

export function LoginForm() {
  const router = useRouter();
  const { refresh } = useSession();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<"compte" | "invite" | null>(null);

  async function enter(body: { email?: string; password?: string; guest?: boolean; name?: string }, key: "compte" | "invite") {
    setSending(key);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setSending(null);
    if (!res?.ok) return setError(d?.error ?? (res ? `Erreur du serveur (${res.status}). Réessaie dans un instant.` : "Pas de connexion au serveur."));
    await refresh();
    toast(d.created ? `Bienvenue, ${d.user.displayName} 👋` : `Bon retour, ${d.user.displayName} 👋`);
    router.push(nextUrl("/"));
  }

  return (
    <div className="mx-auto flex max-w-[420px] flex-col items-center gap-4 px-4 py-6 sm:py-12">
      <Card>
        <h1 className="text-center font-logo text-[42px] leading-tight">Complices<span className="text-ig-blue">.</span></h1>
        <p className="mb-7 mt-2 text-center text-sm text-muted">Ton quartier a hâte de te retrouver.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (login.trim()) enter({ email: login.trim(), password }, "compte"); }} className="space-y-3">
          <input type="text" aria-label="Courriel" required autoComplete="username" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Courriel" className="ig-input" />
          <input type="password" aria-label="Mot de passe" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" className="ig-input" />
          <button type="submit" disabled={!!sending || !login.trim()} className="ig-btn w-full text-sm">
            {sending === "compte" && <LoaderCircle size={16} className="animate-spin" />}Se connecter
          </button>
          {error && <p role="alert" className="rounded-xl bg-ig-red/10 p-3 text-center text-sm text-ig-red">{error}</p>}
        </form>
        <div className="my-5 flex items-center gap-4 text-xs font-semibold text-muted">
          <span className="h-px flex-1 bg-line" /> OU <span className="h-px flex-1 bg-line" />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); enter({ guest: true, name: guestName.trim() }, "invite"); }} className="space-y-2">
          <p className="text-sm font-semibold">👋 Juste visiter ?</p>
          <p className="text-xs text-muted">En invité·e, tu vois les publications et tu rejoins les activités, mais tu ne publies pas.</p>
          <div className="flex gap-2">
            <input aria-label="Ton nom (invité·e)" maxLength={60} value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Ton nom" className="ig-input min-w-0 flex-1" />
            <button type="submit" disabled={!!sending} className="ig-btn-secondary shrink-0 text-sm">
              {sending === "invite" && <LoaderCircle size={16} className="animate-spin" />}Entrer
            </button>
          </div>
        </form>
      </Card>
      <Card>
        <p className="text-center text-sm">
          Pas encore de compte ? <Link href="/inscription" className="font-semibold text-ig-blue">Inscris-toi</Link>
        </p>
      </Card>
    </div>
  );
}

export function SignupForm() {
  const router = useRouter();
  const { refresh } = useSession();
  const [accountType, setAccountType] = useState<ActorTypeId | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sector, setSector] = useState<SectorId | "">("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const establishment = accountType ? isEstablishment(accountType) : false;
  const guest = accountType ? isGuest(accountType) : false;
  const choice = ACCOUNT_GROUPS.find((g) => (guest ? g.id === "invite" : establishment ? g.id === "etablissement" : g.id === "personnel"));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountType) return;
    setSending(true);
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName, accountType,
        email: guest ? "" : email,
        password: guest ? "" : password,
        sector: establishment ? sector || null : null,
        address: establishment ? address : "",
        description: establishment ? description : "",
      }),
    }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setSending(false);
    if (!res?.ok) return setError(d?.error ?? (res ? `Erreur du serveur (${res.status}). Réessaie dans un instant.` : "Pas de connexion au serveur."));
    await refresh();
    toast(`Bienvenue chez les complices, ${d.user.displayName} 🎉`);
    router.push(nextUrl(establishment ? `/u/${d.user.id}` : "/"));
  }

  return (
    <div className="mx-auto flex max-w-[460px] flex-col items-center gap-4 px-4 py-6 sm:py-10">
      <Card>
        <h1 className="text-center font-logo text-[42px] leading-tight">Complices<span className="text-ig-blue">.</span></h1>
        <p className="mb-6 mt-2 text-center text-sm text-muted">Une petite idée. De belles rencontres.</p>
        <ol aria-label="Étapes de l’inscription" className="mb-7 flex items-start justify-between gap-2">
          {["Tu es…", "Tes infos"].map((label, index) => {
            const step = accountType ? 1 : 0;
            return <li key={label} aria-current={step === index ? "step" : undefined} className="flex flex-1 flex-col items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold transition ${index <= step ? "bg-ig-blue text-white" : "bg-sep text-muted"}`}>{index < step ? <Check size={14} /> : index + 1}</span><span className={`text-[10px] ${index === step ? "font-semibold text-fg" : "text-muted"}`}>{label}</span></li>;
          })}
        </ol>

        {/* Étape 1 : Résident·e, Entreprise ou Invité·e */}
        {!accountType && (
          <div className="animate-fade-in space-y-3">
            <p className="font-semibold">Tu es…</p>
            {ACCOUNT_GROUPS.map((g) => (
              <button key={g.id} type="button" onClick={() => setAccountType(g.id === "personnel" ? "habitant" : g.id === "etablissement" ? "entreprise" : "invite")}
                className="flex w-full items-center gap-4 rounded-2xl border border-line p-4 text-left transition hover:-translate-y-0.5 hover:border-ig-blue/40 hover:bg-soft active:scale-[0.99]">
                <span className="text-3xl">{g.emoji}</span>
                <span>
                  <span className="block font-semibold">{g.label}</span>
                  <span className="block text-xs leading-relaxed text-muted">{g.description}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Étape 2 : informations */}
        {accountType && (
          <form onSubmit={submit} className="animate-fade-in space-y-3">
            <button type="button" onClick={() => { setAccountType(null); setError(null); }} className="mb-2 flex items-center gap-1 text-sm text-muted hover:text-fg">
              <ArrowLeft size={16} /> {choice?.emoji} {choice?.label}
            </button>
            <input aria-label={establishment ? "Nom de l’entreprise" : "Ton nom"} autoComplete={establishment ? "organization" : "name"} required maxLength={60} value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder={establishment ? "Nom de l'entreprise" : "Ton prénom ou ton nom"} className="ig-input" />
            {!guest && (
              <>
                <input type="text" aria-label="Courriel" required autoComplete="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Courriel" className="ig-input" />
                <input type="password" aria-label="Mot de passe" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe" className="ig-input" />
              </>
            )}
            {establishment && (
              <>
                <select aria-label="Secteur d’activité, facultatif" value={sector} onChange={(e) => setSector(e.target.value as SectorId)} className="ig-input">
                  <option value="">Secteur d&apos;activité (facultatif)</option>
                  {SECTORS.map((s) => (
                    <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>
                  ))}
                </select>
                <input aria-label="Adresse de l’entreprise, facultatif" maxLength={120} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse (facultatif)" className="ig-input" />
                <textarea aria-label="Présentation, facultatif" maxLength={300} rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Présente ton entreprise en une phrase (facultatif)" className="ig-input resize-none" />
              </>
            )}
            <button type="submit" disabled={sending} className="ig-btn mt-2 w-full text-sm">{sending && <LoaderCircle size={16} className="animate-spin" />}{sending ? "Inscription…" : guest ? "Entrer en invité·e" : "Rejoindre les complices"}</button>
            {error && <p role="alert" className="rounded-xl bg-ig-red/10 p-3 text-center text-sm text-ig-red">{error}</p>}
            <p className="pt-2 text-center text-[10px] text-muted">{guest ? "Juste ton nom : tu vois les publications et tu rejoins les activités, sans publier." : "Aucune règle de format : n'importe quel courriel et n'importe quel mot de passe sont acceptés."}</p>
          </form>
        )}
      </Card>
      <Card>
        <p className="text-center text-sm">
          Tu as un compte ? <Link href="/connexion" className="font-semibold text-ig-blue">Connecte-toi</Link>
        </p>
      </Card>
    </div>
  );
}
