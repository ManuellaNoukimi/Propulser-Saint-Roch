import type { Metadata } from "next";
import { AuthBackdrop } from "@/components/AuthBackdrop";
import { LoginForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Connexion · Complices" };

export default function LoginPage() {
  return (
    <AuthBackdrop>
      <LoginForm />
    </AuthBackdrop>
  );
}
