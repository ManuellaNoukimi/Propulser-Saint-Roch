import type { Metadata } from "next";
import { SdcVitrinesView } from "@/components/SdcVitrinesView";

export const metadata: Metadata = { title: "Vue SDC · Demande par local · Complices" };

// Vue SDC des vitrines : réservée aux comptes SDC (vérifié par /api/sdc/vitrines).
export default function SdcVitrinesPage() {
  return <SdcVitrinesView />;
}
