import { Welcome } from "@/components/Welcome";

// Page d'ouverture : on accueille avant de montrer les activités (16 oct., Danny). Le bouton mène à son espace :
// entreprise → « Entreprises », résident·e / invité·e / visiteur → « Vie Saint-Roch ». (SpaceChooser.tsx est gardé.)
export default function HomePage() {
  return <Welcome />;
}
