import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { featureBySlug } from "@/lib/features";

export const metadata: Metadata = { title: `${featureBySlug("soirees").title} · Complices` };

export default function Page() {
  return <ComingSoon slug="soirees" />;
}
