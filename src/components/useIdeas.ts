"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import type { Idea } from "@/lib/types";

/** Charge toutes les publications (rechargées après connexion ou déconnexion). */
export function useIdeas() {
  const { user } = useSession();
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/api/ideas", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { ideas: Idea[] }) => setIdeas(d.ideas))
      .catch(() => setError(true));
  }, [user?.id]);
  return { ideas, error };
}
