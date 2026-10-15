import type { Metadata } from "next";
import { VitrinesView } from "@/components/VitrinesView";

export const metadata: Metadata = { title: "Vitrines à remplir · Complices" };

// Problème 4 : « Vitrines à remplir » (affichage de démo, locaux d'exemple).
export default function Page() {
  return <VitrinesView />;
}
