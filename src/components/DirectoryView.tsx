"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, BookOpen, MapPin, MessageSquare, Search, Store, X } from "lucide-react";
import { actorTypeOf, isEstablishment, isGuest, sectorOf } from "@/lib/constants";
import { useSession } from "@/lib/session";
import type { PublicUser } from "@/lib/types";
import { Avatar } from "./Avatar";
import { ContactSheet } from "./ContactSheet";
import type { MapActor, MapStreet } from "./DirectoryMap";

const DirectoryMap = dynamic(() => import("./DirectoryMap").then((m) => m.DirectoryMap), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full animate-pulse bg-soft md:h-[520px]" />,
});

// Annuaire des acteurs de Saint-Roch : comptes Complices (page publique, « Contacter ») et commerces de la liste SDC.
type Located = { lat: number; lng: number; exact: boolean; address: string } | null;
type Actor = PublicUser & { activities: number; posts: number; complices: number; at: Located };
type SdcEntry = { id: string; name: string; activity: string; street: string; nonprofit: boolean; at: Located; accountId: string | null };
type Filter = "tous" | "commerce" | "entreprise" | "organisme" | "sdc";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "tous", label: "Tout" },
  { id: "commerce", label: "Commerces" },
  { id: "entreprise", label: "Entreprises" },
  { id: "organisme", label: "Organismes" },
  { id: "sdc", label: "Liste de la SDC" },
];
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function DirectoryView() {
  const { user } = useSession();
  const [actors, setActors] = useState<Actor[] | null>(null);
  const [sdc, setSdc] = useState<SdcEntry[]>([]);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("tous");
  const [query, setQuery] = useState("");
  const [street, setStreet] = useState<string | null>(null);
  const [limit, setLimit] = useState(24);
  const [contact, setContact] = useState<{ id: string; displayName: string } | null>(null);

  useEffect(() => {
    fetch("/api/annuaire", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { actors: Actor[]; sdc: SdcEntry[] }) => { setActors(d.actors); setSdc(d.sdc); })
      .catch(() => setError(true));
  }, []);

  const q = fold(query.trim());
  const shownActors = useMemo(() => (actors ?? []).filter((a) =>
    (filter === "tous" || filter === a.accountType) &&
    (!street || a.at?.address.toLowerCase().includes(street.toLowerCase())) &&
    (!q || fold(`${a.displayName} ${a.description ?? ""} ${a.address ?? ""} ${sectorOf(a.sector)?.label ?? ""}`).includes(q))), [actors, filter, street, q]);
  const shownSdc = useMemo(() => sdc.filter((m) =>
    (filter === "tous" || filter === "sdc" || (filter === "organisme" && m.nonprofit) || (filter === "commerce" && !m.nonprofit)) &&
    (!street || m.street === street) &&
    (!q || fold(`${m.name} ${m.activity} ${m.street}`).includes(q))), [sdc, filter, street, q]);

  const mapActors: MapActor[] = useMemo(() => shownActors.filter((a) => a.at).map((a) => ({
    id: a.id, name: a.displayName, type: a.accountType, typeLabel: actorTypeOf(a.accountType)?.label ?? "", lat: a.at!.lat, lng: a.at!.lng, exact: a.at!.exact,
  })), [shownActors]);
  const mapStreets: MapStreet[] = useMemo(() => {
    const groups = new Map<string, MapStreet>();
    for (const m of sdc) {
      if (!m.at || (filter !== "tous" && filter !== "sdc" && !(filter === "organisme" && m.nonprofit) && !(filter === "commerce" && !m.nonprofit))) continue;
      if (q && !fold(`${m.name} ${m.activity} ${m.street}`).includes(q)) continue;
      const g = groups.get(m.street) ?? { street: m.street, count: 0, lat: m.at.lat, lng: m.at.lng };
      g.count++;
      groups.set(m.street, g);
    }
    return [...groups.values()];
  }, [sdc, filter, q]);
  const pickStreet = useCallback((s: string | null) => { setStreet(s); setLimit(24); }, []);

  const canContact = !!user && !isGuest(user.accountType);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 md:px-7 md:py-10">
      <header className="gallery-intro rounded-2xl border border-line px-6 py-7 md:px-8">
        <p className="flex items-center gap-1.5 text-sm font-medium text-muted"><MapPin size={16} /> Saint-Roch, Québec</p>
        <h1 className="mt-2 text-[28px] font-bold leading-tight md:text-[36px]">L&apos;annuaire du <span className="text-ig-blue">quartier</span></h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Les commerces, entreprises et organismes de Saint-Roch : trouve qui fait quoi, découvre leur page et contacte-les pour un projet.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setLimit(24); }} placeholder="Nom, activité, rue…" aria-label="Chercher dans l'annuaire" className="ig-input pl-9" />
        </label>
      </div>
      <div role="group" aria-label="Filtrer l'annuaire" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => { setFilter(f.id); setLimit(24); }}
            className={`min-h-10 shrink-0 rounded-lg border px-3.5 text-sm font-medium transition ${filter === f.id ? "border-ig-blue bg-ig-blue text-white" : "border-line bg-bg hover:bg-soft"}`}>{f.label}</button>
        ))}
        {street && (
          <button type="button" onClick={() => pickStreet(null)} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-fg px-3.5 text-sm font-medium">
            <MapPin size={14} /> {street} <X size={14} />
          </button>
        )}
      </div>

      <div className="relative isolate z-0 overflow-hidden rounded-2xl border border-line">
        <DirectoryMap actors={mapActors} streets={mapStreets} selectedStreet={street} onPickStreet={pickStreet} />
      </div>
      <p className="-mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#7ab648]" />Commerce</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#0096d6]" />Entreprise</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#1f3a4d]" />Organisme</span>
        <span>Pastille avec un nombre : commerces de la liste SDC dans la rue (touche-la pour filtrer)</span>
      </p>

      {error && <p className="surface-card p-6 text-center text-sm text-muted">Impossible de charger l&apos;annuaire. Réessaie.</p>}
      {!actors && !error && <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((k) => <div key={k} className="h-40 animate-pulse rounded-xl bg-hov" />)}</div>}

      {actors && filter !== "sdc" && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><BadgeCheck size={19} className="text-ig-blue" /> Sur Complices <span className="text-sm font-medium text-muted">{shownActors.length}</span></h2>
          {shownActors.length === 0 ? (
            <p className="surface-card p-6 text-center text-sm text-muted">Aucun compte pour cette recherche.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {shownActors.map((a) => (
                <li key={a.id} className="surface-card flex flex-col p-4">
                  <div className="flex items-start gap-3">
                    <Avatar user={a} size={44} />
                    <div className="min-w-0">
                      <Link href={`/u/${a.id}`} className="block truncate font-semibold hover:text-ig-blue">{a.displayName}</Link>
                      <p className="truncate text-xs text-muted">{actorTypeOf(a.accountType)?.label}{sectorOf(a.sector) ? ` · ${sectorOf(a.sector)!.label}` : ""}</p>
                      {a.address && <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted"><MapPin size={12} className="shrink-0" /> {a.address}</p>}
                    </div>
                  </div>
                  {a.description && <p className="mt-3 line-clamp-2 text-sm">{a.description}</p>}
                  <p className="mt-3 text-xs text-muted">{a.activities} activité{a.activities > 1 ? "s" : ""} · {a.posts} publication{a.posts > 1 ? "s" : ""} · {a.complices} complice{a.complices > 1 ? "s" : ""}</p>
                  <div className="mt-auto flex gap-2 pt-4">
                    <Link href={`/u/${a.id}`} className="ig-btn-secondary min-h-10 flex-1 text-sm">Voir la page</Link>
                    {canContact && user!.id !== a.id && (
                      <button type="button" onClick={() => setContact({ id: a.id, displayName: a.displayName })} className="ig-btn min-h-10 flex-1 text-sm"><MessageSquare size={15} /> Contacter</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!user && <p className="mt-3 text-xs text-muted"><Link href="/connexion" className="font-semibold text-ig-blue">Connecte-toi</Link> pour contacter un commerce ou un organisme.</p>}
        </section>
      )}

      {actors && sdc.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><BookOpen size={19} className="text-ig-blue" /> Commerces et organismes du quartier <span className="text-sm font-medium text-muted">{shownSdc.length}</span></h2>
          {shownSdc.length === 0 ? (
            <p className="surface-card p-6 text-center text-sm text-muted">Aucune fiche pour cette recherche.</p>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {shownSdc.slice(0, limit).map((m) => (
                <li key={m.id}>
                  <Link href={`/annuaire/sdc/${encodeURIComponent(m.id)}`} className="surface-card flex h-full items-start gap-3 p-3 transition hover:bg-soft">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-soft text-ig-blue"><Store size={17} /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{m.name}</span>
                      <span className="block truncate text-xs text-muted">{m.activity}</span>
                      <span className="flex items-center gap-1 truncate text-xs text-muted"><MapPin size={11} className="shrink-0" /> {m.street}</span>
                      {m.accountId && <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-ig-blue"><BadgeCheck size={12} /> Aussi sur Complices</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {limit < shownSdc.length && <button type="button" onClick={() => setLimit((n) => n + 36)} className="ig-btn-secondary mt-3">Afficher plus</button>}
        </section>
      )}

      {user && isEstablishment(user.accountType) && (
        <p className="text-sm text-muted">Ton commerce ou ton organisme est ici ? <Link href="/entreprises/tableau" className="font-semibold text-ig-blue">Ouvre ton tableau de bord</Link> pour voir qui te contacte.</p>
      )}
      {contact && <ContactSheet to={contact} open onClose={() => setContact(null)} />}
    </div>
  );
}
