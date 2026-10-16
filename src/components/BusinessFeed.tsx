"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarDays, Handshake, MapPin, Megaphone, Plus, RefreshCw, Search, Send, Sparkles, Store, Tag, X } from "lucide-react";
import { BUSINESS_POST_TYPES, SECTORS, businessPostTypeOf, isEstablishment, sectorOf } from "@/lib/constants";
import { publicationSourceOf } from "@/lib/quartier"; // « via Facebook » sur une publication importée (F3, Stelle)
import { formatDate, normalizeSearch, timeAgo } from "@/lib/format";
import { useSession } from "@/lib/session";
import { usePostActions } from "./usePostActions";
import type { Idea } from "@/lib/types";
import { Avatar } from "./Avatar";
import { FeedFilters } from "./FeedFilters";
import { PostMedia } from "./PostMedia";
import "./business-feed.css";

const POST_ICONS = { promo: Tag, nouveaute: Sparkles, emploi: BriefcaseBusiness, offre: Handshake, annonce: Megaphone };
const SECTOR_ILLUSTRATIONS: Partial<Record<NonNullable<Idea["organizer"]["sector"]>, string>> = {
  culture: "art", tech: "tech", bureau: "tech", institution: "tech",
  services: "atelier", boutique: "atelier", communautaire: "tech",
  "economie-sociale": "tech", "sport-loisir": "jeux",
};

// Onglet « Entreprises » : seulement les publications des commerces, restos, entreprises et organismes.
export function BusinessFeed() {
  const { user } = useSession();
  const [posts, setPosts] = useState<Idea[] | null>(null);
  const [error, setError] = useState(false);
  const [type, setType] = useState("tous");
  const [sector, setSector] = useState("tous");
  const [query, setQuery] = useState("");

  useEffect(() => {
    // Publications des entreprises + activités organisées par des entreprises (jamais celles des résident·e·s : 16 oct., Danny)
    Promise.all([
      fetch("/api/entreprises", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/ideas", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { ideas: [] })),
    ])
      .then(([d, a]: [{ posts: Idea[] }, { ideas: Idea[] }]) =>
        setPosts([...d.posts, ...a.ideas.filter((i) => isEstablishment(i.organizer.accountType))].sort((x, y) => y.createdAt.localeCompare(x.createdAt))))
      .catch(() => setError(true));
  }, [user?.id]);

  const visible = useMemo(() => {
    const q = normalizeSearch(query.trim());
    return (posts ?? []).filter(
      (p) =>
        (type === "tous" || (type === "activite" ? p.kind !== "entreprise" : p.postType === type)) &&
        (sector === "tous" || p.organizer.sector === sector) &&
        (!q || normalizeSearch(`${p.title} ${p.description} ${p.organizer.displayName}`).includes(q)),
    );
  }, [posts, type, sector, query]);

  // Seulement les secteurs qui ont des publications (filtres courts et utiles)
  const sectorOptions = useMemo(() => {
    const used = new Set((posts ?? []).map((p) => p.organizer.sector).filter(Boolean));
    return SECTORS.filter((s) => used.has(s.id));
  }, [posts]);

  const canPublish = !!user && isEstablishment(user.accountType);
  const filtered = type !== "tous" || sector !== "tous" || query.trim().length > 0;
  const filterCount = Number(type !== "tous") + Number(sector !== "tous");

  return (
    <div className="feed-page business-feed mx-auto max-w-[1240px] space-y-8 px-4 py-7 md:px-8 md:py-10 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="text-2xl font-bold md:text-3xl">Entreprises</h1>
      </header>

      <section aria-label="Rechercher et filtrer les publications" className="feed-toolbar flex items-center gap-3">
        <div className="feed-search flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-bg px-3 focus-within:border-ig-blue">
          <Search size={17} className="shrink-0 text-muted" />
          <input type="search" aria-label="Rechercher un commerce ou une offre" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Un commerce, une promo, un emploi…" className="min-w-0 flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-muted md:text-sm" />
          {query && <button type="button" aria-label="Effacer" onClick={() => setQuery("")} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-soft"><X size={14} /></button>}
        </div>
        <FeedFilters count={filterCount} onReset={() => { setType("tous"); setSector("tous"); }} fields={[
          { label: "Type de publication", value: type, onChange: setType, options: [{ id: "tous", label: "Tous les types" }, { id: "activite", label: "Activité" }, ...BUSINESS_POST_TYPES] },
          ...(sectorOptions.length > 1 ? [{ label: "Secteur", value: sector, onChange: setSector, options: [{ id: "tous", label: "Tous les secteurs" }, ...sectorOptions] }] : []),
        ]} />
      </section>

      {error && <div role="alert" className="surface-card px-6 py-12 text-center"><RefreshCw size={28} className="mx-auto text-muted" /><p className="mt-3 font-semibold">Les publications reviennent bientôt.</p></div>}
      {!posts && !error && <div className="idea-grid" aria-label="Chargement des publications">{Array.from({ length: 3 }, (_, k) => <div key={k} className="business-post-skeleton animate-pulse rounded-lg border border-line bg-soft" />)}</div>}
      {posts && visible.length === 0 && (
        <div className="surface-card px-6 py-12 text-center">
          <Store size={30} className="mx-auto text-ig-blue" />
          <h2 className="mt-4 text-lg font-bold">{filtered ? "Rien pour ces filtres." : "Aucune publication d'entreprise pour l'instant."}</h2>
          <p className="mt-2 text-sm text-muted">{canPublish ? "Annonce ta première promo ou nouveauté au quartier." : "Les commerces du quartier publieront ici leurs promos et nouveautés."}</p>
          {canPublish && !filtered && <Link href="/entreprises/publier" className="ig-btn mt-5 text-sm"><Plus size={16} /> Publier</Link>}
        </div>
      )}
      {visible.length > 0 && (
        <ul className="idea-grid">
          {visible.map((p) => <li key={p.id} className="min-w-0"><BusinessPostCard post={p} /></li>)}
        </ul>
      )}
    </div>
  );
}

function BusinessPostCard({ post }: { post: Idea }) {
  const { share } = usePostActions(post);
  const [open, setOpen] = useState(false);
  const t = businessPostTypeOf(post.postType);
  const org = post.organizer;
  const long = post.description.length > 180;
  const TypeIcon = t ? POST_ICONS[t.id] : Megaphone;
  const illustration = (org.sector && SECTOR_ILLUSTRATIONS[org.sector]) || "marche";
  return (
    <article className="idea-card publication-card business-publication flex h-full flex-col overflow-hidden border border-line bg-bg">
      <header className="business-card-header">
        <Link href={`/u/${org.id}`} className="business-card-company hover:text-ig-blue">
          <Avatar user={org} size={36} />
          <span className="min-w-0">
            <span title={org.displayName} className="business-company-name">{org.displayName}</span>
            <span className="business-company-sector">{sectorOf(org.sector)?.label ?? "Entreprise"}</span>
          </span>
        </Link>
      </header>
      <div className="business-publication-media">
        {post.images.length > 0 ? <PostMedia idea={post} aspect="landscape" /> : (
          <div className="relative overflow-hidden bg-soft">
            {/* Illustration generique ; les photos publiees restent prioritaires. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/activities/${illustration}.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
      <div className="publication-body flex flex-1 flex-col gap-4">
        <div className="business-post-meta">
          {t && <span className="publication-tag business-post-type" data-type={t.id}><TypeIcon size={14} aria-hidden="true" />{t.label}</span>}
          {post.kind !== "entreprise" && <span className="publication-tag business-post-type"><CalendarDays size={14} aria-hidden="true" />Activité{post.startsAt ? ` · ${formatDate(post.startsAt)}` : ""}</span>}
          <span className="business-post-time">{post.source && post.source !== "manuel" ? `${publicationSourceOf(post.source)?.label} · ` : ""}{timeAgo(post.createdAt)}</span>
        </div>
        <h2 className="publication-title">{post.kind !== "entreprise" ? <Link href={`/p/${post.id}`} className="hover:text-ig-blue">{post.title}</Link> : post.title}</h2>
        {post.description && (
          <p className="business-post-description whitespace-pre-line text-sm leading-relaxed text-muted">
            {open || !long ? post.description : `${post.description.slice(0, 180)}… `}
            {long && !open && <button type="button" onClick={() => setOpen(true)} className="font-semibold text-fg">lire la suite</button>}
          </p>
        )}
        <footer className="business-card-footer mt-auto">
          {org.address && <p className="business-company-address"><MapPin size={15} aria-hidden="true" /><span title={org.address}>{org.address}</span></p>}
          <button type="button" onClick={share} aria-label="Partager" title="Partager" className="publication-share ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line text-muted hover:bg-soft hover:text-fg"><Send size={17} /></button>
        </footer>
      </div>
    </article>
  );
}
