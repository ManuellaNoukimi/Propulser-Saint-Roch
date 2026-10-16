"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, ExternalLink, Handshake, MapPin, MessageSquare, Search, Send, Store, X } from "lucide-react";
import { isEstablishment } from "@/lib/constants";
import { DOMAINS, domainOf, type DomainId } from "@/lib/domains";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { AuthPrompt } from "./AuthPrompt";
import { Avatar } from "./Avatar";
import { ContactSheet } from "./ContactSheet";
import type { MapActor, MapStreet } from "./DirectoryMap";

const DirectoryMap = dynamic(() => import("./DirectoryMap").then((m) => m.DirectoryMap), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full animate-pulse bg-soft md:h-[520px]" />,
});

// « Collaborer » (espace Entreprises) : les vraies entreprises de Saint-Roch qui font la même chose que toi
// (même domaine, ou plusieurs domaines à la fois), mises en évidence pour monter des projets ensemble.
type Company = {
  id: string; name: string; street: string; activity: string | null; domains: DomainId[]; shared: DomainId[];
  source: "complices" | "sdc" | "registre"; accountId: string | null; sdcId: string | null;
  at: { lat: number; lng: number; exact: boolean; address: string } | null;
};
type Payload = { mine: DomainId[]; selected: DomainId[]; mode: "un" | "tous"; counts: Record<string, number>; total: number; results: Company[] };

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function CollaborerView() {
  const { user, loading } = useSession();
  const [data, setData] = useState<Payload | null>(null);
  const [selected, setSelected] = useState<DomainId[] | null>(null); // null = mes domaines (premier chargement)
  const [mode, setMode] = useState<"un" | "tous">("un");
  const [query, setQuery] = useState("");
  const [street, setStreet] = useState<string | null>(null);
  const [limit, setLimit] = useState(30);
  const [error, setError] = useState(false);
  const [contact, setContact] = useState<{ id: string; displayName: string } | null>(null);

  const allowed = !!user && isEstablishment(user.accountType);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (selected?.length) params.set("domaines", selected.join(","));
    if (mode === "tous") params.set("mode", "tous");
    fetch(`/api/collaborer?${params}`, { cache: "no-store", signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Payload) => { setData(d); setError(false); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [allowed, selected, mode]);

  const current = selected ?? data?.selected ?? [];
  const q = fold(query.trim());
  const results = useMemo(() => (data?.results ?? []).filter((c) =>
    (!street || c.street === street) && (!q || fold(`${c.name} ${c.activity ?? ""} ${c.street}`).includes(q))), [data, street, q]);
  const onComplices = results.filter((c) => c.accountId);
  const others = results.filter((c) => !c.accountId);

  const mapActors: MapActor[] = useMemo(() => onComplices.filter((c) => c.at).map((c) => ({
    id: c.accountId!, name: c.name, type: "entreprise", typeLabel: c.shared.map((d) => domainOf(d)?.short).join(" · "), lat: c.at!.lat, lng: c.at!.lng, exact: c.at!.exact,
  })), [onComplices]);
  const mapStreets: MapStreet[] = useMemo(() => {
    const groups = new Map<string, MapStreet>();
    for (const c of (data?.results ?? []).filter((x) => !x.accountId && x.at && (!q || fold(`${x.name} ${x.activity ?? ""} ${x.street}`).includes(q)))) {
      const g = groups.get(c.street) ?? { street: c.street, count: 0, lat: c.at!.lat, lng: c.at!.lng };
      g.count++;
      groups.set(c.street, g);
    }
    return [...groups.values()];
  }, [data, q]);
  const pickStreet = useCallback((s: string | null) => { setStreet(s); setLimit(30); }, []);

  if (loading) return <p className="p-10 text-center text-muted">Chargement…</p>;
  if (!user) return <AuthPrompt title="Collaborer" text="Connecte-toi avec ton compte Entreprise pour trouver les entreprises du quartier qui font comme toi." next="/entreprises/collaborer" />;
  if (!allowed)
    return (
      <div className="mx-auto my-12 max-w-sm px-6 text-center">
        <Store size={36} className="mx-auto text-muted" />
        <h1 className="mt-4 text-lg font-semibold">Réservé aux comptes Entreprise</h1>
        <p className="mt-2 text-sm text-muted">« Collaborer » aide les commerces, entreprises et organismes à se trouver entre eux.</p>
        <Link href="/annuaire" className="ig-btn mt-6 inline-flex">Voir l&apos;annuaire</Link>
      </div>
    );

  function toggle(id: DomainId) {
    const next = current.includes(id) ? current.filter((d) => d !== id) : [...current, id];
    setSelected(next);
    setLimit(30);
    if (next.length < 2) setMode("un");
  }
  async function invite(name: string) {
    const url = `${window.location.origin}/inscription`;
    try {
      await navigator.clipboard.writeText(`Rejoignez Complices, l'app des commerces et organismes de Saint-Roch : ${url}`);
      toast(`Lien d'invitation copié : envoie-le à ${name}`);
    } catch {
      toast(`Lien à envoyer : ${url}`);
    }
  }

  const both = current.length > 1;
  const Badges = ({ c }: { c: Company }) => (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {both && c.shared.length === current.length && <span className="inline-flex items-center gap-1 rounded-md bg-ig-green/20 px-2 py-0.5 text-[11px] font-bold text-[#3f6d1f] dark:text-[#b5e08f]"><BadgeCheck size={12} /> {current.length === 2 ? "Les 2 domaines" : "Tous tes domaines"}</span>}
      {c.domains.map((d) => (
        <span key={d} className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${c.shared.includes(d) ? "border border-ig-blue/40 bg-ig-blue/10 text-ig-blue" : "bg-soft text-muted"}`}>{domainOf(d)?.short}</span>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 md:px-7 md:py-10">
      <header className="gallery-intro rounded-2xl border border-line px-6 py-7 md:px-8">
        <p className="flex items-center gap-1.5 text-sm font-medium text-muted"><Handshake size={16} /> Entreprises de Saint-Roch</p>
        <h1 className="mt-2 text-[28px] font-bold leading-tight md:text-[36px]">Collaborer avec ceux qui font <span className="text-ig-blue">comme toi</span></h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Les vraies entreprises du quartier qui partagent ton domaine, ou plusieurs de tes domaines à la fois : pour un projet commun, un événement, un partage de clients ou de locaux.</p>
        {data && data.mine.length > 0 && (
          <p className="mt-4 flex flex-wrap items-center gap-1.5 text-sm">Ton domaine :
            {data.mine.map((d) => <span key={d} className="rounded-md bg-bg px-2 py-0.5 text-xs font-semibold">{domainOf(d)?.label}</span>)}
          </p>
        )}
      </header>

      <section aria-label="Choisir les domaines" className="space-y-3">
        <p className="text-sm font-semibold">Domaines recherchés <span className="font-normal text-muted">(touche pour en ajouter ou en retirer)</span></p>
        <div role="group" aria-label="Domaines" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {DOMAINS.map((d) => {
            const on = current.includes(d.id);
            return (
              <button key={d.id} type="button" aria-pressed={on} onClick={() => toggle(d.id)}
                className={`min-h-10 shrink-0 rounded-lg border px-3.5 text-sm font-medium transition ${on ? "border-ig-blue bg-ig-blue text-white" : "border-line bg-bg hover:bg-soft"}`}>
                {d.short} <span className={on ? "text-white/80" : "text-muted"}>{data?.counts[d.id] ?? ""}</span>
              </button>
            );
          })}
        </div>
        {both && (
          <div role="group" aria-label="Correspondance" className="inline-flex rounded-lg border border-line p-1">
            {([["un", "Au moins un domaine"], ["tous", current.length === 2 ? "Les 2 à la fois" : "Tous à la fois"]] as const).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}
                className={`min-h-9 rounded-md px-3 text-sm font-medium transition ${mode === id ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}>{label}</button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setLimit(30); }} placeholder="Nom, activité, rue…" aria-label="Chercher une entreprise" className="ig-input pl-9" />
          </label>
          {street && (
            <button type="button" onClick={() => pickStreet(null)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-fg px-3.5 text-sm font-medium"><MapPin size={14} /> {street} <X size={14} /></button>
          )}
        </div>
      </section>

      {error && <p className="surface-card p-6 text-center text-sm text-muted">Impossible de charger les entreprises. Réessaie.</p>}
      {!data && !error && <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((k) => <div key={k} className="h-36 animate-pulse rounded-xl bg-hov" />)}</div>}

      {data && (
        <>
          <p className="text-sm"><strong>{results.length}</strong> entreprise{results.length > 1 ? "s" : ""} {current.length ? (mode === "tous" && both ? "dans tous ces domaines" : "en commun avec toi") : ""} · {onComplices.length} sur Complices · sur {data.total} entreprises connues dans Saint-Roch</p>

          <div className="relative isolate z-0 overflow-hidden rounded-2xl border border-line">
            <DirectoryMap actors={mapActors} streets={mapStreets} selectedStreet={street} onPickStreet={pickStreet} />
          </div>

          {current.length === 0 && <p className="surface-card p-6 text-center text-sm text-muted">Choisis au moins un domaine pour voir les entreprises.</p>}

          {onComplices.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><BadgeCheck size={19} className="text-ig-blue" /> Sur Complices : écris-leur directement</h2>
              <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {onComplices.map((c) => (
                  <li key={c.id} className="surface-card flex flex-col p-4">
                    <div className="flex items-start gap-3">
                      <Avatar user={{ id: c.accountId!, displayName: c.name, accountType: "entreprise" }} size={42} />
                      <div className="min-w-0">
                        <Link href={`/u/${c.accountId}`} className="block truncate font-semibold hover:text-ig-blue">{c.name}</Link>
                        {c.activity && <p className="truncate text-xs text-muted">{c.activity}</p>}
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted"><MapPin size={12} className="shrink-0" /> {c.street}</p>
                      </div>
                    </div>
                    <Badges c={c} />
                    <div className="mt-auto flex gap-2 pt-4">
                      <Link href={`/u/${c.accountId}`} className="ig-btn-secondary min-h-10 flex-1 text-sm">Voir la page</Link>
                      <button type="button" onClick={() => setContact({ id: c.accountId!, displayName: c.name })} className="ig-btn min-h-10 flex-1 text-sm"><MessageSquare size={15} /> Contacter</button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {others.length > 0 && (
            <section>
              <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><Store size={19} className="text-ig-blue" /> Dans le quartier</h2>
              <p className="mb-3 text-sm text-muted">Pas encore sur Complices : invite-les, ou passe les voir.</p>
              <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {others.slice(0, limit).map((c) => (
                  <li key={c.id} className="surface-card flex flex-col p-4">
                    <p className="font-semibold">{c.name}</p>
                    {c.activity && <p className="text-xs text-muted">{c.activity}</p>}
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted"><MapPin size={12} className="shrink-0" /> {c.street}</p>
                    <Badges c={c} />
                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      {c.sdcId ? (
                        <Link href={`/annuaire/sdc/${encodeURIComponent(c.sdcId)}`} className="ig-btn-secondary min-h-10 flex-1 text-sm">Fiche</Link>
                      ) : (
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.name}, ${c.street}, Québec`)}`} target="_blank" rel="noopener noreferrer" className="ig-btn-secondary min-h-10 flex-1 text-sm"><ExternalLink size={14} /> Google Maps</a>
                      )}
                      <button type="button" onClick={() => void invite(c.name)} className="ig-btn min-h-10 flex-1 text-sm"><Send size={14} /> Inviter</button>
                    </div>
                  </li>
                ))}
              </ul>
              {limit < others.length && <button type="button" onClick={() => setLimit((n) => n + 30)} className="ig-btn-secondary mt-3">Afficher plus ({others.length - limit})</button>}
            </section>
          )}

          {current.length > 0 && results.length === 0 && (
            <p className="surface-card p-6 text-center text-sm text-muted">{mode === "tous" ? "Aucune entreprise ne fait tout cela à la fois : essaie « Au moins un domaine »." : "Aucune entreprise pour ces domaines."}</p>
          )}
        </>
      )}
      {contact && <ContactSheet to={contact} open onClose={() => setContact(null)} />}
    </div>
  );
}
