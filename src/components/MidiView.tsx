"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgePercent, Briefcase, Check, Clock, MapPin, Share2, Sparkles, Store, X } from "lucide-react";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { WEEKDAYS } from "@/lib/quartier";

// Problème 3 : « Le Midi Complice » — des raisons concrètes de venir à Saint-Roch le midi.
// AFFICHAGE DE DÉMO : les propositions, commerces et chiffres ci-dessous sont des exemples fictifs.

type Item = { id: string; kind: "table" | "pause"; title: string; host: string; place: string; time: string; duration: number; days: number[]; seats: number; capacity?: number; people: string[] };
const ITEMS: Item[] = [
  { id: "t1", kind: "table", title: "Table complice au Café du Coin", host: "Café du Coin", place: "Rue Saint-Joseph Est", time: "12 h 00", duration: 30, days: [1, 2, 3, 4, 5], seats: 5, capacity: 8, people: ["Julien", "Sofia", "Amina", "Marie-Ève", "Léa"] },
  { id: "t2", kind: "table", title: "Dîner des studios tech du quartier", host: "Studio Pixel", place: "Bistro du Faubourg", time: "12 h 00", duration: 45, days: [4], seats: 7, capacity: 12, people: ["Julien", "Sofia", "Malik", "Chloé", "Tom", "Inès", "Sam"] },
  { id: "p1", kind: "pause", title: "Pétanque express sur le parvis", host: "Comité des voisins", place: "Parvis de l'église Saint-Roch", time: "12 h 15", duration: 20, days: [2, 4], seats: 6, people: ["Julien", "Marie-Ève", "Amina"] },
  { id: "p2", kind: "pause", title: "Mini-visite : 3 œuvres d'art en 20 minutes", host: "Atelier Couleurs", place: "Départ devant la bibliothèque Gabrielle-Roy", time: "12 h 10", duration: 20, days: [1, 3, 5], seats: 4, capacity: 15, people: ["Sofia", "Julien"] },
  { id: "p3", kind: "pause", title: "Marche active au jardin Jean-Paul-L'Allier", host: "Les Parents du Faubourg", place: "Jardin Jean-Paul-L'Allier", time: "12 h 30", duration: 20, days: [1, 2, 3, 4, 5], seats: 3, people: ["Amina"] },
];
const OFFERS = [
  { who: "Café du Coin", emoji: "☕", title: "Formule soupe + sandwich à 12 $", percent: 15, days: [1, 2, 3, 4, 5] },
  { who: "Bistro du Faubourg", emoji: "🍽️", title: "Plat du jour servi en 20 minutes", percent: 10, days: [1, 2, 3, 4, 5] },
  { who: "Boutique Friperie", emoji: "🛍️", title: "Rabais de 11 h 30 à 13 h 30", percent: 10, days: [1, 2, 3, 4, 5] },
  { who: "Quincaillerie du quartier", emoji: "🔧", title: "Petites réparations express le midi", percent: 10, days: [2, 4] },
];

const todayWorkday = () => {
  const d = new Date().getDay();
  return d >= 1 && d <= 5 ? d : 1;
};

export function MidiView() {
  const { user } = useSession();
  const [day, setDay] = useState(todayWorkday);
  const [workDays, setWorkDays] = useState<number[]>([]);
  const [seated, setSeated] = useState<string[]>([]);
  const [pass, setPass] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [myOffers, setMyOffers] = useState<typeof OFFERS>([]);

  const items = ITEMS.filter((i) => i.days.includes(day));
  const offers = [...myOffers, ...OFFERS].filter((o) => o.days.includes(day));
  const dayLabel = WEEKDAYS.find((d) => d.id === day)!.label;
  const isToday = day === new Date().getDay();

  function toggleSeat(i: Item) {
    const on = seated.includes(i.id);
    setSeated((s) => (on ? s.filter((x) => x !== i.id) : [...s, i.id]));
    if (!on) toast(i.kind === "table" ? `🍽️ Place réservée : ${i.title}` : `🎯 À tout à l'heure : ${i.title}`);
  }

  async function shareTeam() {
    const url = `${window.location.origin}/midi`;
    const text = "Rendez nos jours au bureau plus attirants : tables complices, pauses actives et rabais travailleurs à Saint-Roch.";
    try {
      if (navigator.share) await navigator.share({ title: "Le Midi Complice", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast("Lien copié : colle-le dans le canal de ton équipe");
      }
    } catch {
      /* partage annulé */
    }
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-6 px-4 py-5 md:px-7 md:py-8">
      <header className="midi-banner relative overflow-hidden rounded-3xl border border-line px-6 py-7 md:px-8">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-muted">Problème 3 · Moins de monde au quotidien</p>
        <h1 className="text-[28px] font-bold leading-[1.12] tracking-tight md:text-[36px]">🍽️ Le Midi Complice</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">Des raisons concrètes de venir à Saint-Roch le midi : un dîner partagé avec tes voisins de bureau, une pause active de 20 minutes et des rabais travailleurs.</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-bg/80 px-3 py-2 text-xs font-semibold"><span className="rounded-md bg-ig-blue px-2 py-0.5 text-[10px] font-bold text-white">Action 3.2</span> Rabais partenaires entre commerces et travailleurs</p>
      </header>

      {/* Jours */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Jour de la semaine" className="grid flex-1 grid-cols-5 gap-1 rounded-2xl bg-sep p-1 sm:max-w-md">
          {WEEKDAYS.map((d) => (
            <button key={d.id} type="button" role="tab" aria-selected={day === d.id} onClick={() => setDay(d.id)}
              className={`relative min-h-11 rounded-xl text-sm font-semibold transition ${day === d.id ? "bg-bg shadow-sm" : "text-muted hover:text-fg"}`}>
              {d.short}
              {workDays.includes(d.id) && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-ig-blue" />}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setPass(true)} className="ig-btn min-h-11 text-sm"><BadgePercent size={17} /> Ma carte travailleur</button>
      </div>

      <h2 className="text-xl font-bold tracking-tight">{isToday ? "Aujourd'hui midi" : `${dayLabel.charAt(0).toUpperCase()}${dayLabel.slice(1)} midi`} à Saint-Roch</h2>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {(["table", "pause"] as const).map((kind) => {
            const list = items.filter((i) => i.kind === kind);
            if (!list.length) return null;
            return (
              <section key={kind}>
                <h3 className="mb-3 text-sm font-bold">{kind === "table" ? "🍽️ Tables complices" : "🎯 Pauses actives (30 minutes max)"}</h3>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {list.map((i) => {
                    const on = seated.includes(i.id);
                    const seats = i.seats + (on ? 1 : 0);
                    return (
                      <li key={i.id} className={`flex flex-col rounded-2xl border bg-bg p-4 transition ${on ? "border-ig-blue shadow-sm" : "border-line"}`}>
                        <p className="font-bold leading-snug">{i.title}</p>
                        <p className="mt-1 text-xs text-muted">Proposé par {i.host}</p>
                        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><Clock size={13} /> {i.time} · {i.duration} min</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted"><MapPin size={13} /> {i.place}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="flex -space-x-2">
                            {i.people.slice(0, 4).map((p) => <span key={p} className="grid h-7 w-7 place-items-center rounded-full border-2 border-bg bg-soft text-[10px] font-bold">{p[0]}</span>)}
                          </span>
                          <span className="text-xs"><span className="font-bold">{seats}</span>{i.capacity ? ` / ${i.capacity}` : ""} travailleurs inscrits</span>
                        </div>
                        {i.capacity && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sep"><div className="h-full rounded-full bg-ig-blue transition-all duration-500" style={{ width: `${Math.min(100, (seats / i.capacity) * 100)}%` }} /></div>}
                        <button type="button" onClick={() => toggleSeat(i)} aria-pressed={on}
                          className={`mt-4 min-h-10 rounded-xl text-sm font-semibold transition active:scale-95 ${on ? "bg-ig-blue/10 text-ig-blue" : "ig-btn"}`}>
                          {on ? <span className="inline-flex items-center gap-1.5"><Check size={15} /> {kind === "table" ? "Tu as ta place" : "Tu y vas"}</span> : kind === "table" ? "Je m'assois" : "J'y vais"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          <section>
            <h3 className="mb-3 text-sm font-bold">💳 Rabais travailleurs : {offers.length} commerces ce midi</h3>
            <ul className="divide-y divide-sep rounded-2xl border border-line bg-bg">
              {offers.map((o) => (
                <li key={o.who + o.title} className="flex items-center gap-3 p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-soft text-xl">{o.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{o.who}</span>
                    <span className="block text-xs text-muted">{o.title}</span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-ig-red px-2.5 py-1 text-sm font-bold text-white">-{o.percent} %</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">Sur présentation de ta carte travailleur dans l&apos;app.</p>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="surface-card p-5">
            <h3 className="flex items-center gap-2 font-bold"><Briefcase size={18} className="text-ig-blue" /> Je travaille à Saint-Roch</h3>
            <p className="mt-1 text-xs text-muted">Tes jours au bureau : l&apos;app te montre les propositions ces jours-là.</p>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {WEEKDAYS.map((d) => {
                const on = workDays.includes(d.id);
                return (
                  <button key={d.id} type="button" aria-pressed={on} onClick={() => setWorkDays((w) => (on ? w.filter((x) => x !== d.id) : [...w, d.id].sort()))}
                    className={`min-h-10 rounded-xl text-xs font-bold transition active:scale-95 ${on ? "bg-ig-blue text-white" : "bg-soft text-muted"}`}>{d.short}</button>
                );
              })}
            </div>
            {workDays.length > 0 && <p className="mt-3 text-xs">✓ On te garde une place {workDays.map((d) => WEEKDAYS.find((x) => x.id === d)!.label).join(", ")}.</p>}
          </section>

          <section className="surface-card p-5">
            <h3 className="flex items-center gap-2 font-bold"><Store size={18} className="text-ig-blue" /> Tu as un commerce ?</h3>
            <p className="mt-1 text-xs text-muted">Publie ton offre du midi en 1 minute (ex. « soupe-sandwich 12 $ pour les travailleurs »).</p>
            <button type="button" onClick={() => setOfferOpen(true)} className="ig-btn-secondary mt-3 w-full text-sm">Publier mon offre du midi</button>
          </section>

          <section className="surface-card p-5">
            <h3 className="flex items-center gap-2 font-bold"><Sparkles size={18} className="text-ig-blue" /> Une entreprise ?</h3>
            <p className="mt-1 text-xs text-muted">Crée un dîner-rencontre avec les entreprises voisines, et rends vos jours au bureau plus attirants.</p>
            <div className="mt-3 flex gap-2">
              <Link href="/lancer" className="ig-btn-secondary min-h-10 flex-1 text-xs">Dîner-rencontre</Link>
              <button type="button" onClick={shareTeam} className="ig-btn-secondary min-h-10 flex-1 text-xs"><Share2 size={14} /> À mon équipe</button>
            </div>
          </section>
          <p className="px-1 text-[11px] text-muted">Démo : propositions, commerces et chiffres fictifs, pour illustrer la fonctionnalité.</p>
        </aside>
      </div>

      {pass && <WorkerPass name={user?.displayName ?? "Travailleur·euse du quartier"} onClose={() => setPass(false)} />}
      {offerOpen && (
        <OfferSheet
          onClose={() => setOfferOpen(false)}
          onPublish={(o) => {
            setMyOffers((m) => [{ ...o, who: user?.displayName ?? "Mon commerce", emoji: "✨" }, ...m]);
            setOfferOpen(false);
            toast("🎉 Ton offre du midi est publiée");
          }}
        />
      )}
    </div>
  );
}

/** Carte travailleur à montrer au comptoir : dégradé animé et horloge en direct (une capture d'écran ne passe pas). */
function WorkerPass({ name, onClose }: { name: string; onClose: () => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const date = new Intl.DateTimeFormat("fr-CA", { weekday: "long", day: "numeric", month: "long" }).format(now);
  const time = new Intl.DateTimeFormat("fr-CA", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now);
  return (
    <div role="dialog" aria-modal="true" aria-label="Ma carte travailleur" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 animate-fade-in backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="worker-pass w-full max-w-sm rounded-3xl p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] opacity-90">Complices · Saint-Roch</p>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-full bg-white/20"><X size={18} /></button>
        </div>
        <p className="mt-8 text-sm opacity-90">Carte travailleur·euse</p>
        <p className="mt-1 text-2xl font-bold">{name}</p>
        <p className="mt-6 text-xs capitalize opacity-90">Valide le {date}</p>
        <p className="font-mono text-3xl font-bold tabular-nums">{time}</p>
        <p className="mt-6 rounded-xl bg-white/20 px-3 py-2 text-center text-sm font-semibold">Présente cet écran au comptoir 💳</p>
      </div>
    </div>
  );
}

function OfferSheet({ onClose, onPublish }: { onClose: () => void; onPublish: (o: { title: string; percent: number; days: number[] }) => void }) {
  const [title, setTitle] = useState("");
  const [percent, setPercent] = useState(15);
  return (
    <div role="dialog" aria-modal="true" aria-label="Publier mon offre du midi" className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-fade-in md:items-center" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onPublish({ title: title.trim() || "Offre du midi", percent, days: [1, 2, 3, 4, 5] }); }}
        className="w-full max-w-md animate-sheet-up rounded-t-3xl bg-bg p-5 pb-[calc(20px+env(safe-area-inset-bottom))] md:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Mon offre du midi</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-full hover:bg-soft"><X size={18} /></button>
        </div>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Ex. : Soupe-sandwich à 12 $" className="ig-input mt-4" />
        <p className="mt-4 text-xs font-semibold text-muted">Rabais pour les travailleurs</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {[5, 10, 15, 20].map((p) => (
            <button key={p} type="button" aria-pressed={percent === p} onClick={() => setPercent(p)}
              className={`min-h-10 rounded-xl text-sm font-bold transition ${percent === p ? "bg-ig-blue text-white" : "bg-soft"}`}>-{p} %</button>
          ))}
        </div>
        <button type="submit" className="ig-btn mt-5 min-h-11 w-full text-sm">Publier (lundi au vendredi)</button>
      </form>
    </div>
  );
}
