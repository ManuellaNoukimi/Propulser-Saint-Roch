"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award, Grid3x3, MapPin, Settings, Users } from "lucide-react";
import { actorTypeOf, isEstablishment, sectorOf } from "@/lib/constants";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import type { PublicProfile } from "@/lib/types";
import { Avatar } from "./Avatar";
import { PostGrid } from "./PostGrid";

type Tab = "publications" | "complice" | "badges";

// Profil façon Instagram : avatar, statistiques, bio, « highlights » de badges, onglets et grille.
export function ProfileView({ id }: { id: string }) {
  const { user: me } = useSession();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("publications");

  useEffect(() => {
    fetch(`/api/users/${id}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setProfile(d);
      })
      .catch((e) => setError(e instanceof Error && e.message ? e.message : "Chargement impossible."));
  }, [id, me?.id]);

  if (error) return <p className="p-10 text-center font-semibold">{error}</p>;
  if (!profile)
    return (
      <div className="mx-auto max-w-[935px] animate-pulse p-6">
        <div className="flex items-center gap-8"><div className="h-24 w-24 rounded-full bg-hov" /><div className="h-4 w-40 rounded bg-hov" /></div>
      </div>
    );

  const { user, stats, badges, allBadges, ideas, joined, isMe } = profile;
  const earned = new Set(badges.map((b) => b.id));
  const type = actorTypeOf(user.accountType);
  const sector = sectorOf(user.sector);

  async function shareProfile() {
    const url = `${window.location.origin}/u/${user.id}`;
    try {
      if (navigator.share) await navigator.share({ title: user.displayName, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Lien du profil copié");
      }
    } catch {
      /* annulé */
    }
  }

  const bio = (
      <div className="space-y-0.5">
        <p className="font-semibold">{user.displayName}</p>
        <p className="text-muted">{type?.emoji} {type?.label}{sector ? ` · ${sector.emoji} ${sector.label}` : ""}</p>
        {user.description && <p className="whitespace-pre-line">{user.description}</p>}
        {isEstablishment(user.accountType) && user.address && (
          <p className="flex items-center gap-1 font-semibold text-ig-link"><MapPin size={14} /> {user.address}</p>
        )}
      </div>
    );

  const statItems = [
    { n: stats.launched, label: "publications" },
    { n: stats.joined, label: "complice de" },
    { n: badges.length, label: "badges" },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-6 md:px-7 md:pt-9">
      {/* En-tête */}
      <header className="flex items-start gap-5 px-4 pt-4 md:gap-20 md:px-10">
        <div className="shrink-0 md:pl-6">
          <span className="md:hidden"><Avatar user={user} size={77} /></span>
          <span className="hidden md:inline"><Avatar user={user} size={120} /></span>
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="mr-2 break-words text-xl font-semibold tracking-tight md:text-2xl">{user.displayName}</h1>
            {isMe ? (
              <>
                <Link href="/moi/modifier" className="ig-btn-secondary text-sm">Modifier le profil</Link>
                <Link href="/moi/modifier" aria-label="Paramètres" className="p-1"><Settings size={22} /></Link>
              </>
            ) : (
              <button type="button" onClick={shareProfile} className="ig-btn-secondary text-sm">Partager le profil</button>
            )}
          </div>
          <ul className="hidden gap-10 md:flex">
            {statItems.map((s) => (
              <li key={s.label}><span className="font-semibold">{s.n}</span> {s.label}</li>
            ))}
          </ul>
          <div className="hidden md:block">{bio}</div>
        </div>
      </header>
      <div className="px-4 pt-4 md:hidden">{bio}</div>

      {/* Statistiques (mobile) */}
      <ul className="mt-4 grid grid-cols-3 border-y border-sep py-3 text-center md:hidden">
        {statItems.map((s) => (
          <li key={s.label} className="leading-tight"><span className="block font-semibold">{s.n}</span><span className="text-muted">{s.label}</span></li>
        ))}
      </ul>

      {/* Cartes de badges du profil. */}
      <div className="grid grid-cols-2 gap-3 py-6 sm:grid-cols-3 lg:grid-cols-5">
        {allBadges.map((b) => {
          const on = earned.has(b.id);
          return (
            <div key={b.id} className={`flex min-w-0 items-center gap-3 rounded-xl border border-line bg-bg p-3 ${on ? "" : "opacity-55"}`} title={b.description}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-soft text-xl ${on ? "" : "grayscale"}`}>{b.emoji}</span>
              <span className="min-w-0"><span className={`block text-[11px] leading-tight ${on ? "font-semibold" : "text-muted"}`}>{b.label}</span><span className="mt-1 block text-[9px] text-muted">{on ? "Débloqué" : "À découvrir"}</span></span>
            </div>
          );
        })}
      </div>

      {/* Onglets */}
      <nav aria-label="Contenu du profil" className="mb-2 flex justify-around border-t border-line md:justify-center md:gap-14">
        {([
          { id: "publications", label: "Publications", icon: Grid3x3 },
          { id: "complice", label: "Complice de", icon: Users },
          { id: "badges", label: "Badges", icon: Award },
        ] as const).map(({ id: t, label, icon: Icon }) => (
          <button key={t} type="button" aria-label={label} aria-pressed={tab === t} onClick={() => setTab(t)}
            className={`-mt-px flex min-h-12 items-center gap-2 border-t-2 px-2 py-3 text-[10px] font-semibold transition md:text-xs ${tab === t ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg"}`}>
            <Icon size={17} /> <span>{label}</span>
          </button>
        ))}
      </nav>

      {tab === "publications" && (ideas.length ? <PostGrid ideas={ideas} /> : (
        <Empty title={isMe ? "Partage ta première idée" : "Aucune publication"} text={isMe ? "Quand tu publieras une idée, elle apparaîtra ici." : "Ce compte n'a encore rien publié."} cta={isMe ? { href: "/creer", label: "Publier une idée" } : undefined} />
      ))}
      {tab === "complice" && (joined.length ? <PostGrid ideas={joined} /> : (
        <Empty title="Pas encore complice" text={isMe ? "Propose ton aide sur une publication pour la retrouver ici." : "Ce compte n'a encore rejoint aucune initiative."} cta={isMe ? { href: "/", label: "Voir le fil" } : undefined} />
      ))}
      {tab === "badges" && (
        <ul className="grid gap-2 p-4 sm:grid-cols-2">
          {allBadges.map((b) => (
            <li key={b.id} className={`flex items-center gap-3 rounded-2xl border border-line bg-bg p-4 ${earned.has(b.id) ? "" : "opacity-50"}`}>
              <span className={`text-3xl ${earned.has(b.id) ? "" : "grayscale"}`}>{b.emoji}</span>
              <span>
                <span className="block font-semibold">{b.label} {earned.has(b.id) ? "✅" : "🔒"}</span>
                <span className="block text-xs text-muted">{b.description}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

}

function Empty({ title, text, cta }: { title: string; text: string; cta?: { href: string; label: string } }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-2xl font-extrabold">{title}</p>
      <p className="mt-2 text-muted">{text}</p>
      {cta && <Link href={cta.href} className="mt-4 inline-block font-semibold text-ig-blue">{cta.label}</Link>}
    </div>
  );
}
