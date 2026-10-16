"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, MapPin, Navigation, Radio, Sparkles } from "lucide-react";
import { useNow } from "@/lib/now";
import { useSession } from "@/lib/session";
import type { Idea } from "@/lib/types";
import { isLiveIdea } from "./LiveNow";
import { homeFor } from "./SpaceGuard";
import "./welcome.css";

// Page d'ouverture (« / ») : on accueille avant de montrer les activités (demande de Danny, 16 oct.).
// Animée, avec de vrais chiffres lus dans l'app (rien d'écrit en dur). Le bouton fait apparaître son espace :
// Vie Saint-Roch (résident·e, invité·e, visiteur) ou Entreprises (compte entreprise).

const WORDS = ["se rencontre.", "s'entraide.", "lance des idées.", "découvre le quartier.", "fait vivre la rue."];
const PHOTOS = ["marche", "art", "jeux", "atelier", "tech"];
const FEATURES = [
  { icon: Radio, title: "En direct", text: "Ce qui se passe en ce moment, à deux pas de chez toi." },
  { icon: Sparkles, title: "Lance une idée", text: "Trouve tes complices : voisins, commerces et organismes prêts à t'aider." },
  { icon: Navigation, title: "Y aller facilement", text: "À pied, en autobus ou à vélo : le chemin le plus simple." },
];

type Stats = { live: number; upcoming: number; places: number };

/** Nombre qui monte doucement jusqu'à sa valeur. */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 900);
      setShown(Math.round(value * (1 - (1 - k) ** 3)));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{shown}</>;
}

export function Welcome() {
  const router = useRouter();
  const { user, loading } = useSession();
  const now = useNow();
  const [word, setWord] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [places, setPlaces] = useState<number | null>(null);
  const target = homeFor(user?.accountType);
  const business = target === "/entreprises";

  useEffect(() => {
    const timer = setInterval(() => setWord((w) => (w + 1) % WORDS.length), 2400);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch("/api/ideas", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { ideas: [] }))
      .then((d: { ideas: Idea[] }) => setIdeas(d.ideas ?? []))
      .catch(() => setIdeas([]));
    fetch("/api/annuaire", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { sdc: [] }))
      .then((d: { sdc?: unknown[] }) => setPlaces(d.sdc?.length ?? 0))
      .catch(() => setPlaces(0));
  }, []);

  useEffect(() => {
    router.prefetch(target);
  }, [router, target]);

  const stats: Stats | null = ideas && places !== null && now
    ? {
        live: ideas.filter((i) => isLiveIdea(i, now)).length,
        upcoming: ideas.filter((i) => i.startsAt && new Date(i.startsAt).getTime() > now).length,
        places,
      }
    : null;

  function enter() {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => router.push(target), 420); // le temps de l'animation de sortie
  }

  return (
    <div className={`welcome fixed inset-0 z-[90] overflow-y-auto text-white ${leaving ? "is-leaving" : ""}`}>
      {/* Mosaïque de photos qui dérive lentement, sous un voile bleu nuit */}
      <div className="welcome-mosaic" aria-hidden>
        {[...PHOTOS, ...PHOTOS].map((p, k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={k} src={`/images/activities/${p}.jpg`} alt="" />
        ))}
      </div>
      <div className="welcome-veil" aria-hidden />

      <div className="welcome-content relative mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-8 md:px-10 md:py-12">
        <header className="welcome-in flex items-center justify-between gap-3" style={{ animationDelay: "0ms" }}>
          <span className="font-logo text-[30px] leading-none md:text-[36px]">Complices<span className="text-ig-green">.</span></span>
          <span className="flex items-center gap-1.5 text-sm text-white/80"><MapPin size={15} aria-hidden /> Saint-Roch, Québec</span>
        </header>

        <div className="flex flex-1 flex-col justify-center py-10">
          <p className="welcome-in font-semibold text-ig-green" style={{ animationDelay: "120ms" }}>Bienvenue à Saint-Roch</p>
          <h1 className="welcome-in mt-3 text-[40px] font-bold leading-[1.05] tracking-tight md:text-[68px]" style={{ animationDelay: "220ms" }}>
            Ici, on{" "}
            <span className="welcome-word" aria-live="polite">
              <span key={word} className="welcome-word-inner text-ig-green">{WORDS[word]}</span>
            </span>
          </h1>
          <p className="welcome-in mt-5 max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl" style={{ animationDelay: "340ms" }}>
            Complices réunit les voisins, les commerces et les organismes du quartier : ce qui se passe maintenant,
            les idées à faire ensemble et les bonnes adresses, au même endroit.
          </p>

          <ul className="mt-9 grid gap-3 md:grid-cols-3">
            {FEATURES.map((f, k) => {
              const Icon = f.icon;
              return (
                <li key={f.title} className="welcome-in welcome-card rounded-lg p-4" style={{ animationDelay: `${460 + k * 110}ms` }}>
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/15"><Icon size={20} aria-hidden /></span>
                  <p className="mt-3 font-semibold">{f.title}</p>
                  <p className="mt-1 text-sm text-white/80">{f.text}</p>
                </li>
              );
            })}
          </ul>

          <div className="welcome-in mt-8 flex min-h-[56px] flex-wrap gap-x-10 gap-y-3" style={{ animationDelay: "800ms" }} aria-live="polite">
            {stats && (
              <>
                <p><span className="flex items-center gap-2 text-3xl font-bold">{stats.live > 0 && <span className="live-now-dot" aria-hidden />}<CountUp value={stats.live} /></span><span className="text-sm text-white/75">activité{stats.live > 1 ? "s" : ""} en ce moment</span></p>
                <p><span className="block text-3xl font-bold"><CountUp value={stats.upcoming} /></span><span className="text-sm text-white/75">activité{stats.upcoming > 1 ? "s" : ""} à venir</span></p>
                <p><span className="block text-3xl font-bold"><CountUp value={stats.places} /></span><span className="text-sm text-white/75">commerces et organismes</span></p>
              </>
            )}
          </div>

          <div className="welcome-in mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "920ms" }}>
            <button type="button" onClick={enter} disabled={loading} className="welcome-cta inline-flex min-h-[52px] items-center gap-2 rounded-lg bg-ig-green px-6 text-lg font-semibold text-white">
              {business ? "Entrer dans l'espace Entreprises" : "Découvrir le quartier"} <ArrowRight size={20} aria-hidden />
            </button>
            {!loading && !user && (
              <>
                <Link href="/connexion" className="inline-flex min-h-[52px] items-center rounded-lg border border-white/40 px-5 font-semibold hover:bg-white/10">Se connecter</Link>
                <Link href="/inscription" className="inline-flex min-h-[52px] items-center px-2 font-semibold text-white/90 underline-offset-4 hover:underline">Créer un compte</Link>
              </>
            )}
            {!loading && user && <span className="text-sm text-white/75">Content de te revoir, {user.displayName}.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
