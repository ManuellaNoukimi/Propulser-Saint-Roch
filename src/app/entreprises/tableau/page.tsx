import type { Metadata } from "next";
import { BusinessDashboard } from "@/components/BusinessDashboard";

export const metadata: Metadata = { title: "Mon tableau de bord · Complices" };

export default function BusinessDashboardPage() {
  return <BusinessDashboard />;
}
