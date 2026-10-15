import type { Metadata } from "next";
import { EditProfile } from "@/components/EditProfile";

export const metadata: Metadata = { title: "Modifier le profil · Complices" };

export default function EditProfilePage() {
  return <EditProfile />;
}
