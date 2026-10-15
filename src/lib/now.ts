"use client";

import { useSyncExternalStore } from "react";

// L'heure courante côté navigateur, arrondie à la minute (stable entre deux rendus).
// Pendant le pré-rendu (cacheComponents), Next interdit new Date() : on renvoie alors null.
const noop = () => () => {};
const minute = () => Math.floor(Date.now() / 60_000) * 60_000;

export function useNow(): number | null {
  return useSyncExternalStore(noop, minute, () => null);
}
