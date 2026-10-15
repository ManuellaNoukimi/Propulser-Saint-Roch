"use client";

import { useSyncExternalStore } from "react";
import { toast } from "./toast";

// Invitations en attente (problème 1) : un seul sondage partagé par toute l'app, toutes les 6 secondes.
// Quand une nouvelle invitation arrive : notification à l'écran + vibration (sur Android).
type Latest = { id: string; ideaId: string; title: string; from: string; createdAt: string } | null;
type State = { pending: number; latest: Latest };

let state: State = { pending: 0, latest: null };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let lastNotified: string | null = null;
let first = true;

async function poll() {
  const d = (await fetch("/api/invitations/count", { cache: "no-store" }).then((r) => r.json()).catch(() => null)) as State | null;
  if (!d) return;
  if (d.latest && d.latest.id !== lastNotified) {
    if (!first) {
      toast(`📩 ${d.latest.from} t'invite : « ${d.latest.title} »`);
      navigator.vibrate?.([60, 40, 60]);
    }
    lastNotified = d.latest.id;
  }
  first = false;
  if (d.pending !== state.pending || d.latest?.id !== state.latest?.id) {
    state = d;
    listeners.forEach((l) => l());
  }
}

/** À appeler après avoir répondu à une invitation ou changé de compte. */
export function refreshInvites() {
  void poll();
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (!timer) {
    void poll();
    timer = setInterval(poll, 6000);
  }
  return () => {
    listeners.delete(l);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const SERVER: State = { pending: 0, latest: null };

export function usePendingInvites(): State {
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}
