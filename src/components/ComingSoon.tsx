import Link from "next/link";
import { featureBySlug } from "@/lib/features";
import { InterfaceIcon } from "@/components/InterfaceIcon";

// Page d'une fonctionnalité pas encore codée, présentée comme une « story » ouverte.
export function ComingSoon({ slug }: { slug: string }) {
  const f = featureBySlug(slug);
  return (
    <div className="mx-auto max-w-[520px] px-4 py-6 md:py-10">
      <div className="relative overflow-hidden rounded-2xl p-6 text-white story-ring">
        <div className="absolute inset-0 bg-black/25" aria-hidden />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-3xl text-[#1f3a4d]"><InterfaceIcon symbol={f.emoji} size={22} /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-90">Bientôt</p>
              <h1 className="text-2xl font-extrabold leading-tight">{f.title}</h1>
            </div>
          </div>
          <p className="mt-5 text-lg font-semibold leading-snug">{f.pitch}</p>
        </div>
      </div>

      <section className="mt-6 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Ce que fera cette fonctionnalité</p>
          <ul className="mt-2 space-y-2">
            {f.bullets.map((b) => (
              <li key={b} className="flex gap-2.5"><span className="story-gradient-text font-black">●</span><span>{b}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/creer" className="ig-btn"> Publier une idée en attendant</Link>
        <Link href="/fonctionnalites" className="ig-btn-secondary">Toutes les fonctionnalités</Link>
      </div>
    </div>
  );
}
