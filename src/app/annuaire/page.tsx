import type { Metadata } from "next";
import { DirectoryView } from "@/components/DirectoryView";

export const metadata: Metadata = { title: "Annuaire du quartier · Complices" };

export default function DirectoryPage() {
  return <DirectoryView />;
}
