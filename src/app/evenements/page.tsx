import type { Metadata } from "next";
import { EventsView } from "@/components/EventsView";

export const metadata: Metadata = { title: "Événements · Complices" };

export default function EventsPage() {
  return <EventsView />;
}
