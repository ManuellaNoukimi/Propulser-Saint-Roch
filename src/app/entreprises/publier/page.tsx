import type { Metadata } from "next";
import { BusinessPostForm } from "@/components/BusinessPostForm";

export const metadata: Metadata = { title: "Publier pour mon commerce · Complices" };

export default function BusinessPublishPage() {
  return <BusinessPostForm />;
}
