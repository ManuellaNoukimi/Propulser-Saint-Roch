"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Check, Clock, LoaderCircle, MapPin, Send, Sparkles, UserPlus, X } from "lucide-react";
import { actorTypeOf, categoryOf, contributionOf, needOf, sectorOf } from "@/lib/constants";
import { formatDate, timeAgo } from "@/lib/format";
import { loginHref, useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import type { IdeaWithComplices, Invitation } from "@/lib/types";
import { Avatar } from "./Avatar";
import { BadgeChips } from "./BadgeChips";
import { JoinSheet } from "./JoinSheet";
import { PostMedia } from "./PostMedia";
import { ProfileLink } from "./ProfileLink";
import { usePostActions } from "./usePostActions";

export function PostDetail({ id }: { id: string }) {
  const { user } = useSession();
  const [idea, setIdea] = useState<IdeaWithComplices | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/ideas/${id}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setIdea(d.idea);
      })
      .catch((e) => setError(e instanceof Error && e.message ? e.message : "Chargement impossible."));
  }, [id]);

  useEffect(load, [load, user?.id]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-xl font-bold">Cette idée n&apos;est pas disponible.</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <Link href="/" className="ig-btn mt-6 text-sm">Retour à l&apos;accueil</Link>
      </div>
    );
  }
  if (!idea) return <DetailSkeleton />;
  return <PostDetailView idea={idea} reload={load} />;
}

const STATUS = {
  pending: { label: "En attente", className: "bg-soft text-muted", icon: Clock },
  accepted: { label: "Complice !", className: "bg-ig-green/15 text-[#2f8a12]", icon: Check },
  declined: { label: "Pas cette fois", className: "bg-sep text-muted", icon: X },
} as const;

function PostDetailView({ idea, reload }: { idea: IdeaWithComplices; reload: () => void }) {
  const router = useRouter();
  const { user, refresh } = useSession();
  const { share } = usePostActions(idea);
  const [joinOpen, setJoinOpen] = useState(false);
  const org = idea.organizer;
  const cat = categoryOf(idea.category);
  const helpers = idea.complices.filter((c) => c.contribution !== "participer");
  const participants = idea.complices.filter((c) => c.contribution === "participer");
  const accepted = idea.invitations.filter((i) => i.status === "accepted").length;

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-5 md:px-7 md:py-8">
      <button type="button" onClick={() => router.back()} className="mb-4 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft size={18} /> Retour
      </button>

      {idea.myInvitation && <InvitationBanner invitation={idea.myInvitation} onAnswered={() => { reload(); refresh(); }} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <div className="overflow-hidden rounded-3xl border border-line bg-bg p-2.5 lg:sticky lg:top-6">
          <PostMedia idea={idea} aspect="landscape" rounded />
        </div>

        <div className="space-y-5">
          <section className="surface-card p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-soft px-2.5 py-1 text-[11px] font-semibold">{cat?.emoji} {cat?.label}</span>
              {idea.isMine && <span className="rounded-md bg-ig-blue/10 px-2.5 py-1 text-[11px] font-semibold text-ig-blue">Ton idée</span>}
              <span className="ml-auto text-[11px] text-muted">{timeAgo(idea.createdAt, true)}</span>
            </div>
            <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-tight md:text-[30px]">{idea.title}</h1>
            {idea.description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{idea.description}</p>}

            <div className="mt-5 space-y-2 text-sm">
              <p className="flex items-center gap-2.5"><CalendarDays size={17} className="shrink-0 text-ig-blue" /> {formatDate(idea.startsAt)}</p>
              <p className="flex items-center gap-2.5"><MapPin size={17} className="shrink-0 text-ig-blue" /> {idea.place}</p>
            </div>
            {idea.needs.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted">On cherche</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {idea.needs.map((n) => <span key={n} className="rounded-full border border-line px-3 py-1.5 text-xs">{needOf(n)?.emoji} {needOf(n)?.label}</span>)}
                </div>
              </div>
            )}

            <ProfileLink user={org} className="mt-5 flex items-center gap-3 rounded-2xl bg-soft p-3 transition hover:bg-hov">
              <Avatar user={org} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{org.displayName}</span>
                <span className="block truncate text-xs text-muted">{sectorOf(org.sector)?.label ?? actorTypeOf(org.accountType)?.label}</span>
              </span>
              <BadgeChips badges={idea.organizerBadges.slice(0, 2)} />
            </ProfileLink>

            <div className="mt-5 flex gap-2">
              {idea.isMine ? (
                <Link href="/lancer" className="ig-btn min-h-11 flex-1 text-sm"><UserPlus size={17} /> Trouver d&apos;autres complices</Link>
              ) : (
                <button type="button" onClick={() => (user ? setJoinOpen(true) : router.push(loginHref()))} className="ig-btn min-h-11 flex-1 text-sm">Je me propose</button>
              )}
              <button type="button" onClick={share} aria-label="Partager cette idée" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line text-muted transition hover:bg-soft hover:text-fg"><Send size={18} /></button>
            </div>
          </section>

          {idea.isMine && idea.invitations.length > 0 && (
            <section className="surface-card p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Tes invitations</h2>
                <span className="text-xs text-muted">{accepted} / {idea.invitations.length} ont dit oui</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-sep">
                <div className="h-full rounded-full bg-ig-blue transition-all duration-700" style={{ width: `${(accepted / idea.invitations.length) * 100}%` }} />
              </div>
              <ul className="mt-4 space-y-2.5">
                {idea.invitations.map((i) => {
                  const s = STATUS[i.status];
                  return (
                    <li key={i.id} className="flex items-center gap-3">
                      <Avatar user={i.to} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{i.to.displayName}</span>
                        <span className="block truncate text-xs text-muted">{contributionOf(i.contribution)?.emoji} {contributionOf(i.contribution)?.label}</span>
                      </span>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.className}`}><s.icon size={12} /> {s.label}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-xs text-muted">Les réponses arrivent en direct : garde cette page ouverte.</p>
            </section>
          )}

          <section id="complices" className="surface-card p-5 md:p-6">
            <h2 className="text-lg font-bold">🤝 {idea.complices.length} complice{idea.complices.length > 1 ? "s" : ""}</h2>
            {idea.complices.length === 0 && <p className="mt-2 text-sm text-muted">Sois le premier ou la première, et gagne le badge ⭐ Premier complice !</p>}
            {[{ t: "Aident", list: helpers }, { t: "Participent", list: participants }].map(
              (g) =>
                g.list.length > 0 && (
                  <div key={g.t} className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted">{g.t}</p>
                    <ul className="mt-2.5 space-y-3">
                      {g.list.map((c) => (
                        <li key={c.id} className="flex gap-3">
                          <ProfileLink user={c.user}><Avatar user={c.user} size={34} /></ProfileLink>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-tight">
                              <ProfileLink user={c.user} className="font-semibold">{c.user.displayName}</ProfileLink>{" "}
                              <span className="text-muted">· {contributionOf(c.contribution)?.emoji} {contributionOf(c.contribution)?.label}</span>
                            </p>
                            {c.message && <p className="mt-0.5 text-sm text-muted">{c.message}</p>}
                            <div className="mt-1"><BadgeChips badges={c.badges} /></div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
            )}
          </section>
        </div>
      </div>

      <JoinSheet ideaId={idea.id} title={idea.title} needs={idea.needs} open={joinOpen} onClose={() => setJoinOpen(false)}
        onJoined={() => { reload(); refresh(); }} />
      {idea.isMine && idea.invitations.some((i) => i.status === "pending") && <LiveReload onTick={reload} />}
    </div>
  );
}

/** Rafraîchit la page toutes les 5 s tant que des invitations attendent une réponse (effet « en direct »). */
function LiveReload({ onTick }: { onTick: () => void }) {
  useEffect(() => {
    const t = setInterval(onTick, 5000);
    return () => clearInterval(t);
  }, [onTick]);
  return null;
}

/** « Tu es invité·e à… » [Je suis complice] [Pas cette fois] */
export function InvitationBanner({ invitation, onAnswered }: { invitation: Invitation; onAnswered: () => void }) {
  const [sending, setSending] = useState<"oui" | "non" | null>(null);
  const c = contributionOf(invitation.contribution);

  async function answer(accept: boolean) {
    setSending(accept ? "oui" : "non");
    const res = await fetch(`/api/invitations/${invitation.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    }).catch(() => null);
    setSending(null);
    if (!res?.ok) return toast("Réponse non envoyée. Réessaie.");
    toast(accept ? "🎉 Tu es maintenant complice !" : "Merci d'avoir répondu");
    onAnswered();
  }

  if (invitation.status !== "pending") {
    return (
      <p className="mb-5 rounded-2xl border border-line bg-bg px-4 py-3 text-sm">
        {invitation.status === "accepted" ? "✅ Tu as accepté d'être complice de cette idée." : "Tu as répondu « Pas cette fois » à cette invitation."}
      </p>
    );
  }
  return (
    <section className="invite-glow mb-6 overflow-hidden rounded-3xl border border-ig-blue/30 bg-bg p-5 md:p-6">
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-ig-blue"><Sparkles size={13} /> Invitation</p>
      <div className="mt-3 flex items-start gap-3">
        <Avatar user={invitation.from} size={42} />
        <p className="text-[15px] leading-snug">
          <span className="font-semibold">{invitation.from.displayName}</span> t&apos;invite à être complice de{" "}
          <span className="font-semibold">« {invitation.idea.title} »</span>
          {c && <> pour <span className="font-semibold">{c.emoji} {c.label.toLowerCase()}</span></>}.
        </p>
      </div>
      {invitation.reason && <p className="mt-3 rounded-xl bg-soft px-3 py-2 text-sm text-muted">Pourquoi toi : {invitation.reason}</p>}
      <div className="mt-4 flex gap-2">
        <button type="button" disabled={!!sending} onClick={() => answer(true)} className="ig-btn min-h-11 flex-1 text-sm">
          {sending === "oui" ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={17} />} Je suis complice
        </button>
        <button type="button" disabled={!!sending} onClick={() => answer(false)} className="ig-btn-secondary min-h-11 flex-1 text-sm">
          {sending === "non" && <LoaderCircle size={16} className="animate-spin" />} Pas cette fois
        </button>
      </div>
    </section>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1100px] animate-pulse px-4 py-5 md:px-7 md:py-8">
      <div className="mb-4 h-5 w-20 rounded bg-hov" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="aspect-[5/4] rounded-3xl bg-hov" />
        <div className="space-y-3 rounded-3xl border border-line bg-bg p-6">
          <div className="h-4 w-24 rounded bg-hov" />
          <div className="h-7 w-3/4 rounded bg-hov" />
          <div className="h-3 w-full rounded bg-hov" />
          <div className="h-3 w-2/3 rounded bg-hov" />
          <div className="h-11 rounded-xl bg-hov" />
        </div>
      </div>
    </div>
  );
}
