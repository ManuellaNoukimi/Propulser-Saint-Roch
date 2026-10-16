import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { featureBySlug } from "@/lib/features";

export const metadata: Metadata = { title: `${featureBySlug("midi").title} · Complices` };

// Fonctionnalité retirée de l'app par l'équipe (16 oct.) : présentée seulement, comme les autres « Bientôt ».
// L'ancien écran reste dans le code (MidiView.tsx) pour pouvoir le remettre.
export default function MidiPage() {
  return <ComingSoon slug="midi" />;
}
