import Link from "next/link";
import { featureBySlug } from "@/lib/features";

// Page d'une fonctionnalité pas encore codée, présentée comme une « story » ouverte.
export function ComingSoon({ slug }: { slug: string }) {
  const f = featureBySlug(slug);
  return (
    <div className="mx-auto max-w-[520px] px-4 py-6 md:py-10">
      <div className="relative overflow-hidden rounded-2xl p-6 text-white story-ring">
        <div className="absolute inset-0 bg-black/25" aria-hidden />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-3xl">{f.emoji}</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-90">Problème {f.problem} · Bientôt</p>
              <h1 className="text-2xl font-extrabold leading-tight">{f.title}</h1>
            </div>
          </div>
          <p className="mt-5 text-lg font-semibold leading-snug">{f.pitch}</p>
        </div>
      </div>

      <section className="mt-6 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Le problème</p>
          <p className="mt-1 text-base">{f.problemLabel}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Ce que fera cette fonctionnalité</p>
          <ul className="mt-2 space-y-2">
            {f.bullets.map((b) => (
              <li key={b} className="flex gap-2.5"><span className="story-gradient-text font-black">●</span><span>{b}</span></li>
            ))}
          </ul>
        </div>
        {f.planActions && <p className="rounded-xl bg-soft border border-line px-3 py-2.5 text-sm">🏛️ {f.planActions}</p>}
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/creer" className="ig-btn">💡 Publier une idée en attendant</Link>
        <Link href="/fonctionnalites" className="ig-btn-secondary">Toutes les fonctionnalités</Link>
      </div>
    </div>
  );
}
