"use client";

import { useEffect, useState } from "react";
import { useSession } from "./session";

/** Le compte connecté est-il un compte SDC ? (vérifié par le serveur, /api/sdc/me) Sert à afficher « Vue SDC ». */
export function useIsSdc(): boolean {
  const { user } = useSession();
  const [sdc, setSdc] = useState<{ id: string; sdc: boolean } | null>(null);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetch("/api/sdc/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { sdc: false }))
      .then((d: { sdc: boolean }) => { if (alive) setSdc({ id: user.id, sdc: d.sdc }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [user]);
  return !!user && sdc?.id === user.id && sdc.sdc;
}
