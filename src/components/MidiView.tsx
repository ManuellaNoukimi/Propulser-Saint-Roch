"use client";

import { useState } from "react";
import { Check, Clock, MapPin } from "lucide-react";
import { toast } from "@/lib/toast";
import { useNow } from "@/lib/now";
import { WEEKDAYS } from "@/lib/quartier";
import { InterfaceIcon } from "@/components/InterfaceIcon";

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


export function MidiView() {
  const now = useNow();
  const today = now === null ? null : new Date(now).getDay();
  const [picked, setDay] = useState<number | null>(null);
  const day = picked ?? (today && today >= 1 && today <= 5 ? today : 1);
  const [seated, setSeated] = useState<string[]>([]);

  const items = ITEMS.filter((i) => i.days.includes(day));
  const offers = OFFERS.filter((o) => o.days.includes(day));
  const dayLabel = WEEKDAYS.find((d) => d.id === day)!.label;
  const isToday = day === today;

  function toggleSeat(i: Item) {
    const on = seated.includes(i.id);
    setSeated((s) => (on ? s.filter((x) => x !== i.id) : [...s, i.id]));
    if (!on) toast(i.kind === "table" ? ` Place réservée : ${i.title}` : ` À tout à l'heure : ${i.title}`);
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-6 px-4 py-5 md:px-7 md:py-8">
      <header className="midi-banner relative overflow-hidden rounded-3xl border border-line px-6 py-7 md:px-8">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-muted">Ta pause à Saint-Roch</p>
        <h1 className="text-[28px] font-bold leading-[1.12] tracking-tight md:text-[36px]"> Le Midi Complice</h1>
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
            </button>
          ))}
        </div>
      </div>

      <h2 className="text-xl font-bold tracking-tight">{isToday ? "Aujourd'hui midi" : `${dayLabel.charAt(0).toUpperCase()}${dayLabel.slice(1)} midi`} à Saint-Roch</h2>

      <div className="space-y-6">
        <div className="space-y-6">
          {(["table", "pause"] as const).map((kind) => {
            const list = items.filter((i) => i.kind === kind);
            if (!list.length) return null;
            return (
              <section key={kind}>
                <h3 className="mb-3 text-sm font-bold">{kind === "table" ? " Tables complices" : " Pauses actives (30 minutes max)"}</h3>
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
            <h3 className="mb-3 text-sm font-bold"> Rabais travailleurs : {offers.length} commerces ce midi</h3>
            <ul className="divide-y divide-sep rounded-2xl border border-line bg-bg">
              {offers.map((o) => (
                <li key={o.who + o.title} className="flex items-center gap-3 p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-soft text-xl"><InterfaceIcon symbol={o.emoji} size={22} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{o.who}</span>
                    <span className="block text-xs text-muted">{o.title}</span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-ig-red px-2.5 py-1 text-sm font-bold text-white">-{o.percent} %</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

      </div>
    </div>
  );
}
