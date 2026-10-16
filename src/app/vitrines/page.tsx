import type { Metadata } from "next";
import { ResidentNeedsView } from "@/components/ResidentNeedsView";

export const metadata: Metadata = {
  title: "Vitrine · Les besoins des résidents · Complices",
  description: "Exprime ce qui manque dans ton secteur et soutiens les besoins de tes voisins à Saint-Roch.",
};

export default function Page() {
  return <ResidentNeedsView />;
}
