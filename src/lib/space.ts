"use client";

import { useSyncExternalStore } from "react";

// Espace choisi sur la page d'ouverture : « vie » (Vie Saint-Roch) ou « entreprises ».
// Retenu sur l'appareil pour que la navigation reste cohérente quand on ouvre l'agenda, une publication, un profil…
export type Space = "vie" | "entreprises";
const KEY = "complices.space";
const EVENT = "complices:space";

function read(): Space {
  try {
    return localStorage.getItem(KEY) === "entreprises" ? "entreprises" : "vie";
  } catch {
    return "vie";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function rememberSpace(space: Space) {
  try {
    if (localStorage.getItem(KEY) === space) return;
    localStorage.setItem(KEY, space);
  } catch {
    /* navigation privée : on ne retient pas */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** L'espace d'une adresse, s'il est évident (sinon null : on garde l'espace retenu). */
export function spaceOfPath(path: string | null): Space | null {
  if (!path) return null;
  if (path === "/entreprises" || path.startsWith("/entreprises/")) return "entreprises";
  if (path === "/vie" || ["/explorer", "/lancer", "/signaler", "/y-aller", "/vitrines", "/checkin", "/sdc", "/fonctionnalites", "/creer"].some((p) => path === p || path.startsWith(`${p}/`))) return "vie";
  return null;
}

export function useSpace(path: string | null): Space {
  const stored = useSyncExternalStore(subscribe, read, () => "vie" as Space);
  return spaceOfPath(path) ?? stored;
}
