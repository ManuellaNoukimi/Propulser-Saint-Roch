"use client";

// Petites notifications en bas de l'écran (« Lien copié », « Publié ! »…), sans dépendance.
export const TOAST_EVENT = "complices:toast";

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));
}
