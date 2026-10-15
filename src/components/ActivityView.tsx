"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, Check, Clock, Inbox, Send, Sparkles, X } from "lucide-react";
import { contributionOf } from "@/lib/constants";
import { formatDate, timeAgo } from "@/lib/format";
import { refreshInvites } from "@/lib/invites";
import { useSession } from "@/lib/session";
import type { Invitation } from "@/lib/types";
import { AuthPrompt } from "./AuthPrompt";
import { Avatar } from "./Avatar";
import { InvitationBanner } from "./PostDetail";

const STATUS = {
  pending: { label: "En attente", className: "bg-soft text-muted", icon: Clock },
  accepted: { label: "Complice !", className: "bg-ig-green/15 text-[#2f8a12]", icon: Check },
  declined: { label: "Pas cette fois", className: "bg-sep text-muted", icon: X },
} as const;

/** Activité : les invitations reçues (j'y réponds en un toucher) et les réponses à celles que j'ai envoyées. */
export function ActivityView() {
  const { user, loading } = useSession();
  const [data, setData] = useState<{ received: Invitation[]; sent: Invitation[] } | null>(null);
  const [tab, setTab] = useState<"recues" | "envoyees">("recues");

  const load = useCallback(() => {
    fetch("/api/invitations", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { received: [], sent: [] }))
      .then((d) => setData({ received: d.received, sent: d.sent }))
      .catch(() => setData({ received: [], sent: [] }));
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 6000); // les réponses arrivent en direct
    return () => clearInterval(t);
  }, [user, load]);

  if (loading) return <div className="p-10 text-center text-muted">Chargement…</div>;
  if (!user) return <AuthPrompt title="Tes invitations" text="Connecte-toi (un prénom suffit) pour voir les idées où l'on t'invite comme complice." next="/activite" />;

  const pending = data?.received.filter((i) => i.status === "pending") ?? [];
  const answered = data?.received.filter((i) => i.status !== "pending") ?? [];
  const byIdea = new Map<string, Invitation[]>();
  for (const i of data?.sent ?? []) byIdea.set(i.idea.id, [...(byIdea.get(i.idea.id) ?? []), i]);

  return (
    <div className="mx-auto max-w-[760px] px-4 py-5 md:px-7 md:py-8">
      <header className="mb-6">
        <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-muted"><Bell size={12} /> Activité</p>
        <h1 className="text-[28px] font-bold tracking-tight">Tes invitations<span className="text-ig-blue">.</span></h1>
        <p className="mt-1 text-sm text-muted">Quand quelqu&apos;un lance une idée, Complices invite les bonnes personnes. Réponds en un toucher.</p>
      </header>

      <div role="tablist" aria-label="Invitations" className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-sep p-1">
        {([["recues", `Reçues${pending.length ? ` (${pending.length})` : ""}`, Inbox], ["envoyees", "Envoyées", Send]] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`flex min-h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${tab === id ? "bg-bg shadow-sm" : "text-muted"}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {!data && <div className="space-y-3">{[0, 1].map((k) => <div key={k} className="h-40 animate-pulse rounded-3xl bg-hov" />)}</div>}

      {data && tab === "recues" && (
        <div className="animate-fade-in space-y-4">
          {pending.length === 0 && answered.length === 0 && (
            <Empty icon="📭" title="Aucune invitation pour l'instant" text="Quand une idée aura besoin de toi, elle apparaîtra ici (avec une notification)." />
          )}
          {pending.map((i) => (
            <div key={i.id}>
              <InvitationBanner invitation={i} onAnswered={() => { load(); refreshInvites(); }} />
              <Link href={`/p/${i.idea.id}`} className="-mt-3 mb-2 block px-2 text-xs font-semibold text-ig-blue">Voir l&apos;idée · {formatDate(i.idea.startsAt)} · {i.idea.place}</Link>
            </div>
          ))}
          {answered.length > 0 && (
            <section className="surface-card p-5">
              <h2 className="text-sm font-bold text-muted">Déjà répondu</h2>
              <ul className="mt-3 divide-y divide-sep">
                {answered.map((i) => <InviteRow key={i.id} i={i} who={i.from} />)}
              </ul>
            </section>
          )}
        </div>
      )}

      {data && tab === "envoyees" && (
        <div className="animate-fade-in space-y-4">
          {byIdea.size === 0 && (
            <Empty icon="💡" title="Tu n'as encore invité personne" text="Lance une idée : Complices te propose les bons complices à inviter." cta />
          )}
          {[...byIdea.entries()].map(([ideaId, list]) => {
            const yes = list.filter((i) => i.status === "accepted").length;
            return (
              <section key={ideaId} className="surface-card p-5">
                <Link href={`/p/${ideaId}`} className="font-bold hover:text-ig-blue">{list[0].idea.title}</Link>
                <p className="mt-0.5 text-xs text-muted">{yes} / {list.length} ont dit oui</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-sep"><div className="h-full rounded-full bg-ig-blue transition-all duration-700" style={{ width: `${(yes / list.length) * 100}%` }} /></div>
                <ul className="mt-3 divide-y divide-sep">{list.map((i) => <InviteRow key={i.id} i={i} who={i.to} />)}</ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InviteRow({ i, who }: { i: Invitation; who: Invitation["from"] }) {
  const s = STATUS[i.status];
  const c = contributionOf(i.contribution);
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar user={who} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{who.displayName}</span>
        <span className="block truncate text-xs text-muted">{c?.emoji} {c?.label} · {timeAgo(i.createdAt)}</span>
      </span>
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.className}`}><s.icon size={12} /> {s.label}</span>
    </li>
  );
}

function Empty({ icon, title, text, cta = false }: { icon: string; title: string; text: string; cta?: boolean }) {
  return (
    <div className="surface-card px-6 py-12 text-center">
      <p className="text-4xl">{icon}</p>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted">{text}</p>
      {cta && <Link href="/lancer" className="ig-btn mt-5 text-sm"><Sparkles size={16} /> Lancer une idée</Link>}
    </div>
  );
}
