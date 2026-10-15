import type { Metadata } from "next";
import { ActivityView } from "@/components/ActivityView";

export const metadata: Metadata = { title: "Activité · Complices" };

// Invitations reçues (« Tu es invité·e à… ») et réponses à mes invitations.
export default function ActivityPage() {
  return <ActivityView />;
}
