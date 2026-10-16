"use client";
import { notifyResidentProgress } from "@/lib/resident-feedback";

import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import type * as Leaflet from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarRange, Megaphone, Store, Vote, X } from "lucide-react";
import { BOOKING_PROJECTS, FREQUENCIES, WISHES, wishOf } from "@/lib/quartier";
import { SAINT_ROCH_ATTRIBUTION, SAINT_ROCH_GEOMETRY } from "@/lib/saint-roch-boundary";
import { loginHref, useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { addBaseTiles } from "@/lib/map-tiles";

// Les locaux de démonstration sont fictifs ; votes et demandes viennent de SQLite.
type Booking = {
  id: string; vacancyId: string; project: string; title: string; startsOn: string; endsOn: string;
  weeks: number; status: "pending" | "confirmed"; ideaId: string | null;
};
type Vacancy = {
  id: string; label: string; street: string; lat: number | null; lng: number | null; surface: string; details: string;
  locationStatus: string; sourceMemberId: string | null; isDemo: boolean; votes: Record<string, number>; visits: number; bookings: Booking[];
  myVote: { wish: string; frequency: number } | null;
};
type SdcMember = {
  id: string; sourceRow: number; name: string; street: string; activity: string; isVacant: boolean;
  address: string | null; lat: number | null; lng: number | null; locationStatus: string; googleMapsUrl: string;
};
class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(body?.error || "La demande a échoué. Réessaie.", response.status);
  return body as T;
}
function quebecDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
const displayDay = (day: string) => new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

export function VitrinesView() {
  const { user, loading } = useSession();
  if (loading) return <p role="status" className="p-6 text-sm text-muted">Chargement des vitrines…</p>;
  // Une nouvelle session repart sans les votes ni demandes privés du compte précédent.
  return <VitrinesContent key={user?.id ?? "anonymous"} />;
}

function VitrinesContent() {
  const { user } = useSession();
  const router = useRouter();
  const [data, setData] = useState<Vacancy[]>([]);
  const [members, setMembers] = useState<SdcMember[]>([]);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryLimit, setDirectoryLimit] = useState(12);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [selectedId, setSelectedId] = useState("v1");
  const [sheet, setSheet] = useState<"vote" | "book" | "commerce" | null>(null);
  const selected = data.find((v) => v.id === selectedId) ?? data[0];
  const load = useCallback(async (signal?: AbortSignal) => {
    const [locals, mine, directory] = await Promise.all([
      api<{ vacancies: Vacancy[] }>("/api/vacancies", { signal }),
      user ? api<{ bookings: Booking[] }>("/api/vacancy-bookings", { signal }) : Promise.resolve({ bookings: [] }),
      api<{ members: SdcMember[] }>("/api/sdc-members", { signal }),
    ]);
    if (signal?.aborted) return;
    setData(locals.vacancies);
    setMembers(directory.members);
    setMyBookings(mine.bookings);
    setError(null);
  }, [user]);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => { void load(controller.signal).catch(() => {
      if (!controller.signal.aborted) setError("Impossible de charger les vitrines. Réessaie dans un instant.");
    }); };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); };
  }, [load]);

  const totals = useMemo(() => {
    const all: Record<string, number> = {};
    for (const v of data) for (const [w, n] of Object.entries(v.votes)) all[w] = (all[w] ?? 0) + n;
    return Object.entries(all).sort((a, b) => b[1] - a[1]);
  }, [data]);

  function openSheet(kind: "vote" | "book" | "commerce") {
    if (!user) { router.push(loginHref("/vitrines")); return; }
    setSubmitError(null);
    setSheet(kind);
  }
  async function submit(url: string, body: unknown, message: string) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setSubmitError(null);
    try {
      await api(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setSheet(null);
      toast(message);
      notifyResidentProgress();
      // Un échec de relecture ne doit pas présenter une écriture réussie comme un échec.
      await load().catch(() => setError("Enregistrement réussi. Actualise pour retrouver les derniers résultats."));
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) { router.push(loginHref("/vitrines")); return; }
      setSubmitError(failure instanceof Error ? failure.message : "Impossible d'enregistrer. Réessaie.");
    } finally { submitting.current = false; setBusy(false); }
  }
  function vote(wish: string, frequency: number) {
    if (!selected) return;
    void submit(`/api/vacancies/${selected.id}/votes`, { wish, frequency }, "Merci ! Ton vote est enregistré.");
  }
  function book(project: string, title: string, weeks: number, startsOn: string) {
    if (!selected) return;
    void submit(`/api/vacancies/${selected.id}/bookings`, { project, title, weeks, startsOn }, "Demande enregistrée, en attente de confirmation par la SDC.");
  }
  function publishCommerce(kind: string, title: string) {
    void submit("/api/ideas", { title, description: kind === "promo" ? "Promotion du commerce" : kind === "nouveau" ? "Nouveauté du commerce" : "Événement du commerce", category: "commerce", place: user?.address || "Saint-Roch", needs: [], images: [] }, "Publication enregistrée dans le fil du quartier.");
  }
  const directory = members.filter((member) => !member.isVacant && `${member.name} ${member.street} ${member.activity}`.toLocaleLowerCase("fr").includes(directoryQuery.toLocaleLowerCase("fr")));
  const pendingLocations = data.filter((local) => local.locationStatus !== "verified").length;
  const closeSheet = () => { if (!submitting.current) setSheet(null); };
  if (!selected) return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-4 py-8">
      <h1 className="text-3xl font-bold">Vitrine</h1>
      <p role={error ? "alert" : "status"} className="text-sm text-muted">{error || "Chargement des locaux…"}</p>
      {error && <button type="button" className="ig-btn-secondary" onClick={() => { void load().catch(() => setError("Impossible de charger les vitrines. Réessaie.")); }}>Réessayer</button>}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-5 md:px-7 md:py-8">
      <header className="gallery-intro rounded-3xl border border-line px-6 py-7 md:px-8">
        <h1 className="text-[28px] font-bold leading-[1.12] tracking-tight md:text-[36px]">Vitrine</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">Repère les locaux disponibles, vote pour les commerces souhaités et propose un projet éphémère.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-line p-3 text-sm">{error}</p>}

      {members.length > 0 && <section className="surface-card space-y-3 p-4">
        <p className="text-sm"><strong>{data.length} locaux déclarés vacants</strong> dans le fichier SDC · {members.filter((member) => !member.isVacant).length} autres fiches.</p>
        <p className="text-sm text-muted">{pendingLocations} locaux avec une localisation à confirmer. Leur emplacement précis n’est pas encore connu : le fichier ne précise ni les numéros civiques ni les surfaces.</p>
        <label className="block text-sm font-semibold">Choisir un local vacant
          <select className="ig-input mt-2" value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
            {data.map((local) => <option key={local.id} value={local.id}>{local.label} · {local.street}{local.locationStatus !== "verified" ? " · localisation à confirmer" : ""}</option>)}
          </select>
        </label>
      </section>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="relative isolate z-0 overflow-hidden rounded-3xl border border-line bg-bg">
          <VacancyMap members={members} vacancies={data} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <section key={selected.id} className="surface-card animate-fade-in p-5 md:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#e07000]">{selected.isDemo ? "🟠 Local vide · exemple" : "🟠 Déclaré vacant · source SDC"}</p>
          <h2 className="mt-1 text-xl font-bold">{selected.label}, {selected.street}</h2>
          <p className="mt-1 text-sm text-muted">{selected.surface} · {selected.details}</p>

          {selected.locationStatus !== "verified" && <p className="mt-3 rounded-xl bg-soft p-3 text-sm">Localisation à confirmer. L’adresse exacte et la surface ne sont pas fournies. La SDC doit vérifier ce local avant de confirmer une occupation.</p>}
          <h3 className="mt-5 text-sm font-bold">Ce que les gens veulent ici</h3>
          <VoteBars votes={selected.votes} />
          <p className="mt-3 rounded-xl bg-soft px-3 py-2.5 text-sm">
            👉 <span className="font-semibold">{Object.values(selected.votes).reduce((a, b) => a + b, 0)} personnes</span> ont voté, et promettent environ <span className="font-semibold">{selected.visits} visites par semaine</span>. Une preuve de demande, pas un pari.
          </p>

          {selected.bookings.map((booking) => (
            <p key={booking.id} className="mt-3 flex items-start gap-2 rounded-xl border border-ig-blue/30 bg-ig-blue/5 px-3 py-2.5 text-sm">
              <CalendarRange size={17} className="mt-0.5 shrink-0 text-ig-blue" />
              <span><span className="font-semibold">Réservation confirmée :</span> {booking.title}, du {displayDay(booking.startsOn)} au {displayDay(booking.endsOn)} (fin exclusive).</span>
            </p>
          ))}
          {myBookings.filter((booking) => booking.vacancyId === selected.id && booking.status === "pending").map((booking) => (
            <p key={booking.id} role="status" className="mt-3 rounded-xl bg-soft px-3 py-2.5 text-sm"><span className="font-semibold">Ta demande est en attente :</span> {booking.title}, à partir du {displayDay(booking.startsOn)}, {booking.weeks} semaine(s).</p>
          ))}
          {selected.myVote && <p className="mt-3 text-sm text-muted">Ton vote est enregistré : {wishOf(selected.myVote.wish)?.label}.</p>}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => openSheet("vote")} disabled={Boolean(selected.myVote)} className="ig-btn min-h-11 text-sm"><Vote size={17} /> {selected.myVote ? "Vote enregistré" : "Ce que je veux ici"}</button>
            <button type="button" onClick={() => openSheet("book")} className="ig-btn-secondary min-h-11 text-sm"><CalendarRange size={17} /> L&apos;occuper en attendant</button>
          </div>
        </section>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="surface-card p-5 md:p-6">
          <h2 className="font-bold">Ce qui manque le plus, dans tout le quartier</h2>
          <ul className="mt-3 space-y-2">
            {totals.slice(0, 5).map(([w, n], k) => (
              <li key={w} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-right font-bold text-muted">{k + 1}</span>
                <span className="text-lg">{wishOf(w)?.emoji}</span>
                <span className="flex-1">{wishOf(w)?.label}</span>
                <span className="font-semibold tabular-nums">{n} votes</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Le Plan de la Ville le confirme : il manque des épiceries et des boucheries à Saint-Roch.</p>
        </section>
        <section className="surface-card p-5 md:p-6">
          <h2 className="flex items-center gap-2 font-bold"><Store size={18} className="text-ig-blue" /> Mon commerce</h2>
          <p className="mt-1 text-sm text-muted">Tu as un commerce actif ? Publie une promo, une nouveauté ou un événement en 1 minute : ça apparaît dans « Ça se passe à Saint-Roch ».</p>
          <button type="button" onClick={() => openSheet("commerce")} className="ig-btn-secondary mt-4 w-full text-sm"><Megaphone size={16} /> Publier une promo ou une nouveauté</button>
        </section>
      </div>
      {members.length > 0 && <section className="surface-card space-y-3 p-5">
        <h2 className="font-bold">Établissements du fichier SDC</h2>
        <p className="text-sm text-muted">Les repères bleus indiquent les commerces dont la localisation a été vérifiée sur Google Maps. Les liens « Rechercher » ne constituent pas une adresse vérifiée. Les fiches du fichier sont conservées séparément, même si un nom se répète.</p>
        <label className="block text-sm">Rechercher un établissement
          <input className="ig-input mt-2" value={directoryQuery} onChange={(event) => { setDirectoryQuery(event.target.value); setDirectoryLimit(12); }} placeholder="Nom, rue ou activité" />
        </label>
        <p className="text-xs text-muted">{directory.length} fiches correspondent à ta recherche.</p>
        <ul className="grid gap-3 md:grid-cols-2">
          {directory.slice(0, directoryLimit).map((member) => <li key={member.id} className="rounded-xl border border-line p-3 text-sm">
            <p className="font-semibold">{member.name}</p><p className="text-muted">{member.activity}</p>
            <p>{member.address || member.street}</p>
            <p className="text-xs text-muted">{member.locationStatus === "verified" ? "Localisation vérifiée sur Google Maps" : "Localisation à confirmer"} · ligne {member.sourceRow}</p>
            <a href={member.googleMapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-ig-blue">{member.locationStatus === "verified" ? "Voir sur Google Maps" : "Rechercher sur Google Maps"}</a>
          </li>)}
        </ul>
        {directoryLimit < directory.length && <button type="button" className="ig-btn-secondary" onClick={() => setDirectoryLimit((limit) => limit + 24)}>Afficher plus de fiches</button>}
      </section>}
      <p className="text-[11px] text-muted">{members.length ? "Source : fichier des membres SDC fourni. Le statut vacant est celui du fichier, sans vérification récente de disponibilité." : "Démo : locaux et adresses fictifs."} Les votes et demandes sont enregistrés. Fond de carte © OpenStreetMap contributors.</p>

      {sheet === "vote" && <VoteSheet onClose={closeSheet} onVote={vote} busy={busy} error={submitError} />}
      {sheet === "book" && <BookSheet onClose={closeSheet} onBook={book} busy={busy} error={submitError} />}
      {sheet === "commerce" && <CommerceSheet onClose={closeSheet} onPublish={publishCommerce} busy={busy} error={submitError} />}
    </div>
  );
}

function VoteBars({ votes }: { votes: Record<string, number> }) {
  const list = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...list.map(([, n]) => n));
  if (!list.length) return <p className="mt-3 text-sm text-muted">Aucun vote pour le moment. Sois la première personne à voter !</p>;
  return (
    <ul className="mt-3 space-y-2.5">
      {list.map(([w, n], k) => (
        <li key={w}>
          <div className="flex items-center justify-between text-sm">
            <span>{wishOf(w)?.emoji} {wishOf(w)?.label}</span>
            <span className="font-semibold tabular-nums">{n}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-sep">
            <div className={`h-full rounded-full transition-all duration-700 ${k === 0 ? "bg-[#ff8a00]" : "bg-ig-blue/50"}`} style={{ width: `${(n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-fade-in md:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[88dvh] w-full max-w-md animate-sheet-up overflow-y-auto rounded-t-3xl bg-bg p-5 pb-[calc(20px+env(safe-area-inset-bottom))] md:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-full hover:bg-soft"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function VoteSheet({ onClose, onVote, busy, error }: { onClose: () => void; onVote: (wish: string, perWeek: number) => void; busy: boolean; error: string | null }) {
  const [wish, setWish] = useState<string | null>(null);
  const [freq, setFreq] = useState(1);
  return (
    <Sheet title="Ce que je veux ici" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {WISHES.map((w) => (
          <button key={w.id} type="button" aria-pressed={wish === w.id} onClick={() => setWish(w.id)}
            className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 text-left text-sm transition active:scale-[0.98] ${wish === w.id ? "border-ig-blue bg-ig-blue/10 font-semibold" : "border-line"}`}>
            <span className="text-lg">{w.emoji}</span> {w.label}
          </button>
        ))}
      </div>
      <p className="mt-5 text-sm font-semibold">J&apos;y irais environ…</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {FREQUENCIES.map((f) => (
          <button key={f.id} type="button" aria-pressed={freq === f.id} onClick={() => setFreq(f.id)}
            className={`min-h-10 rounded-full border px-3.5 text-xs font-medium transition ${freq === f.id ? "border-fg bg-fg text-bg" : "border-line"}`}>{f.label}</button>
        ))}
      </div>
      <button type="button" disabled={!wish || busy} onClick={() => wish && onVote(wish, freq)} className="ig-btn mt-6 min-h-11 w-full text-sm">{busy ? "Enregistrement…" : "Voter"}</button>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </Sheet>
  );
}

function BookSheet({ onClose, onBook, busy, error }: { onClose: () => void; onBook: (project: string, title: string, weeks: number, startsOn: string) => void; busy: boolean; error: string | null }) {
  const [project, setProject] = useState<string>("expo");
  const [title, setTitle] = useState("");
  const [weeks, setWeeks] = useState(2);
  const [startsOn, setStartsOn] = useState(() => quebecDay(new Date(Date.now() + 7 * 86400000)));
  return (
    <Sheet title="L'occuper en attendant" onClose={onClose}>
      <p className="text-sm text-muted">Artiste, étudiant·e, organisme, créateur·rice : réserve la vitrine de 1 à 4 semaines.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {BOOKING_PROJECTS.map((p) => (
          <button key={p.id} type="button" aria-pressed={project === p.id} onClick={() => setProject(p.id)}
            className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 text-left text-sm transition ${project === p.id ? "border-ig-blue bg-ig-blue/10 font-semibold" : "border-line"}`}>
            <span className="text-lg">{p.emoji}</span> {p.label}
          </button>
        ))}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Nom du projet (ex. : Expo photo du quartier)" className="ig-input mt-4" />
      <label className="mt-4 block text-sm font-semibold">Date de début
        <input type="date" value={startsOn} min={quebecDay()} required onChange={(event) => setStartsOn(event.target.value)} className="ig-input mt-2" />
      </label>
      <p className="mt-4 text-sm font-semibold">Durée</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((w) => (
          <button key={w} type="button" aria-pressed={weeks === w} onClick={() => setWeeks(w)}
            className={`min-h-10 rounded-xl text-sm font-bold transition ${weeks === w ? "bg-ig-blue text-white" : "bg-soft"}`}>{w} sem.</button>
        ))}
      </div>
      <button type="button" disabled={busy || !startsOn || startsOn < quebecDay()} onClick={() => onBook(project, title.trim() || BOOKING_PROJECTS.find((p) => p.id === project)!.label, weeks, startsOn)} className="ig-btn mt-6 min-h-11 w-full text-sm">{busy ? "Enregistrement…" : "Demander la vitrine"}</button>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </Sheet>
  );
}

function CommerceSheet({ onClose, onPublish, busy, error }: { onClose: () => void; onPublish: (kind: string, title: string) => void; busy: boolean; error: string | null }) {
  const [kind, setKind] = useState("promo");
  const [title, setTitle] = useState("");
  return (
    <Sheet title="Mon commerce" onClose={onClose}>
      <div className="grid grid-cols-3 gap-2">
        {[["promo", "🏷️ Promo"], ["nouveau", "✨ Nouveauté"], ["evenement", "📅 Événement"]].map(([id, l]) => (
          <button key={id} type="button" aria-pressed={kind === id} onClick={() => setKind(id)}
            className={`min-h-11 rounded-xl border text-xs font-semibold transition ${kind === id ? "border-ig-blue bg-ig-blue/10" : "border-line"}`}>{l}</button>
        ))}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Ex. : 2e café à moitié prix cet après-midi" className="ig-input mt-4" />
      <button type="button" disabled={busy || !title.trim()} onClick={() => onPublish(kind, title.trim())} className="ig-btn mt-5 min-h-11 w-full text-sm">{busy ? "Publication…" : "Publier"}</button>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </Sheet>
  );
}

/** Carte Leaflet : quartier en clair, pastilles orange pour les locaux vides. */
function VacancyMap({ vacancies, members, selectedId, onSelect }: { vacancies: Vacancy[]; members: SdcMember[]; selectedId: string; onSelect: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || mapRef.current) return;
      LRef.current = L;
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const map = L.map(el.current, { zoomControl: false, scrollWheelZoom: false, minZoom: 13, maxZoom: 19 });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      map.attributionControl.setPrefix(false).addAttribution(SAINT_ROCH_ATTRIBUTION);
      // Même fond de carte que le reste de l'app (clair/sombre, sans clé API) : src/lib/map-tiles.ts
      addBaseTiles(L, map);
      const ring = (SAINT_ROCH_GEOMETRY.coordinates[0] as readonly (readonly number[])[]).map(([lng, lat]) => [lat, lng] as [number, number]);
      const world: [number, number][] = [[-89, -179], [-89, 179], [89, 179], [89, -179]];
      L.polygon([world, ring], { stroke: false, fillColor: dark ? "#000" : "#252137", fillOpacity: dark ? 0.45 : 0.16, interactive: false }).addTo(map);
      L.polygon(ring, { color: "#7552de", weight: 2, dashArray: "6 6", fill: false, interactive: false }).addTo(map);
      map.fitBounds(L.latLngBounds(ring).pad(0.05));
      layer.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // la carte n'est créée qu'une fois
  }, []);

  useEffect(() => {
    const L = LRef.current;
    if (!ready || !L || !layer.current) return;
    layer.current.clearLayers();
    for (const member of members) {
      if (member.isVacant || member.locationStatus !== "verified" || member.lat === null || member.lng === null) continue;
      const content = document.createElement("div");
      const title = document.createElement("strong"); title.textContent = member.name;
      const address = document.createElement("p"); address.textContent = member.address || member.street;
      const link = document.createElement("a"); link.href = member.googleMapsUrl; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = "Voir sur Google Maps";
      content.append(title, address, link);
      L.circleMarker([member.lat, member.lng], { radius: 8, color: "#fff", weight: 2, fillColor: "#2563eb", fillOpacity: 1 }).bindPopup(content).addTo(layer.current);
    }
    for (const v of vacancies) {
      if (v.locationStatus !== "verified" || v.lat === null || v.lng === null) continue;
      const on = v.id === selectedId;
      L.marker([v.lat, v.lng], {
        icon: L.divIcon({ html: `<div class="vac-pin ${on ? "vac-pin--on" : ""}"><span>🏬</span></div>`, className: "", iconSize: [38, 38], iconAnchor: [19, 19] }),
        title: v.label, keyboard: true, zIndexOffset: on ? 1000 : 0,
      }).on("click", () => onSelect(v.id)).addTo(layer.current);
    }
    const sel = vacancies.find((v) => v.id === selectedId);
    if (sel && sel.lat !== null && sel.lng !== null) mapRef.current?.panTo([sel.lat, sel.lng], { animate: true });
  }, [ready, vacancies, members, selectedId, onSelect]);

  return <div ref={el} className="h-[320px] w-full bg-soft md:h-[460px]" aria-label="Carte des locaux vides de Saint-Roch" />;
}
