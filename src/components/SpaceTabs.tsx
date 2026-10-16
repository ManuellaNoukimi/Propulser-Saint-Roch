import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// En haut de chaque espace : rappel de l'espace actuel + retour à la page de choix (« / »).
const LABELS = { vie: " Vie Saint-Roch", entreprises: " Entreprises" } as const;

export function SpaceTabs({ active }: { active: "vie" | "entreprises" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-bg px-4 text-sm font-semibold transition hover:bg-soft active:scale-95">
        <ArrowLeft size={16} /> Changer d&apos;espace
      </Link>
      <span className="text-sm font-semibold text-muted">{LABELS[active]}</span>
    </div>
  );
}
