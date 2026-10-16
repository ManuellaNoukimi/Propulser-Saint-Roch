"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, Check, Inbox, MailOpen, MessageSquare, Plus, Sparkles, Store, Users, X } from "lucide-react";
import { CONTRIBUTIONS, actorTypeOf, businessPostTypeOf, isEstablishment, sectorOf } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { confirmRegistration } from "@/lib/registration-confirmation";
import type { Invitation, PublicUser } from "@/lib/types";
import { AuthPrompt } from "./AuthPrompt";
import { Avatar } from "./Avatar";
import { ContactSheet } from "./ContactSheet";

// Tableau de bord d'un commerce, d'une entreprise ou d'un organisme : chiffres de la semaine, invitations reçues,
// messages, acteurs « dans ton secteur » et « complices possibles » avec « Contacter ».

type Actor = PublicUser & { activities: number; posts: number; complices: number; reason?: string };
type Dashboard = {
  stats: { publicationsWeek: number; publicationsTotal: number; complicesWeek: number; complicesTotal: number; pendingInvitations: number; messagesWeek: number; unreadMessages: number };
  recent: { id: string; title: string; space: "activite" | "entreprise"; postType: string | null; startsAt: string | null; createdAt: string }[];
  sameSector: Actor[];
  possibles: Actor[];
};
type Message = { id: string; with: PublicUser; message: string; createdAt: string; read: boolean };

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `il y a ${Math.max(1, m)} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j`;
};

export function BusinessDashboard() {
  const { user, loading } = useSession();
  const [data, setData] = useState<Dashboard | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState(false);
  const [contact, setContact] = useState<{ id: string; displayName: string } | null>(null);
  const [answering, setAnswering] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [d, inv, msg] = await Promise.all([
      fetch("/api/tableau", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/invitations", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { received: [] })),
      fetch("/api/contacts", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { received: [] })),
    ]).catch(() => { setError(true); return [null, null, null] as const; });
    if (!d) return;
    setData(d as Dashboard);
    // Seulement les invitations venant d'une entreprise : un compte entreprise ne voit pas les activités des résident·e·s (16 oct., Danny)
    setInvitations((inv as { received: Invitation[] }).received.filter((i) => isEstablishment(i.from.accountType)));
    setMessages((msg as { received: Message[] }).received);
    if ((msg as { unread?: number }).unread) void fetch("/api/contacts/lu", { method: "POST" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user || !isEstablishment(user.accountType)) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [user, load]);

  if (loading) return <p className="p-10 text-center text-muted">Chargement…</p>;
  if (!user) return <AuthPrompt title="Ton tableau de bord" text="Connecte-toi avec ton compte Entreprise pour voir tes chiffres, tes invitations et tes messages." next="/entreprises/tableau" />;
  if (!isEstablishment(user.accountType))
    return (
      <div className="mx-auto my-12 max-w-sm px-6 text-center">
        <Store size={36} className="mx-auto text-muted" />
        <h1 className="mt-4 text-lg font-semibold">Réservé aux comptes Entreprise</h1>
        <p className="mt-2 text-sm text-muted">Le tableau de bord sert aux commerces, entreprises et organismes.</p>
        <Link href="/annuaire" className="ig-btn mt-6 inline-flex">Voir l&apos;annuaire</Link>
      </div>
    );
  if (error) return <p role="alert" className="p-10 text-center text-muted">Impossible de charger ton tableau de bord. Réessaie.</p>;
  if (!data) return <div className="mx-auto max-w-[1200px] space-y-3 px-4 py-8">{[0, 1, 2].map((k) => <div key={k} className="h-28 animate-pulse rounded-xl bg-hov" />)}</div>;

  async function answer(inv: Invitation, accept: boolean) {
    setAnswering(inv.id);
    const r = await fetch(`/api/invitations/${inv.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accept }) }).catch(() => null);
    setAnswering(null);
    if (!r?.ok) return toast("Réponse impossible. Réessaie.");
    if (accept) confirmRegistration(inv.idea.title);
    else toast("Réponse envoyée");
    await load();
  }

  const s = data.stats;
  const tiles = [
    { n: s.publicationsWeek, label: "publications cette semaine", icon: Sparkles },
    { n: s.complicesWeek, label: "nouveaux complices cette semaine", icon: Users },
    { n: invitations.filter((i) => i.status === "pending").length, label: "invitations en attente", icon: Inbox },
    { n: s.messagesWeek, label: "messages reçus cette semaine", icon: MessageSquare },
    { n: s.complicesTotal, label: "complices au total", icon: Check },
  ];
  const pending = invitations.filter((i) => i.status === "pending");
  const answered = invitations.filter((i) => i.status !== "pending").slice(0, 3);

  return (
    <div className="mx-auto max-w-[1200px] space-y-7 px-4 py-6 md:px-7 md:py-10">
      <header className="gallery-intro rounded-2xl border border-line px-6 py-7 md:px-8">
        <p className="text-sm font-medium text-muted">{actorTypeOf(user.accountType)?.label}{sectorOf(user.sector) ? ` · ${sectorOf(user.sector)!.label}` : ""}</p>
        <h1 className="mt-1 text-[28px] font-bold leading-tight md:text-[36px]">Bonjour, <span className="text-ig-blue">{user.displayName}</span></h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Ta semaine à Saint-Roch : ce que tes publications ont donné, qui t&apos;invite, qui t&apos;écrit, et avec qui faire équipe.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/entreprises/publier" className="ig-btn"><Plus size={16} /> Publier en 1 minute</Link>
          <Link href="/lancer" className="ig-btn-secondary"><Sparkles size={16} /> Lancer une activité</Link>
          <Link href={`/u/${user.id}`} className="ig-btn-secondary">Ma page</Link>
        </div>
      </header>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map(({ n, label, icon: Icon }) => (
          <li key={label} className="surface-card p-4">
            <Icon size={18} className="text-ig-blue" />
            <p className="mt-2 text-2xl font-bold tabular-nums">{n}</p>
            <p className="mt-0.5 text-xs text-muted">{label}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="flex items-center gap-2 font-bold"><Inbox size={18} className="text-ig-blue" /> Invitations reçues {pending.length > 0 && <span className="rounded-md bg-ig-red px-1.5 text-xs font-bold text-white">{pending.length}</span>}</h2>
          {pending.length === 0 && answered.length === 0 && <p className="mt-3 text-sm text-muted">Aucune invitation pour l&apos;instant. Quand une entreprise du quartier lance une activité et pense à toi, elle arrive ici.</p>}
          <ul className="mt-3 space-y-3">
            {pending.map((inv) => (
              <li key={inv.id} className="rounded-xl border border-line p-3">
                <p className="text-sm"><span className="font-semibold">{inv.from.displayName}</span> t&apos;invite à <Link href={`/p/${inv.idea.id}`} className="font-semibold text-ig-blue hover:underline">{inv.idea.title}</Link></p>
                <p className="mt-0.5 text-xs text-muted">{CONTRIBUTIONS.find((c) => c.id === inv.contribution)?.label ?? inv.contribution}{inv.idea.startsAt ? ` · ${formatDate(inv.idea.startsAt)}` : ""}</p>
                {inv.reason && <p className="mt-1.5 text-xs italic text-muted">« {inv.reason} »</p>}
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={answering === inv.id} onClick={() => void answer(inv, true)} className="ig-btn min-h-9 flex-1 px-3 py-1.5 text-xs"><Check size={14} /> Je suis complice</button>
                  <button type="button" disabled={answering === inv.id} onClick={() => void answer(inv, false)} className="ig-btn-secondary min-h-9 flex-1 px-3 py-1.5 text-xs"><X size={14} /> Pas cette fois</button>
                </div>
              </li>
            ))}
            {answered.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-2 text-sm text-muted">
                <span className="min-w-0 truncate">{inv.idea.title}</span>
                <span className="shrink-0 text-xs">{inv.status === "accepted" ? "✓ Complice" : "Refusée"}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-card p-5">
          <h2 className="flex items-center gap-2 font-bold"><MailOpen size={18} className="text-ig-blue" /> Messages reçus {s.unreadMessages > 0 && <span className="rounded-md bg-ig-red px-1.5 text-xs font-bold text-white">{s.unreadMessages} nouveau{s.unreadMessages > 1 ? "x" : ""}</span>}</h2>
          {messages.length === 0 && <p className="mt-3 text-sm text-muted">Aucun message. Les gens du quartier peuvent te contacter depuis l&apos;annuaire ou ta page.</p>}
          <ul className="mt-3 space-y-3">
            {messages.slice(0, 6).map((m) => (
              <li key={m.id} className={`rounded-xl border p-3 ${m.read ? "border-line" : "border-ig-blue/40 bg-ig-blue/5"}`}>
                <div className="flex items-center gap-2">
                  <Avatar user={m.with} size={26} />
                  {isEstablishment(m.with.accountType) ? <Link href={`/u/${m.with.id}`} className="min-w-0 truncate text-sm font-semibold hover:text-ig-blue">{m.with.displayName}</Link> : <span className="min-w-0 truncate text-sm font-semibold">{m.with.displayName}</span>}
                  <span className="ml-auto shrink-0 text-xs text-muted">{ago(m.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm">{m.message}</p>
                <button type="button" onClick={() => setContact({ id: m.with.id, displayName: m.with.displayName })} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ig-blue"><MessageSquare size={13} /> Répondre</button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="-mb-3 text-sm"><Link href="/entreprises/collaborer" className="font-semibold text-ig-blue">Trouver les entreprises qui font comme toi →</Link></p>
      <ActorList title="Complices possibles" subtitle="Des acteurs du quartier avec qui faire quelque chose ensemble." actors={data.possibles} onContact={setContact} withReason empty="Personne à suggérer pour l'instant : l'annuaire se remplit à mesure que les commerces et organismes s'inscrivent." />
      <ActorList title={user.sector ? `Dans ton secteur · ${sectorOf(user.sector)?.label}` : "Dans ton secteur"} subtitle="Les autres acteurs qui font la même chose que toi." actors={data.sameSector} onContact={setContact} empty="Aucun autre acteur de ton secteur sur Complices pour l'instant." />

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Mes dernières publications</h2>
          <Link href={`/u/${user.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-ig-blue">Tout voir <ArrowRight size={14} /></Link>
        </div>
        {data.recent.length === 0 ? (
          <p className="surface-card p-6 text-center text-sm text-muted">Tu n&apos;as encore rien publié. <Link href="/entreprises/publier" className="font-semibold text-ig-blue">Publie ta première promo</Link>.</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {data.recent.map((p) => (
              <li key={p.id}>
                <Link href={`/p/${p.id}`} className="surface-card flex items-center gap-3 p-3 transition hover:bg-soft">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-soft text-ig-blue">{p.space === "activite" ? <CalendarDays size={17} /> : <Store size={17} />}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{p.title}</span>
                    <span className="block text-xs text-muted">{p.space === "activite" ? `Activité${p.startsAt ? ` · ${formatDate(p.startsAt)}` : ""}` : businessPostTypeOf(p.postType)?.label ?? "Publication"} · {ago(p.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-muted"><BookOpen size={14} className="mr-1 inline" /> Tous les acteurs du quartier sont dans <Link href="/annuaire" className="font-semibold text-ig-blue">l&apos;annuaire</Link>.</p>
      {contact && <ContactSheet to={contact} open onClose={() => setContact(null)} />}
    </div>
  );
}

function ActorList({ title, subtitle, actors, onContact, withReason = false, empty }: {
  title: string; subtitle: string; actors: Actor[]; onContact: (a: { id: string; displayName: string }) => void; withReason?: boolean; empty: string;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mb-3 text-sm text-muted">{subtitle}</p>
      {actors.length === 0 ? (
        <p className="surface-card p-6 text-center text-sm text-muted">{empty}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {actors.map((a) => (
            <li key={a.id} className="surface-card flex flex-col p-4">
              <div className="flex items-start gap-3">
                <Avatar user={a} size={40} />
                <div className="min-w-0">
                  <Link href={`/u/${a.id}`} className="block truncate font-semibold hover:text-ig-blue">{a.displayName}</Link>
                  <p className="truncate text-xs text-muted">{actorTypeOf(a.accountType)?.label}{sectorOf(a.sector) ? ` · ${sectorOf(a.sector)!.label}` : ""}</p>
                </div>
              </div>
              {withReason && a.reason ? <p className="mt-3 text-sm">{a.reason}</p> : a.description && <p className="mt-3 line-clamp-2 text-sm">{a.description}</p>}
              <div className="mt-auto flex gap-2 pt-4">
                <Link href={`/u/${a.id}`} className="ig-btn-secondary min-h-9 flex-1 px-3 py-1.5 text-xs">Voir la page</Link>
                <button type="button" onClick={() => onContact({ id: a.id, displayName: a.displayName })} className="ig-btn min-h-9 flex-1 px-3 py-1.5 text-xs"><MessageSquare size={14} /> Contacter</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
