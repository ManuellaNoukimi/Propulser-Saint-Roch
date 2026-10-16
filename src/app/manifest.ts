import type { MetadataRoute } from "next";

// Installer Complices sur l'écran d'accueil du téléphone : icône, nom et ouverture en plein écran, comme une app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Complices · Saint-Roch",
    short_name: "Complices",
    description: "Fais vivre Saint-Roch avec tes voisins, les commerces et les organismes du quartier.",
    lang: "fr-CA",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
