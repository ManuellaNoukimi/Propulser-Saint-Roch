"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Badge, ProfileStats, SessionUser } from "./types";

type SessionState = {
  user: SessionUser | null;
  badges: Badge[];
  stats: ProfileStats | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

async function fetchMe() {
  const r = await fetch("/api/auth/me", { cache: "no-store" });
  return (await r.json()) as { user: SessionUser | null; badges?: Badge[]; stats?: ProfileStats };
}

/** Fournit le compte connecté (lu via le cookie de session côté serveur) à toute l'app. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<SessionState, "refresh" | "logout">>({ user: null, badges: [], stats: null, loading: true });

  const refresh = useCallback(async () => {
    try {
      const d = await fetchMe();
      setState({ user: d.user, badges: d.badges ?? [], stats: d.stats ?? null, loading: false });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState({ user: null, badges: [], stats: null, loading: false });
  }, []);

  useEffect(() => {
    let alive = true;
    fetchMe()
      .then((d) => alive && setState({ user: d.user, badges: d.badges ?? [], stats: d.stats ?? null, loading: false }))
      .catch(() => alive && setState((s) => ({ ...s, loading: false })));
    return () => {
      alive = false;
    };
  }, []);

  return <SessionContext.Provider value={{ ...state, refresh, logout }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession doit être utilisé dans <SessionProvider>");
  return ctx;
}

/** Chemin de la page de connexion qui ramène ici ensuite. */
export function loginHref(next?: string) {
  const here = next ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  return `/connexion?next=${encodeURIComponent(here)}`;
}
