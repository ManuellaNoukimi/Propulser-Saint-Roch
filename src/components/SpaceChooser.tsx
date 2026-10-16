"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { InterfaceIcon } from "@/components/InterfaceIcon";

// Page d'ouverture : on choisit un des deux espaces, puis il s'affiche.
const SPACES = [
  {
    href: "/vie",
    emoji: "🎉",
    title: "Vie Saint-Roch",
    text: "Les activités du quartier : fêtes, marchés, corvées, bénévolat… Rejoins-en une ou propose la tienne.",
    api: "/api/ideas",
    field: "ideas",
    unit: "activité",
    className: "space-card--vie",
  },
  {
    href: "/entreprises",
    emoji: "🏪",
    title: "Entreprises",
    text: "Les commerces, restos et organismes du quartier : promos, nouveautés, emplois et coups de main offerts.",
    api: "/api/entreprises",
    field: "posts",
    unit: "publication",
    className: "space-card--entreprises",
  },
] as const;

export function SpaceChooser() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    for (const s of SPACES) {
      fetch(s.api, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setCounts((c) => ({ ...c, [s.href]: (d[s.field] ?? []).length })))
        .catch(() => {});
    }
  }, []);

  return (
    // Page à part : plein écran, par-dessus la navigation (pas de barre latérale ni d'onglets ici).
    <div className="space-chooser fixed inset-0 z-[90] overflow-y-auto bg-bg">
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-4 py-10 md:py-12">
      <header className="mb-8 text-center md:mb-12">
        <p className="text-[11px] font-bold uppercase tracking-[.2em] text-muted">Complices · Saint-Roch</p>
        <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-tight md:text-[44px]">
          Qu&apos;est-ce que tu veux voir<span className="text-ig-blue"> ?</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">Choisis un espace. Tu pourras changer à tout moment.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {SPACES.map((s, k) => (
          <Link
            key={s.href}
            href={s.href}
            className={`space-card ${s.className} group flex min-h-[220px] flex-col justify-between rounded-3xl border border-line p-6 md:min-h-[340px] md:p-8`}
            style={{ animationDelay: `${k * 90}ms` }}
          >
            <div>
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-bg text-4xl shadow-sm md:h-20 md:w-20 md:text-5xl"><InterfaceIcon symbol={s.emoji} size={22} /></span>
              <h2 className="mt-5 text-2xl font-bold tracking-tight md:text-3xl">{s.title}</h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted md:text-base">{s.text}</p>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">
                {counts[s.href] === undefined ? " " : `${counts[s.href]} ${s.unit}${counts[s.href] > 1 ? "s" : ""}`}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-sm font-semibold text-bg transition group-hover:gap-3">
                Entrer <ArrowRight size={16} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
    </div>
  );
}
