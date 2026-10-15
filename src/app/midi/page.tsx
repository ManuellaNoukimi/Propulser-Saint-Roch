import type { Metadata } from "next";
import { MidiView } from "@/components/MidiView";

export const metadata: Metadata = { title: "Le Midi Complice · Complices" };

// Problème 3 : « Le Midi Complice » (affichage de démo).
export default function Page() {
  return <MidiView />;
}
