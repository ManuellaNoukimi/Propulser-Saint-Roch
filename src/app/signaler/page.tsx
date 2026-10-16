import type { Metadata } from "next";
import { SignalerView } from "@/components/signaler/SignalerView";

export const metadata: Metadata = { title: "Signaler · Complices" };

// « Signaler » (remis le 16 oct., V3) : itinérance, propreté, infraction, dégât, vandalisme, avec description.
// Privé : jamais dans les publications. La SDC suit les signalements (onglet « Suivi SDC »), sans voir qui les a faits.
export default function ReportPage() {
  return <SignalerView />;
}
