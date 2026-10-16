"use client";
import { notifyResidentProgress } from "@/lib/resident-feedback";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowRight, CalendarDays, Check, ExternalLink, Landmark, LoaderCircle, MapPin, Mic, PackageOpen, PartyPopper, RotateCcw, Sparkles, Users } from "lucide-react";
import { contributionOf, isGuest, needOf, PLACES } from "@/lib/constants";
import { localInputToIso } from "@/lib/format";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import type { MatchResult } from "@/lib/types";
import { Avatar } from "./Avatar";

const EXAMPLES = [
  "Une vente-trottoir avec les friperies de la rue Saint-Joseph",
  "Un tournoi de pétanque le midi sur le parvis pour les travailleurs",
  "Une murale avec les jeunes à l'îlot Fleurie",
  "Un pique-nique pour accueillir les nouveaux voisins",
];

const STEPS = ["Je comprends ton idée…", "Je cherche qui peut t'aider…", "Je trouve un lieu et une date libre…", "Je fais le lien avec le Plan de la Ville…"];

// Dictée vocale (si le navigateur la propose)
type Recognition = { lang: string; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; start: () => void };
const speechCtor = () => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const noop = () => () => {};

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Problème 1 : « Lancer une idée » → trouver ses complices en quelques secondes, les inviter, publier. */
export function LaunchIdea() {
  const router = useRouter();
  const { user } = useSession();
  const canDictate = useSyncExternalStore(noop, () => !!speechCtor(), () => false);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [phase, setPhase] = useState<"idea" | "thinking" | "results" | "done">("idea");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Choix modifiables
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [place, setPlace] = useState("");
  const [when, setWhen] = useState("");
  const [sending, setSending] = useState(false);
  const [published, setPublished] = useState<{ id: string; invited: number } | null>(null);

  // Résident·e ou entreprise : publie. Invité·e ou visiteur : voit les suggestions mais doit s'inscrire pour publier.
  const canPublish = !!user && !isGuest(user.accountType);

  // Analyse animée : chaque étape se coche l'une après l'autre
  useEffect(() => {
    if (phase !== "thinking") return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length)), 420);
    return () => clearInterval(t);
  }, [phase]);

  function dictate() {
    const Ctor = speechCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "fr-CA";
    rec.interimResults = false;
    rec.onresult = (e) => setText((prev) => `${prev ? `${prev} ` : ""}${e.results[0][0].transcript}`);
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  async function find(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim()) return;
    setError(null);
    setStep(0);
    setPhase("thinking");
    const [res] = await Promise.all([
      fetch("/api/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }).catch(() => null),
      new Promise((r) => setTimeout(r, STEPS.length * 420 + 250)), // le temps de voir l'analyse
    ]);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setPhase("idea");
      return setError(d?.error ?? "Recherche impossible. Vérifie ta connexion.");
    }
    const r: MatchResult = d.result;
    setResult(r);
    setTitle(r.title);
    setPicked(r.helpers.map((h) => h.user.id));
    setPlace(r.place.name);
    setWhen(toLocalInput(r.when.iso));
    setPhase("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function publish() {
    if (!result) return;
    if (!canPublish) return router.push("/inscription?next=/lancer");
    setSending(true);
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: text, category: result.category, place, startsAt: localInputToIso(when), needs: result.needs, images: [] }),
    }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setSending(false);
      return toast(d?.error ?? "Publication impossible.");
    }
    const invites = result.helpers
      .filter((h) => picked.includes(h.user.id))
      .map((h) => ({ userId: h.user.id, contribution: h.contribution, reason: h.why.join(" · ").slice(0, 200) }));
    let invited = 0;
    if (invites.length) {
      const inv = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId: d.id, invites }),
      }).catch(() => null);
      invited = inv?.ok ? (await inv.json()).sent : 0;
    }
    setSending(false);
    setPublished({ id: d.id, invited });
    setPhase("done");
    notifyResidentProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigator.vibrate?.(30);
  }

  function restart() {
    setPhase("idea");
    setResult(null);
    setText("");
    setPublished(null);
  }

  return (
    <div className="mx-auto max-w-[860px] px-4 py-5 md:px-7 md:py-8">
      <header className="gallery-intro rounded-3xl border border-line px-6 py-7 md:px-8">
        <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-muted"><Sparkles size={12} /> Lancer une idée</p>
        <h1 className="text-[28px] font-bold leading-[1.12] tracking-tight md:text-[34px]">Ton idée. <span className="text-ig-blue">Ton équipe en 5 secondes.</span></h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">Écris ou dicte ton idée en une phrase : Complices te propose qui peut t&apos;aider, où, avec quoi, quand, et le lien avec le Plan de la Ville.</p>
      </header>

      {phase === "idea" && (
        <form onSubmit={find} className="surface-card mt-6 animate-fade-in p-5 md:p-6">
          <label htmlFor="idee" className="text-sm font-semibold"> Ton idée pour Saint-Roch</label>
          <div className="relative mt-2">
            <textarea id="idee" rows={4} maxLength={500} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Ex. : Je veux organiser une vente-trottoir avec les friperies de la rue Saint-Joseph."
              className="ig-input min-h-[120px] resize-none pr-14 text-base leading-relaxed" />
            {canDictate && (
              <button type="button" onClick={dictate} aria-label="Dicter mon idée" aria-pressed={listening}
                className={`absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full transition ${listening ? "animate-pulse bg-ig-red text-white" : "bg-soft text-muted hover:text-fg"}`}>
                <Mic size={18} />
              </button>
            )}
          </div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[.14em] text-muted">Pas d&apos;inspiration ? Essaie :</p>
          <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setText(ex)} className="shrink-0 rounded-full border border-line bg-bg px-3.5 py-2 text-xs transition hover:border-ig-blue hover:text-ig-blue active:scale-95">{ex}</button>
            ))}
          </div>
          {error && <p role="alert" className="mt-4 rounded-xl bg-ig-red/10 p-3 text-sm text-ig-red">{error}</p>}
          <button type="submit" disabled={!text.trim()} className="ig-btn mt-5 min-h-12 w-full text-[15px]"><Sparkles size={18} /> Trouver mes complices</button>
          <p className="mt-3 text-center text-xs text-muted">Tu préfères tout remplir toi-même ? <Link href="/creer" className="font-semibold text-ig-blue">Publier directement</Link></p>
        </form>
      )}

      {phase === "thinking" && (
        <div className="surface-card mt-6 animate-fade-in p-6 md:p-8" role="status" aria-live="polite">
          <p className="text-sm text-muted">« {text} »</p>
          <ul className="mt-5 space-y-3.5">
            {STEPS.map((s, k) => (
              <li key={s} className={`flex items-center gap-3 text-[15px] transition-opacity duration-300 ${k <= step ? "opacity-100" : "opacity-30"}`}>
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors ${k < step ? "bg-ig-blue text-white" : "bg-soft"}`}>
                  {k < step ? <Check size={15} /> : k === step ? <LoaderCircle size={15} className="animate-spin text-ig-blue" /> : null}
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {phase === "results" && result && (
        <div className="mt-6 animate-fade-in space-y-4 pb-28">
          <section className="surface-card p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-ig-blue/10 px-2.5 py-1 text-[11px] font-semibold text-ig-blue"> {result.activity.label}</span>
              <button type="button" onClick={() => setPhase("idea")} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg"><RotateCcw size={13} /> Modifier mon idée</button>
            </div>
            <label className="mt-3 block">
              <span className="sr-only">Titre de ton idée</span>
              <input value={title} maxLength={90} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl bg-transparent text-[24px] font-bold leading-tight tracking-tight outline-none focus:bg-soft md:text-[28px]" />
            </label>
            <p className="mt-1 text-sm text-muted">« {text} »</p>
          </section>

          <section className="surface-card p-5 md:p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Users size={20} className="text-ig-blue" /> Qui peut t&apos;aider</h2>
            {result.helpers.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Personne de parfaitement adapté pour l&apos;instant : publie ton idée, les gens du quartier pourront se proposer.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {result.helpers.map((h) => {
                  const on = picked.includes(h.user.id);
                  const c = contributionOf(h.contribution);
                  return (
                    <li key={h.user.id}>
                      <label className={`flex cursor-pointer gap-3 rounded-2xl border p-3.5 transition active:scale-[0.99] ${on ? "border-ig-blue bg-ig-blue/5" : "border-line hover:bg-soft"}`}>
                        <input type="checkbox" checked={on} onChange={() => setPicked((p) => (on ? p.filter((x) => x !== h.user.id) : [...p, h.user.id]))} className="sr-only" />
                        <Avatar user={h.user} size={42} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-semibold">{h.user.displayName}</span>
                            {c && <span className="shrink-0 rounded-full bg-soft px-2 py-0.5 text-[10px] font-semibold"> {c.label}</span>}
                          </span>
                          {h.why.map((w) => <span key={w} className="mt-0.5 block text-xs text-muted">• {w}</span>)}
                        </span>
                        <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center self-center rounded-full border-2 transition ${on ? "border-ig-blue bg-ig-blue text-white" : "border-line"}`}>{on && <Check size={14} strokeWidth={3} />}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="surface-card p-5">
              <h2 className="flex items-center gap-2 font-bold"><MapPin size={18} className="text-ig-blue" /> Où</h2>
              <select value={place} onChange={(e) => setPlace(e.target.value)} className="ig-input mt-3 font-semibold">
                {[...new Set([result.place.name, ...PLACES])].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <p className="mt-2 text-xs text-muted">{place === result.place.name ? result.place.why : "Lieu choisi par toi."}</p>
            </section>
            <section className="surface-card p-5">
              <h2 className="flex items-center gap-2 font-bold"><CalendarDays size={18} className="text-ig-blue" /> Quand</h2>
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="ig-input mt-3 font-semibold" />
              <p className="mt-2 text-xs text-muted">{result.when.why}</p>
            </section>
          </div>

          <section className="surface-card p-5 md:p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold"><PackageOpen size={20} className="text-ig-blue" /> Ce qu&apos;il te faut</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.needs.map((n) => <span key={n} className="rounded-full border border-line px-3 py-1.5 text-xs"> {needOf(n)?.label}</span>)}
            </div>
            <ul className="mt-4 divide-y divide-sep">
              {result.logistics.map((l) => (
                <li key={l.label} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-soft text-[11px]">✓</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{l.label}</span>
                    <span className="block text-xs text-muted">{l.detail}</span>
                  </span>
                  {l.link && <a href={l.link} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-ig-blue hover:bg-soft">Demander <ExternalLink size={12} /></a>}
                </li>
              ))}
            </ul>
          </section>

          {result.plan.length > 0 && (
            <section className="surface-card p-5 md:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Landmark size={20} className="text-ig-blue" /> Ton idée aide le Plan de la Ville</h2>
              <ul className="mt-3 space-y-2">
                {result.plan.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-xl bg-soft px-3 py-2.5 text-sm">
                    <span className="shrink-0 rounded-md bg-ig-blue px-2 py-0.5 text-[11px] font-bold text-white">Action {a.id}</span> {a.label}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted">Plan d&apos;action Saint-Roch 2026-2029 de la Ville de Québec (document public).</p>
            </section>
          )}

          {/* Barre d'action collée en bas */}
          <div className="glass-header fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 border-t border-line px-4 py-3 md:bottom-0 md:left-[72px] xl:left-[244px]">
            <div className="mx-auto flex max-w-[860px] flex-wrap items-center gap-2">
              {!canPublish && (
                <p className="min-w-0 flex-1 basis-48 text-xs text-muted">{user ? "En invité·e, tu ne peux pas publier." : "Pour publier, crée un compte résident ou entreprise."}</p>
              )}
              <button type="button" disabled={sending || !title.trim()} onClick={publish} className="ig-btn min-h-12 flex-[2] basis-56 text-[15px]">
                {sending ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                {!canPublish ? "Créer mon compte pour publier" : picked.length > 0 ? `Inviter ${picked.length} complice${picked.length > 1 ? "s" : ""} et publier` : "Publier mon idée"}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "done" && published && (
        <section className="surface-card mt-6 animate-fade-in p-6 text-center md:p-10">
          <span className="success-pop mx-auto grid h-16 w-16 place-items-center rounded-full bg-ig-blue text-white"><PartyPopper size={30} /></span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight">C&apos;est lancé !</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            {published.invited > 0
              ? `${published.invited} invitation${published.invited > 1 ? "s" : ""} envoyée${published.invited > 1 ? "s" : ""}. Chaque complice reçoit « Tu es invité·e à… » et répond en un toucher. Les réponses s'affichent en direct sur ta publication.`
              : "Ton idée est publiée : tout le quartier peut maintenant se proposer comme complice."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => router.push(`/p/${published.id}`)} className="ig-btn min-h-11 text-sm">Voir mon idée et les réponses <ArrowRight size={16} /></button>
            <button type="button" onClick={restart} className="ig-btn-secondary min-h-11 text-sm">Lancer une autre idée</button>
          </div>
        </section>
      )}
    </div>
  );
}
