import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les builds de TEST (curl) se font dans un autre dossier (COMPLICES_DIST_DIR=.next-test) pour ne jamais abîmer le cache de `npm run dev`.
  distDir: process.env.COMPLICES_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  // Permet d'ouvrir l'app depuis un téléphone sur le même Wi-Fi (http://<IP-de-l'ordi>:3000)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  // « Y aller » : exceljs lit le fichier Excel des événements de la Ville côté serveur (chargé tel quel par Node, pas regroupé)
  serverExternalPackages: ["exceljs"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
