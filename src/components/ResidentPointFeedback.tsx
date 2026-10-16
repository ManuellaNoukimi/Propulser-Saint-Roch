"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/session";
import {
  isResidentAccount,
  RESIDENT_BADGES,
} from "@/lib/resident-progress-options";
import { RESIDENT_PROGRESS_EVENT } from "@/lib/resident-feedback";
import { toast } from "@/lib/toast";

type Summary = {
  score: number;
  level: { id: string; label: string };
  badges: string[];
};

export function ResidentPointFeedback() {
  const { user } = useSession();
  const userId = user?.id;
  const accountType = user?.accountType;
  useEffect(() => {
    if (!userId || !accountType || !isResidentAccount(accountType)) return;
    let active = true;
    let previous: Summary | null = null;
    // Serialize requests: rapid actions cannot display the same gain twice.
    let queue = Promise.resolve();
    const refresh = () => {
      queue = queue
        .then(async () => {
          const response = await fetch("/api/resident-progress/summary", {
            cache: "no-store",
          });
          if (!response.ok || !active) return;
          const current: Summary = await response.json();
          if (!active) return;
          if (previous) {
            const messages: string[] = [];
            const gain = current.score - previous.score;
            if (gain > 0)
              messages.push(
                `+${gain} points · Merci de faire vivre Saint-Roch !`,
              );
            if (current.level.id !== previous.level.id)
              messages.push(`Nouveau niveau : ${current.level.label}`);
            const badges = current.badges.filter(
              (id) => !previous!.badges.includes(id),
            );
            for (const id of badges) {
              const badge = RESIDENT_BADGES.find((item) => item.id === id);
              if (badge)
                messages.push(`${badge.emoji} Badge débloqué : ${badge.label}`);
            }
            if (messages.length) toast(messages.join(" · "));
          }
          previous = current;
        })
        .catch(() => {
          /* A notification failure never prevents a contribution. */
        });
    };
    refresh();
    window.addEventListener(RESIDENT_PROGRESS_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener(RESIDENT_PROGRESS_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [userId, accountType]);
  return null;
}
