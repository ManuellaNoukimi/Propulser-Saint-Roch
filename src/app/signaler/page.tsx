import type { Metadata } from "next";
import { ReportMap } from "@/components/ReportMap";

export const metadata: Metadata = { title: "Signaler · Complices" };

// Onglet « Signaler » : carte de Saint-Roch, une pastille = un besoin ou un problème (privé).
export default function ReportPage() {
  return <ReportMap />;
}
