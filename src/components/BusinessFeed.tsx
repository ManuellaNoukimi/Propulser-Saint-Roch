"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Plus, RefreshCw, Search, Store, X } from "lucide-react";
import { BUSINESS_POST_TYPES, SECTORS, businessPostTypeOf, isEstablishment, sectorOf } from "@/lib/constants";
import { normalizeSearch, timeAgo } from "@/lib/format";
import { useSession } from "@/lib/session";
import { usePostActions } from "./usePostActions";
import type { Idea } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Chips } from "./Chips";
import { PostMedia } from "./PostMedia";
import { SpaceTabs } from "./SpaceTabs";

// Onglet « Entreprises » : seulement les publications des commerces, restos, entreprises et organismes.
export function BusinessFeed() {
  const { user } = useSession();
  const [posts, setPosts] = useState<Idea[] | null>(null);
  const [error, setError] = useState(false);
  const [type, setType] = useState("tous");
  const [sector, setSector] = useState("tous");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/entreprises", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { posts: Idea[] }) => setPosts(d.posts))
      .catch(() => setError(true));
  }, [user?.id]);

  const visible = useMemo(() => {
    const q = normalizeSearch(query.trim());
    return (posts ?? []).filter(
      (p) =>
        (type === "tous" || p.postType === type) &&
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

  return (
    <div className="mx-auto max-w-[1320px] space-y-7 px-4 py-5 md:px-7 md:py-8 lg:px-9">
      <SpaceTabs active="entreprises" />

      <header className="business-intro flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-line px-6 py-7 md:px-8">
        <div className="max-w-xl">
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-muted"><Store size={12} /> Commerces et entreprises de Saint-Roch</p>
          <h1 className="text-[30px] font-bold leading-[1.12] tracking-tight md:text-[36px]">Ce qui se passe <span className="text-ig-blue">chez nos commerces.</span></h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">Promos, nouveautés, emplois et coups de main offerts au quartier. Les activités, elles, sont dans « Vie Saint-Roch ».</p>
        </div>
        {canPublish ? (
          <Link href="/entreprises/publier" className="ig-btn min-h-11 px-5 text-sm"><Plus size={18} /> Publier</Link>
        ) : (
          <p className="max-w-[220px] text-xs text-muted">Tu as un commerce ? <Link href="/inscription" className="font-semibold text-ig-blue">Crée un compte Entreprise</Link> pour publier ici.</p>
        )}
      </header>

      <section className="space-y-4">
        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-bg px-3 focus-within:border-ig-blue sm:max-w-sm">
          <Search size={17} className="shrink-0 text-muted" />
          <input type="search" aria-label="Rechercher un commerce ou une offre" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Un commerce, une promo, un emploi…" className="min-w-0 flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-muted md:text-sm" />
          {query && <button type="button" aria-label="Effacer" onClick={() => setQuery("")} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-soft"><X size={14} /></button>}
        </div>
        <Chips label="Type" value={type} onChange={setType} options={[{ id: "tous", label: "Tout" }, ...BUSINESS_POST_TYPES]} />
        {sectorOptions.length > 1 && <Chips label="Secteur" value={sector} onChange={setSector} options={[{ id: "tous", label: "Tous les secteurs" }, ...sectorOptions]} />}
        {filtered && <button type="button" onClick={() => { setType("tous"); setSector("tous"); setQuery(""); }} className="text-xs font-semibold text-ig-blue">Réinitialiser les filtres</button>}
      </section>

      {error && <div role="alert" className="surface-card px-6 py-12 text-center"><RefreshCw size={28} className="mx-auto text-muted" /><p className="mt-3 font-semibold">Les publications reviennent bientôt.</p></div>}
      {!posts && !error && <div className="idea-grid">{Array.from({ length: 3 }, (_, k) => <div key={k} className="h-80 animate-pulse rounded-2xl bg-hov" />)}</div>}
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
  return (
    <article className="idea-card flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-bg">
      {post.images.length > 0 && <PostMedia idea={post} aspect="landscape" />}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          {t && <span className="rounded-full bg-soft px-2.5 py-1 text-[11px] font-semibold">{t.emoji} {t.label}</span>}
          <span className="text-[11px] text-muted">{timeAgo(post.createdAt)}</span>
        </div>
        <h3 className="text-lg font-bold leading-snug">{post.title}</h3>
        {post.description && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
            {open || !long ? post.description : `${post.description.slice(0, 180)}… `}
            {long && !open && <button type="button" onClick={() => setOpen(true)} className="font-semibold text-fg">lire la suite</button>}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
          <Link href={`/u/${org.id}`} className="flex min-w-0 items-center gap-2 hover:text-ig-blue">
            <Avatar user={org} size={28} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-xs font-semibold">{org.displayName}</span>
              <span className="flex items-center gap-1 truncate text-[11px] text-muted">
                {sectorOf(org.sector)?.label ?? "Entreprise"}
                {org.address && <><MapPin size={10} /> {org.address}</>}
              </span>
            </span>
          </Link>
          <button type="button" onClick={share} className="ig-btn-secondary shrink-0 px-3 py-1.5 text-xs">Partager</button>
        </div>
      </div>
    </article>
  );
}
