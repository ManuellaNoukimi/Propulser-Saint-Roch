import type { Metadata } from "next";
import { Feed } from "@/components/Feed";

export const metadata: Metadata = { title: "Vie Saint-Roch · Complices" };

// Espace « Vie Saint-Roch » : toutes les activités du quartier (anciennement la page d'accueil).
export default function ViePage() {
  return <Feed />;
}
