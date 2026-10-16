"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Radio } from "lucide-react";
import { useNow } from "@/lib/now";
import type { Idea } from "@/lib/types";
import { IdeaPoster } from "./IdeaPoster";

// « En direct » de l'accueil Vie Saint-Roch (comme le prototype HACKATHON26) : ce qui se passe en ce moment.
// Une grande activité à la une et deux à côté ; les autres dans le menu déroulant « Voir les N activités en direct ».
// Uniquement de vraies données : activités publiées dans l'app et événements de la Ville en cours (rien d'écrit en dur).

const HOUR = 3_600_000;
const SIDE = 2; // activités affichées à côté de la grande
type CityLive = { id: string; title: string; sites: string[]; startsAt: string; endsAt: string | null; url: string | null; at: { lat: number; lng: number } | null };
type Live = { id: string; title: string; place: string; label: string; href: string | null; external: boolean; idea: Idea | null; photo?: string };

const time = (t: number) => new Intl.DateTimeFormat("fr-CA", { hour: "numeric", minute: "2-digit" }).format(new Date(t));

/** Activités de l'app commencées depuis moins de 2 h (sans heure de fin connue). */
export function isLiveIdea(idea: Pick<Idea, "startsAt">, now: number) {
  if (!idea.startsAt || !now) return false;
  const start = new Date(idea.startsAt).getTime();
  return start <= now && now < start + 2 * HOUR;
}

export function LiveNow({ ideas }: { ideas: Idea[] | null }) {
  const now = useNow() ?? 0; // 0 pendant le pré-rendu : la section se remplit dans le navigateur
  const [city, setCity] = useState<CityLive[]>([]);
  const [more, setMore] = useState(false);
  useEffect(() => {
    fetch("/api/evenements-ville", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d: { events: CityLive[] }) => setCity(d.events ?? []))
      .catch(() => {});
  }, []);

  const fromIdeas: Live[] = (ideas ?? [])
    .filter((i) => isLiveIdea(i, now))
    .map((i) => ({ id: i.id, title: i.title, place: i.place, label: `Depuis ${time(new Date(i.startsAt!).getTime())}`, href: `/p/${i.id}`, external: false, idea: i }));
  const fromCity: Live[] = city
    .filter((e) => {
      const start = new Date(e.startsAt).getTime();
      const end = e.endsAt ? new Date(e.endsAt).getTime() : start + 3 * HOUR;
      return now > 0 && start <= now && now < end;
    })
    .map((e) => ({
      id: `ville-${e.id}`, title: e.title, place: e.sites.join(" · "),
      label: e.endsAt ? `Jusqu'à ${time(new Date(e.endsAt).getTime())}` : `Depuis ${time(new Date(e.startsAt).getTime())}`,
      href: e.at ? `/y-aller?vers=${e.at.lat.toFixed(6)},${e.at.lng.toFixed(6)}&nom=${encodeURIComponent(e.title)}` : e.url,
      external: !e.at && !!e.url, idea: null,
    }));
  // Les activités avec une photo passent en premier : la grande carte doit être visuelle.
  const hasPhoto = (l: Live) => Number(!!(l.photo || l.idea?.images.length));
  const live = [...fromIdeas, ...fromCity].sort((a, b) => hasPhoto(b) - hasPhoto(a));
  const [featured, ...others] = live;
  const side = others.slice(0, SIDE);
  const rest = others.slice(SIDE);

  return (
    <section aria-labelledby="en-direct" className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="live-now-dot" aria-hidden />
          <h2 id="en-direct" className="text-xl font-semibold md:text-2xl">En direct</h2>
        </div>
        <p className="text-muted">En cours en ce moment dans le quartier.</p>
      </div>

      {!ideas ? (
        <div className="h-56 animate-pulse rounded-lg bg-hov" />
      ) : !featured ? (
        <div className="flex items-center gap-3 rounded-lg border border-line bg-soft px-4 py-5">
          <Radio size={22} className="shrink-0 text-muted" aria-hidden />
          <span><span className="block font-semibold">Rien en cours en ce moment</span><span className="block text-sm text-muted">Regarde ce qui est prévu plus bas.</span></span>
        </div>
      ) : (
        <>
          {/* Une grande à la une, deux à côté (ordinateur) ou dessous (téléphone) */}
          <div className={`grid gap-4 sm:grid-cols-2 ${side.length ? "lg:grid-cols-3 lg:grid-rows-2" : ""}`}>
            <div className={side.length ? "sm:col-span-2 lg:row-span-2" : "sm:col-span-2 lg:col-span-3"}><LiveCard live={featured} featured /></div>
            {side.map((e) => <LiveCard key={e.id} live={e} />)}
          </div>
          {rest.length > 0 && (
            <div>
              {more && <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rest.map((e) => <LiveCard key={e.id} live={e} />)}</div>}
              <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more}
                className="mt-3 inline-flex min-h-11 items-center gap-2 font-medium text-ig-blue hover:underline">
                {more ? "Voir moins" : `Voir les ${live.length} activités en direct`}
                {more ? <ChevronUp size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function LiveCard({ live, featured = false }: { live: Live; featured?: boolean }) {
  const body = (
    <div className={`relative flex flex-col justify-between overflow-hidden rounded-lg text-white ${featured ? "h-72 lg:h-full lg:min-h-96" : "h-56"}`}>
      <div className="absolute inset-0" aria-hidden>
        {live.photo || live.idea?.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={live.photo ?? live.idea!.images[0]} alt="" className="h-full w-full object-cover" />
        ) : live.idea ? (
          <IdeaPoster idea={live.idea} compact={!featured} plain />
        ) : (
          <IdeaPoster idea={{ title: live.title, category: "culturel" }} compact={!featured} plain />
        )}
        <div className="absolute inset-0 bg-[#1f3a4d]/25" />
      </div>
      <div className={`relative ${featured ? "p-4 lg:p-6" : "p-4"}`}>
        <span className="inline-flex items-center gap-2 rounded-md bg-white px-2.5 py-1 font-semibold text-[#1f3a4d]">
          <span className="live-now-dot" aria-hidden /> En direct
        </span>
      </div>
      <div className={`relative bg-gradient-to-t from-[#1f3a4d] via-[#1f3a4d]/80 to-transparent pt-12 ${featured ? "px-4 pb-4 lg:px-6 lg:pb-6" : "px-4 pb-4"}`}>
        <p className="font-medium text-white/90">{live.label}</p>
        <p className={`font-bold leading-snug ${featured ? "text-2xl lg:text-3xl" : "text-xl"}`}>{live.title}</p>
        {live.place && (
          <p className="mt-1 flex items-center gap-1.5 text-white/90">
            <MapPin size={16} className="shrink-0" aria-hidden /> <span className="truncate">{live.place}</span>
          </p>
        )}
      </div>
    </div>
  );
  const cls = `block rounded-lg transition-shadow hover:shadow-lg ${featured ? "h-full" : ""}`;
  if (!live.href) return <div className={cls}>{body}</div>;
  if (live.external) return <a href={live.href} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a>;
  return <Link href={live.href} className={cls}>{body}</Link>;
}
