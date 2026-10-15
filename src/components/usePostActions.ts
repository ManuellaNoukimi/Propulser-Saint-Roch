"use client";

import { toast } from "@/lib/toast";
import type { Idea } from "@/lib/types";

/** Partager une publication (partage natif du téléphone, sinon copie du lien). */
export function usePostActions(idea: Pick<Idea, "id" | "title">) {
  async function share() {
    const url = `${window.location.origin}/p/${idea.id}`;
    try {
      if (navigator.share) await navigator.share({ title: idea.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Lien copié dans le presse-papiers");
      }
    } catch {
      /* partage annulé */
    }
  }
  return { share };
}
