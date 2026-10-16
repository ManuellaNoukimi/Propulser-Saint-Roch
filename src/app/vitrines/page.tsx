import type { Metadata } from "next";
import { VitrinesPage } from "@/components/VitrinesPage";

export const metadata: Metadata = {
  title: "Vitrines · Locaux vacants et besoins des résidents · Complices",
  description: "Les locaux vacants de Saint-Roch et ce qui manque selon les résidents : vote, soutiens et occupation en attendant.",
};

// Deux onglets (VitrinesPage) : « Locaux vacants » (VitrinesView) et « Besoins des résidents » (ResidentNeedsView), tous deux de Manuella.
export default function Page() {
  return <VitrinesPage />;
}
