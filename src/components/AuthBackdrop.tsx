import type { ReactNode } from "react";
import "./welcome.css";

// Fond des pages Connexion et Inscription, au style de la page d'ouverture (16 oct., Danny) :
// bleu nuit et mosaïque de photos qui dérive ; les cartes restent blanches.
const PHOTOS = ["marche", "art", "jeux", "atelier", "tech"];

export function AuthBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="auth-glass relative min-h-dvh w-full">
      <div className="welcome-mosaic" aria-hidden>
        {[...PHOTOS, ...PHOTOS].map((p, k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={k} src={`/images/activities/${p}.jpg`} alt="" />
        ))}
      </div>
      <div className="welcome-veil" aria-hidden />
      <div className="welcome-in relative flex min-h-dvh flex-col justify-center">{children}</div>
    </div>
  );
}
