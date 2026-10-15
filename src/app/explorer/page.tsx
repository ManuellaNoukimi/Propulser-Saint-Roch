import type { Metadata } from "next";
import { ExploreView } from "@/components/ExploreView";

export const metadata: Metadata = { title: "Explorer · Complices" };

export default function ExplorePage() {
  return <ExploreView />;
}
