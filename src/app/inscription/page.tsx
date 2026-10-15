import type { Metadata } from "next";
import { SignupForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Inscription · Complices" };

export default function SignupPage() {
  return <SignupForm />;
}
