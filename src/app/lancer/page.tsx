import type { Metadata } from "next";
import { LaunchIdea } from "@/components/LaunchIdea";

export const metadata: Metadata = { title: "Lancer une idée · Complices" };

// Problème 1 : « Lancer une idée » → trouver ses complices, les inviter, publier.
export default function LaunchPage() {
  return <LaunchIdea />;
}
