"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { CATEGORIES, categoryOf } from "@/lib/constants";
import { dateParts } from "@/lib/format";
import { loginHref, useSession } from "@/lib/session";
import type { Idea } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Chips } from "./Chips";
import { JoinSheet } from "./JoinSheet";
import { useIdeas } from "./useIdeas";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function groupOf(iso: string): string {
  const diff = Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / 86_400_000);
  if (diff < 0) return "Passés";
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  if (diff < 7) return "Cette semaine";
  if (diff < 31) return "Ce mois-ci";
  return "Plus tard";
}
const ORDER = ["Aujourd'hui", "Demain", "Cette semaine", "Ce mois-ci", "Plus tard", "Passés"];

// Onglet Événements : toutes les publications datées, groupées par jour, avec « Je me propose ».
export function EventsView() {
  const { ideas, error } = useIdeas();
  const [category, setCategory] = useState("toutes");
  const [showPast, setShowPast] = useState(false);

  const groups = useMemo(() => {
    const dated = (ideas ?? [])
      .filter((i) => i.startsAt && (category === "toutes" || i.category === category))
      .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime());
    const map = new Map<string, Idea[]>();
    for (const i of dated) {
      const g = groupOf(i.startsAt!);
      if (g === "Passés" && !showPast) continue;
      map.set(g, [...(map.get(g) ?? []), i]);
    }
    return ORDER.filter((g) => map.has(g)).map((g) => ({ title: g, items: map.get(g)! }));
  }, [ideas, category, showPast]);

  return (
    <div className="mx-auto max-w-[700px] space-y-5 pb-6 pt-5 md:px-6 md:pt-9">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-0">
        <div><p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-muted"><CalendarDays size={12} /> On se retrouve ?</p><h1 className="text-[28px] font-bold tracking-tight">L&apos;agenda du quartier<span className="text-ig-blue">.</span></h1><p className="mt-1 text-sm text-muted">Des occasions de sortir et de se rencontrer.</p></div>
        <button type="button" aria-pressed={showPast} onClick={() => setShowPast((v) => !v)} className="ig-btn-secondary text-xs">
          {showPast ? "Masquer les passés" : "Événements passés"}
        </button>
      </div>
      <Chips label="Catégorie" value={category} onChange={setCategory}
        options={[{ id: "toutes", label: "Tout" }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, emoji: c.emoji }))]} />

      {error && <p className="p-6 text-center text-muted">Impossible de charger les événements.</p>}
      {!ideas && !error && (
        <div className="space-y-3 px-4">{[0, 1, 2].map((k) => <div key={k} className="h-24 animate-pulse rounded-xl bg-hov" />)}</div>
      )}
      {ideas && groups.length === 0 && (
        <div className="p-10 text-center">
          <p className="text-4xl">📅</p>
          <p className="mt-2 font-semibold">Aucun événement à venir.</p>
          <Link href="/creer" className="ig-btn mt-4 inline-block">Créer un événement</Link>
        </div>
      )}
      {groups.map((g) => (
        <section key={g.title} className="px-4 md:px-0">
          <h2 className="flex items-center gap-3 pb-3 pt-3 text-sm font-bold">{g.title}<span className="h-px flex-1 bg-line" /><span className="text-[10px] font-medium tabular-nums text-muted">{g.items.length}</span></h2>
          <ul className="space-y-3">
            {g.items.map((i) => <EventRow key={i.id} idea={i} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EventRow({ idea }: { idea: Idea }) {
  const router = useRouter();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(idea.complicesCount);
  const p = dateParts(idea.startsAt!);
  return (
    <li className="flex gap-4 rounded-2xl border border-line bg-bg p-4 transition hover:border-muted/50">
      <Link href={`/p/${idea.id}`} aria-label={`Le ${p.day} ${p.month}, ${idea.title}`} className="flex h-[72px] w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-soft text-center leading-none">
        <span className="text-[10px] font-bold text-ig-red">{p.month}</span>
        <span className="mt-1.5 text-[28px] font-bold">{p.day}</span>
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/p/${idea.id}`} className="block font-semibold leading-snug hover:opacity-70">
          {categoryOf(idea.category)?.emoji} {idea.title}
        </Link>
        <p className="mt-0.5 text-sm text-muted">{p.weekday} · {p.time}</p>
        <p className="flex items-center gap-1 truncate text-sm text-muted"><MapPin size={13} /> {idea.place}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-xs">
            <Avatar user={idea.organizer} size={20} />
            <span className="truncate">{idea.organizer.displayName}</span>
            <span className="shrink-0 text-muted">· 🤝 {count}</span>
          </span>
          <button type="button" onClick={() => (user ? setOpen(true) : router.push(loginHref()))} className="ig-btn shrink-0 px-3 py-1 text-xs">
            Je me propose
          </button>
        </div>
      </div>
      <JoinSheet ideaId={idea.id} title={idea.title} needs={idea.needs} open={open} onClose={() => setOpen(false)} onJoined={() => setCount((n) => n + 1)} />
    </li>
  );
}
