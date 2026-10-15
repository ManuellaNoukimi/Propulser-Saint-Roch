import type { Metadata } from "next";
import { LoginForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Connexion · Complices" };

export default function LoginPage() {
  return <LoginForm />;
}
