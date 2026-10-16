import type { Metadata } from "next";
import Link from "next/link";
import { FEATURES } from "@/lib/features";
import { InterfaceIcon } from "@/components/InterfaceIcon";

export const metadata: Metadata = { title: "Fonctionnalités · Complices" };

// Les 9 réponses de Complices aux 9 problèmes de Saint-Roch (disponibles ou à venir).
export default function FeaturesPage() {
  const ordered = [...FEATURES].sort((a, b) => a.problem - b.problem);
  return (
    <div className="mx-auto max-w-[935px] px-4 py-6 md:py-10">
      <h1 className="text-2xl font-bold">Toutes les fonctionnalités</h1>
      <p className="mt-1 max-w-2xl text-muted">
        Tout ce que tu peux faire avec Complices, au même endroit.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((f) => (
          <li key={f.slug}>
            <Link href={f.slug === "idees" ? "/creer" : f.href} className="flex h-full gap-3 rounded-xl border border-line p-4 transition hover:bg-soft active:scale-[0.99]">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full story-ring">
                <span className="grid h-[50px] w-[50px] place-items-center rounded-full bg-bg text-2xl"><InterfaceIcon symbol={f.emoji} size={22} /></span>
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${f.status === "live" ? "bg-ig-green/15 text-ig-green" : "bg-sep text-muted"}`}>
                    {f.status === "live" ? "Disponible" : "Bientôt"}
                  </span>
                </span>
                <span className="block font-semibold leading-snug">{f.title}</span>
                <span className="mt-0.5 block text-sm text-muted">{f.pitch}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
