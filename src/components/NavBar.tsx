"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CalendarDays, Compass, House, LogIn, MapPin, Navigation, Sparkles, SquarePlus, Store } from "lucide-react";
import { isEstablishment } from "@/lib/constants";
import { useSession } from "@/lib/session";
import { rememberSpace, spaceOfPath, useSpace } from "@/lib/space";
import { ActivityBell } from "./ActivityBell";
import { Avatar } from "./Avatar";

type Item = { href: string; label: string; icon: typeof House; desktopOnly?: boolean };
// Chaque espace a SA navigation (choisi sur la page d'ouverture « / », retenu sur l'appareil).
const VIE_ITEMS: Item[] = [
  { href: "/vie", label: "Accueil", icon: House },
  { href: "/lancer", label: "Lancer", icon: Sparkles },
  { href: "/y-aller", label: "Y aller", icon: Navigation },
  { href: "/evenements", label: "Événements", icon: CalendarDays },
  { href: "/vitrines", label: "Vitrines", icon: Store },
  { href: "/fonctionnalites", label: "À découvrir", icon: Compass, desktopOnly: true },
];
const BUSINESS_ITEMS: Item[] = [
  { href: "/entreprises", label: "Accueil", icon: House },
  { href: "/entreprises/publier", label: "Publier", icon: SquarePlus },
];
const PRIMARY = new Set(["/lancer", "/entreprises/publier"]); // bouton mis en avant (couleur d'accent)
const SPACE_HOMES = new Set(["/vie", "/entreprises"]);
const isActive = (path: string | null, href: string) => path !== null && (path === href || (!SPACE_HOMES.has(href) && path.startsWith(`${href}/`)));

export function NavBar({ variant, pathname }: { variant: "side" | "bottom"; pathname: string | null }) {
  const { user } = useSession();
  // Espace actuel : déduit de l'adresse (/vie, /entreprises…) ou, sinon, l'espace retenu (agenda, publication, profil…).
  const space = useSpace(pathname);
  useEffect(() => {
    const fromPath = spaceOfPath(pathname);
    if (fromPath) rememberSpace(fromPath);
  }, [pathname]);
  const canPublish = !!user && isEstablishment(user.accountType);
  const items = space === "entreprises"
    ? BUSINESS_ITEMS.filter((item) => item.href !== "/entreprises/publier" || canPublish)
    : VIE_ITEMS;
  // Entreprise : sa page publique. Résident·e : son espace privé de progression (points, niveau, badges).
  const profileHref = user ? (isEstablishment(user.accountType) ? `/u/${user.id}` : "/moi") : "/connexion";
  const profileActive = pathname !== null && (pathname === profileHref || pathname.startsWith("/moi") || (!user && ["/connexion", "/inscription"].includes(pathname)));

  if (variant === "bottom") return (
    <nav aria-label="Navigation mobile" className="glass-header fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="flex h-[68px] items-center justify-around px-1">
        {items.filter((i) => !i.desktopOnly).map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className={`flex h-[60px] flex-col items-center justify-center gap-1 rounded-xl transition active:scale-90 ${active ? "text-fg" : "text-muted"}`}>
                <span className={`grid h-8 w-10 place-items-center rounded-xl ${PRIMARY.has(href) ? "bg-ig-blue text-white shadow-sm" : active ? "bg-sep" : ""}`}><Icon size={23} strokeWidth={active ? 2.4 : 1.8} /></span>
                <span className={`text-[9px] leading-none ${active ? "font-bold" : "font-medium"}`}>{label}</span>
              </Link>
            </li>
          );
        })}
        <li className="min-w-0 flex-1">
          <Link href={profileHref} aria-label={user ? "Mon profil" : "Se connecter"} aria-current={profileActive ? "page" : undefined} className={`flex h-[60px] flex-col items-center justify-center gap-1 rounded-xl transition active:scale-90 ${profileActive ? "text-fg" : "text-muted"}`}>
            <span className="grid h-8 place-items-center">{user ? <span className={`rounded-full ${profileActive ? "ring-2 ring-fg ring-offset-2 ring-offset-bg" : ""}`}><Avatar user={user} size={25} /></span> : <LogIn size={23} strokeWidth={1.8} />}</span>
            <span className="text-[9px] font-medium leading-none">{user ? "Profil" : "Connexion"}</span>
          </Link>
        </li>
      </ul>
    </nav>
  );

  return (
    <nav aria-label="Navigation principale" className="no-scrollbar fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col overflow-y-auto border-r border-line bg-bg px-3 pb-5 pt-7 md:flex xl:w-[244px] xl:px-5">
      <Link href="/" aria-label="Complices, accueil" className="mb-3 flex h-14 items-center gap-2 px-1 xl:px-3">
        <span className="story-ring grid h-10 w-10 shrink-0 place-items-center rounded-[14px] font-logo text-3xl text-white shadow-sm xl:hidden">C</span>
        <span className="hidden font-logo text-[28px] leading-none xl:block">Complices<span className="text-ig-blue">.</span></span>
      </Link>
      <Link href="/" className="mb-8 hidden items-center gap-1.5 px-3 text-[11px] font-medium text-muted hover:text-fg xl:flex"><MapPin size={12} /> {space === "entreprises" ? "Espace Entreprises" : "Vie Saint-Roch"} · changer</Link>
      <ul className="flex flex-col gap-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link href={href} aria-label={label} title={label} aria-current={active ? "page" : undefined} className={`group flex min-h-12 items-center justify-center gap-3 rounded-xl p-3 transition xl:justify-start ${active ? "bg-soft font-bold" : "hover:bg-soft"}`}>
                <Icon size={24} strokeWidth={active ? 2.5 : 1.8} className={`shrink-0 transition group-hover:scale-110 ${PRIMARY.has(href) ? "text-ig-blue" : ""}`} />
                <span className="hidden text-[15px] xl:inline">{label}</span>
                {active && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-ig-blue xl:block" />}
              </Link>
            </li>
          );
        })}
        <li><ActivityBell withLabel active={pathname === "/activite"} /></li>
      </ul>
      <div className="mt-auto space-y-5 pt-8">
        {(space !== "entreprises" || canPublish) && <div className="hidden rounded-2xl bg-soft p-4 xl:block">
          {space === "entreprises" ? (
            <><p className="font-semibold">Fais-toi connaître.</p><p className="mt-1 text-xs leading-relaxed text-muted">Une promo, une nouveauté, un emploi ?</p>
            <Link href="/entreprises/publier" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ig-blue"><SquarePlus size={14} /> Publier pour mon commerce</Link></>
          ) : (
            <><p className="font-semibold">Une idée change tout.</p><p className="mt-1 text-xs leading-relaxed text-muted">Et si la prochaine venait de toi ?</p>
            <Link href="/lancer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ig-blue"><Sparkles size={14} /> Trouver mes complices</Link></>
          )}
        </div>}
        <Link href={profileHref} aria-label={user ? "Mon profil" : "Se connecter"} title={user ? "Mon profil" : "Se connecter"} aria-current={profileActive ? "page" : undefined} className={`flex items-center justify-center gap-3 rounded-xl p-2.5 transition hover:bg-soft xl:justify-start ${profileActive ? "bg-soft" : ""}`}>
          {user ? <Avatar user={user} size={32} /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sep"><LogIn size={19} /></span>}
          <span className="hidden min-w-0 xl:block"><span className="block truncate text-sm font-semibold">{user ? user.displayName : "Se connecter"}</span><span className="block text-[11px] text-muted">{user ? (isEstablishment(user.accountType) ? "Ma page entreprise" : "Mon compte") : "Rejoins ton quartier"}</span></span>
        </Link>
        <p className="hidden px-3 text-[10px] leading-relaxed text-muted xl:block">Fait pour Saint-Roch, ensemble.<br />Hackathon Saint-Roch 2026</p>
      </div>
    </nav>
  );
}

export function NavBarWithPath({ variant }: { variant: "side" | "bottom" }) { return <NavBar variant={variant} pathname={usePathname()} />; }
