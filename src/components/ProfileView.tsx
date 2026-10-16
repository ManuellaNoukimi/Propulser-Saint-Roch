"use client";

import Link from "next/link";
import { startTransition, useEffect, useState, ViewTransition } from "react";
import { Award, Check, Flame, Grid3x3, Heart, House, Lightbulb, LockKeyhole, MapPin, MessageSquare, Settings, Star, Users } from "lucide-react";
import { actorTypeOf, isEstablishment, isGuest, sectorOf } from "@/lib/constants";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import type { PublicProfile } from "@/lib/types";
import { Avatar } from "./Avatar";
import { ContactSheet } from "./ContactSheet";
import { LogoutButton } from "./LogoutButton";
import { PostGrid } from "./PostGrid";
import { SocialImport } from "./SocialImport";
import "./profile-badges.css";

type Tab = "publications" | "complice" | "badges";
const BADGE_ICONS = { "super-voisin": House, "bonne-personne": Heart, batisseur: Lightbulb, rassembleur: Flame, "premier-complice": Star };

// Profil façon Instagram : avatar, statistiques, bio, « highlights » de badges, onglets et grille.
export function ProfileView({ id }: { id: string }) {
  const { user: me } = useSession();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("publications");
  const [contactOpen, setContactOpen] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    fetch(`/api/users/${id}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setProfile(d);
      })
      .catch((e) => setError(e instanceof Error && e.message ? e.message : "Chargement impossible."));
  }, [id, me?.id, reload]);

  if (error) return <p className="p-10 text-center font-semibold">{error}</p>;
  if (!profile)
    return (
      <div className="mx-auto max-w-[935px] animate-pulse p-6">
        <div className="flex items-center gap-8"><div className="h-24 w-24 rounded-full bg-hov" /><div className="h-4 w-40 rounded bg-hov" /></div>
      </div>
    );

  const { user, stats, badges, allBadges, ideas, joined: allJoined, isMe } = profile;
  // Un compte entreprise ne voit pas les activités des résident·e·s, même sur une page (16 oct., Danny)
  const joined = me && isEstablishment(me.accountType) ? allJoined.filter((i) => isEstablishment(i.organizer.accountType)) : allJoined;
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
        <p className="text-muted"> {type?.label}{sector ? ` ·  ${sector.label}` : ""}</p>
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

  // Boutons du profil : à côté du nom sur ordinateur, sur leur propre ligne en pleine largeur sur téléphone (16 oct., Danny)
  const actions = isMe ? (
              <>
                <Link href="/moi/modifier" className="ig-btn-secondary text-sm">Modifier le profil</Link>
                <Link href="/moi/modifier" aria-label="Paramètres" className="p-1"><Settings size={22} /></Link>
                <LogoutButton />
              </>
            ) : (
              <>
                {/* Contacter un commerce, une entreprise ou un organisme (message dans l'app, sans courriel) */}
                {me && !isGuest(me.accountType) && isEstablishment(user.accountType) && (
                  <button type="button" onClick={() => setContactOpen(true)} className="ig-btn text-sm"><MessageSquare size={16} /> Contacter</button>
                )}
                <button type="button" onClick={shareProfile} className="ig-btn-secondary text-sm">Partager le profil</button>
              </>
            );

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
            <h1 className="mr-2 break-words text-2xl font-semibold tracking-tight">{user.displayName}</h1>
            <div className="hidden flex-wrap items-center gap-2 md:flex">{actions}</div>
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
      <div className="profile-actions-mobile flex flex-wrap gap-2 px-4 pt-4 md:hidden">{actions}</div>

      {/* Statistiques (mobile) */}
      <ul className="mt-4 grid grid-cols-3 border-y border-sep py-3 text-center md:hidden">
        {statItems.map((s) => (
          <li key={s.label} className="leading-tight"><span className="block font-semibold">{s.n}</span><span className="text-muted">{s.label}</span></li>
        ))}
      </ul>

      <ul aria-label="Badges du profil" className="profile-badges-summary">
        {allBadges.map((b) => {
          const on = earned.has(b.id);
          const Icon = BADGE_ICONS[b.id];
          return (
            <li key={b.id} data-earned={on} title={b.description}>
              <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
              <span>{b.label}</span>
              {on ? <Check size={13} aria-hidden="true" /> : <LockKeyhole size={12} aria-hidden="true" />}
              <span className="sr-only">{on ? "Débloqué" : "À découvrir"}</span>
            </li>
          );
        })}
      </ul>

      {/* F3 : lier ses pages (seulement sur son propre profil d'établissement). Facebook et Instagram : liaison de Stelle
          (LinkedPages, dans le panneau du réseau) ; les publications importées s'ajoutent au profil (rechargé). */}
      {isMe && isEstablishment(user.accountType) && <div className="mb-6"><SocialImport onChange={() => setReload((n) => n + 1)} /></div>}

      {contactOpen && <ContactSheet to={{ id: user.id, displayName: user.displayName }} open onClose={() => setContactOpen(false)} />}

      {/* Onglets */}
      <nav aria-label="Contenu du profil" className="mb-2 flex justify-around border-t border-line md:justify-center md:gap-14">
        {([
          { id: "publications", label: "Publications", icon: Grid3x3 },
          { id: "complice", label: "Complice de", icon: Users },
          { id: "badges", label: "Badges", icon: Award },
        ] as const).map(({ id: t, label, icon: Icon }) => (
          <button key={t} type="button" aria-label={label} aria-pressed={tab === t} onClick={() => startTransition(() => setTab(t))}
            className={`-mt-px flex min-h-12 items-center gap-2 border-t-2 px-2 py-3 text-[10px] font-semibold transition md:text-xs ${tab === t ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg"}`}>
            <Icon size={17} /> <span>{label}</span>
          </button>
        ))}
      </nav>

      <ViewTransition key={tab} name="profile-tab-content" default="content-swap">
      <div className="profile-tab-content">
      {tab === "publications" && (ideas.length ? <PostGrid ideas={ideas} /> : (
        <Empty title={isMe ? "Partage ta première idée" : "Aucune publication"} text={isMe ? "Quand tu publieras une idée, elle apparaîtra ici." : "Ce compte n'a encore rien publié."} cta={isMe ? { href: "/creer", label: "Publier une idée" } : undefined} />
      ))}
      {tab === "complice" && (joined.length ? <PostGrid ideas={joined} /> : (
        <Empty title="Pas encore complice" text={isMe ? "Propose ton aide sur une publication pour la retrouver ici." : "Ce compte n'a encore rejoint aucune initiative."} cta={isMe ? { href: "/vie", label: "Voir les activités" } : undefined} />
      ))}
      {tab === "badges" && (
        <ul className="profile-badges-details">
          {allBadges.map((b) => {
            const on = earned.has(b.id);
            const Icon = BADGE_ICONS[b.id];
            return (
              <li key={b.id} data-earned={on}>
                <Icon size={22} strokeWidth={1.6} className="profile-badge-icon" aria-hidden="true" />
                <div className="profile-badge-content">
                  <div className="profile-badge-heading">
                    <h2>{b.label}</h2>
                    <span className="profile-badge-state">{on ? <Check size={14} aria-hidden="true" /> : <LockKeyhole size={13} aria-hidden="true" />}{on ? "Débloqué" : "À découvrir"}</span>
                  </div>
                  <p>{b.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      </div>
      </ViewTransition>
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
