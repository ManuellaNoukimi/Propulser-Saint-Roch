"use client";

import { useRef, useState } from "react";
import type { Idea } from "@/lib/types";
import { IdeaPoster } from "./IdeaPoster";

// Média d'une publication : carrousel de photos (glisser) ou « publication texte » en dégradé.
export function PostMedia({ idea, rounded = false, aspect = "square" }: { idea: Pick<Idea, "images" | "category" | "title">; rounded?: boolean; aspect?: "square" | "landscape" }) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  const go = (k: number) => track.current?.scrollTo({ left: k * track.current.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });

  return (
    <div className={`relative w-full overflow-hidden bg-soft select-none ${aspect === "landscape" ? "aspect-[5/4]" : "aspect-square"} ${rounded ? "rounded-xl" : ""}`}>
      {idea.images.length > 0 ? (
        <div
          ref={track}
          className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        >
          {idea.images.map((src, k) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt={`${idea.title} — photo ${k + 1}`} loading="lazy" draggable={false} className="h-full w-full shrink-0 snap-center object-cover" />
          ))}
        </div>
      ) : (
        <IdeaPoster idea={idea} />
      )}

      {/* Points du carrousel et flèches (ordinateur) */}
      {idea.images.length > 1 && (
        <>
          <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1">
            {idea.images.map((src, k) => (
            <span key={src} className={`h-1.5 rounded-full transition-all ${k === index ? "w-4 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            {index + 1}/{idea.images.length}
          </span>
          {index > 0 && (
            <button type="button" aria-label="Photo précédente" onClick={(e) => { e.stopPropagation(); go(index - 1); }}
              className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-2xl text-black shadow">‹</button>
          )}
          {index < idea.images.length - 1 && (
            <button type="button" aria-label="Photo suivante" onClick={(e) => { e.stopPropagation(); go(index + 1); }}
              className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-2xl text-black shadow">›</button>
          )}
        </>
      )}

    </div>
  );
}
