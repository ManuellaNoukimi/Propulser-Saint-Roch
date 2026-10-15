"use client";

import { useSession } from "@/lib/session";
import type { Idea } from "@/lib/types";
import { PostCard } from "./PostCard";

/** Galerie commune : 3 cartes sur ordinateur, 2 sur tablette et 1 sur mobile. */
export function PostGrid({ ideas }: { ideas: Idea[] }) {
  const { user } = useSession();
  return (
    <ul className="idea-grid" aria-label="Galerie des idées">
      {ideas.map((idea) => (
        <li key={`${user?.id ?? "visiteur"}-${idea.id}`} className="min-w-0">
          <PostCard idea={idea} />
        </li>
      ))}
    </ul>
  );
}
