import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { featureBySlug } from "@/lib/features";

export const metadata: Metadata = { title: `${featureBySlug("signaler").title} · Complices` };

// Fonctionnalité retirée de l'app par l'équipe (16 oct.) : présentée seulement, comme les autres « Bientôt ».
// L'ancien écran reste dans le code (ReportMap.tsx, /api/reports/*) pour pouvoir le remettre.
export default function ReportPage() {
  return <ComingSoon slug="signaler" />;
}
