import type { Metadata } from "next";
import { BusinessFeed } from "@/components/BusinessFeed";

export const metadata: Metadata = { title: "Entreprises · Complices" };

// Onglet « Entreprises » : promos, nouveautés, emplois des commerces (séparé des activités de « Vie Saint-Roch »).
export default function BusinessPage() {
  return <BusinessFeed />;
}
