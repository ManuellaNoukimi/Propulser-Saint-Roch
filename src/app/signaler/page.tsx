import { redirect } from "next/navigation";

// « Signaler » est retiré de l'app (demande de Danny, 15 oct. soir) : l'ancienne adresse renvoie à l'accueil.
// Le code reste en place (ReportMap.tsx, /api/reports/*) pour pouvoir le remettre : rétablir <ReportMap /> ici.
export default function ReportPage() {
  redirect("/vie");
}
