import type { Metadata } from "next";
import { AuthBackdrop } from "@/components/AuthBackdrop";
import { SignupForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Inscription · Complices" };

export default function SignupPage() {
  return (
    <AuthBackdrop>
      <SignupForm />
    </AuthBackdrop>
  );
}
