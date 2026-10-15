import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { featureBySlug } from "@/lib/features";

export const metadata: Metadata = { title: `${featureBySlug("serein").title} · Complices` };

export default function Page() {
  return <ComingSoon slug="serein" />;
}
