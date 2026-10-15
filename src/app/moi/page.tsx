import type { Metadata } from "next";
import { MeRedirect } from "@/components/MeRedirect";

export const metadata: Metadata = { title: "Mon profil · Complices" };

export default function MePage() {
  return <MeRedirect />;
}
