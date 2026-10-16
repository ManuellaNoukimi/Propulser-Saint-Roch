import type { Metadata } from "next";
import { CollaborerView } from "@/components/CollaborerView";

export const metadata: Metadata = { title: "Collaborer · Complices" };

export default function CollaborerPage() {
  return <CollaborerView />;
}
