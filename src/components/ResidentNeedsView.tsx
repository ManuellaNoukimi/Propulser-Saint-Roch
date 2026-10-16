"use client";
import { notifyResidentProgress } from "@/lib/resident-feedback";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, LocateFixed, Plus, Heart } from "lucide-react";
import { loginHref, useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { isInSaintRoch } from "@/lib/geo";
import { SAINT_ROCH_ATTRIBUTION, SAINT_ROCH_GEOMETRY } from "@/lib/saint-roch-boundary";
import { RESIDENT_NEED_CATEGORIES, approximateResidentPoint, residentZonesOverlap, residentZoneLabel, type ResidentNeed, type ResidentZone } from "@/lib/resident-need-options";

type Payload = { needs: ResidentNeed[]; dailyLimit: number; remaining: number | null };
const FREQUENCIES = [{ value: 0, label: "De temps en temps" }, { value: 1, label: "1 fois par semaine" }, { value: 2, label: "2 fois par semaine" }, { value: 3, label: "3 fois et plus par semaine" }];
class RequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new RequestError(body?.error || "Impossible de joindre le serveur. Réessaie.", response.status);
  return body as T;
}

export function ResidentNeedsView() {
  const { user, loading } = useSession();
  if (loading) return <p role="status" className="p-6 text-sm text-muted">Chargement des besoins…</p>;
  return <ResidentNeedsContent key={user?.id ?? "anonymous"} />;
}

function ResidentNeedsContent() {
  const { user } = useSession();
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusMeters, setRadiusMeters] = useState(300);
  const [category, setCategory] = useState("all");
  const [mine, setMine] = useState(false);
  const [compose, setCompose] = useState(false);
  const [draftCategory, setDraftCategory] = useState("epicerie");
  const [label, setLabel] = useState("");
  const [frequency, setFrequency] = useState(1);
  const [locating, setLocating] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    const result = await request<Payload>("/api/resident-needs", { signal });
    if (signal?.aborted) return;
    setPayload(result); setError(null);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => { void load(controller.signal).catch(() => {
      if (!controller.signal.aborted) setError("Les besoins n’ont pas pu être chargés. Réessaie.");
    }); };
    refresh(); window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); };
  }, [load]);
  useEffect(() => {
    if (compose) document.getElementById("exprimer-besoin")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [compose]);

  const choosePoint = useCallback((lat: number, lng: number) => {
    if (!isInSaintRoch(lng, lat)) { setActionError("Choisis un endroit à l’intérieur de la limite de Saint-Roch."); return; }
    setPoint(approximateResidentPoint(lat, lng)); setActionError(null);
  }, []);
  function locate() {
    if (!navigator.geolocation) { setActionError("La localisation n’est pas disponible. Choisis ta zone sur la carte."); return; }
    setLocating(true); setActionError(null);
    navigator.geolocation.getCurrentPosition((position) => {
      choosePoint(position.coords.latitude, position.coords.longitude); setLocating(false);
    }, () => { setLocating(false); setActionError("Position indisponible ou accès refusé. Tu peux choisir ta zone sur la carte."); }, { timeout: 10000, maximumAge: 60000 });
  }
  function signedIn() {
    if (user) return true;
    router.push(loginHref("/vitrines")); return false;
  }
  async function mutate(url: string, method: string, body?: unknown, message = "Contribution enregistrée.") {
    if (!signedIn() || locked.current) return;
    locked.current = true; setBusy(true); setActionError(null);
    try {
      const result = await request<{ created?: boolean }>(url, { method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
      notifyResidentProgress();
      if (method === "POST") setCompose(false);
      toast(method === "POST" && result.created === false ? "Ce besoin existait déjà : ton soutien est enregistré." : message);
      await load().catch(() => setError("Contribution enregistrée. Actualise la liste pour afficher les derniers résultats."));
    } catch (failure) {
      if (failure instanceof RequestError && failure.status === 401) router.push(loginHref("/vitrines"));
      else setActionError(failure instanceof Error ? failure.message : "Impossible d’enregistrer ta contribution.");
    } finally { locked.current = false; setBusy(false); }
  }
  const needs = payload?.needs ?? [];
  const zone: ResidentZone | null = point ? { ...point, radiusMeters } : null;
  const visible = needs.filter((need) => (!zone || residentZonesOverlap(need.zone, zone)) && (category === "all" || need.category === category) && (!mine || need.mySupport));
  const similar = needs.filter((need) => zone && residentZonesOverlap(need.zone, zone) && need.category === draftCategory);
  const myCount = needs.filter((need) => need.mySupport).length;

  return <div className="mx-auto max-w-[1200px] space-y-5 px-4 py-5 md:px-7 md:py-8">
    <header className="gallery-intro rounded-3xl border border-line px-6 py-7">
      <h1 className="text-3xl font-bold tracking-tight">Vitrine</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">Dis-nous ce qui manque près de chez toi et soutiens les besoins de tes voisins.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="ig-btn min-h-11" onClick={() => { if (signedIn()) { setCompose(true); setMine(false); setActionError(null); } }}><Plus size={17} /> Exprimer un besoin</button>
        <a href="#besoins-residents" className="ig-btn-secondary min-h-11" onClick={() => { setMine(false); setCompose(false); }}>Voir les besoins près de moi</a>
      </div>
    </header>

    <section id="zone-resident" className="surface-card scroll-mt-5 space-y-4 p-4 md:p-5" aria-label="Choisir ma zone">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Ma zone</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ig-btn-secondary min-h-11" onClick={locate} disabled={locating}><LocateFixed size={17} />{locating ? "Localisation…" : "Utiliser ma position"}</button>
          <button type="button" className="ig-btn-secondary min-h-11" onClick={() => setPoint(null)}>Voir tout le quartier</button>
        </div>
      </div>
      <p className="text-sm text-muted">Clique où tu le souhaites dans Saint-Roch, puis ajuste le rayon. Tu peux déplacer le repère pour changer le centre de ta zone.</p>
      <label className="block text-sm font-semibold">Rayon de ma zone
        <select className="ig-input mt-2" value={radiusMeters} onChange={(event) => setRadiusMeters(Number(event.target.value))}>
          {[100, 200, 300, 500, 750, 1000].map((radius) => <option key={radius} value={radius}>{radius < 1000 ? `${radius} m` : "1 km"}</option>)}
        </select>
      </label>
      <p role="status" className="text-sm">{zone ? residentZoneLabel(zone) : "Aucune zone sélectionnée. Clique sur la carte pour la définir."}</p>
      <div className="relative isolate z-0 overflow-hidden rounded-2xl border border-line">
        <ResidentNeedsMap needs={needs.filter((need) => category === "all" || need.category === category)} zone={zone} onPick={choosePoint} />
      </div>
      <p className="text-xs text-muted">Le centre est arrondi pour afficher une zone approximative, pas une adresse personnelle. Le cercle violet représente ta sélection ; les cercles orange, les besoins exprimés.</p>
    </section>

    {actionError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}
    {error && <div role="alert" className="rounded-xl border border-line p-3 text-sm">{error} <button type="button" className="font-semibold text-ig-blue" onClick={() => { void load().catch(() => setError("Impossible de charger la liste. Réessaie.")); }}>Réessayer</button></div>}

    {compose && <section className="surface-card space-y-4 p-5" aria-labelledby="exprimer-besoin">
      <h2 id="exprimer-besoin" className="scroll-mt-6 text-lg font-bold">J’aimerais trouver ici…</h2>
      <p className="text-sm text-muted">{zone ? residentZoneLabel(zone) : "Choisis d’abord ta zone sur la carte."}</p>
      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault(); if (!zone) return;
        void mutate("/api/resident-needs", "POST", { category: draftCategory, label: draftCategory === "autre" ? label : "", frequency, lat: zone.lat, lng: zone.lng, radiusMeters: zone.radiusMeters }, "Ton besoin est enregistré et visible dans ta zone.");
      }}>
        <a href="#zone-resident" className="inline-block text-sm font-semibold text-ig-blue">{zone ? "Modifier ma zone sur la carte" : "Choisir ma zone sur la carte"}</a>
        <label className="block text-sm font-semibold">Type de commerce ou de service
          <select className="ig-input mt-2" value={draftCategory} onChange={(event) => setDraftCategory(event.target.value)}>
            {RESIDENT_NEED_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.emoji} {item.label}</option>)}
          </select>
        </label>
        {draftCategory === "autre" && <label className="block text-sm font-semibold">Quel service souhaites-tu ?
          <input className="ig-input mt-2" value={label} onChange={(event) => setLabel(event.target.value)} minLength={2} maxLength={60} required placeholder="Ex. : atelier de réparation de vélos" />
          <span className="mt-1 block text-xs font-normal text-muted">Indique un service, sans nom de personne ni adresse personnelle.</span>
        </label>}
        <label className="block text-sm font-semibold">J’y irais environ…
          <FrequencySelect frequency={frequency} onChange={setFrequency} />
        </label>
        {similar.length > 0 && <div className="rounded-xl bg-soft p-3 text-sm">
          <p className="font-semibold">Des voisins ont déjà exprimé un besoin similaire :</p>
          <ul className="mt-2 space-y-2">{similar.map((need) => <li key={need.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>{need.label} · {need.supporters} soutien(s)</span>
            <button type="button" className="ig-btn-secondary text-xs" disabled={busy} onClick={() => { void mutate(`/api/resident-needs/${need.id}/support`, "PUT", { frequency }, "Ton soutien est enregistré."); }}>{need.mySupport ? "Actualiser mon soutien" : "Soutenir ce besoin"}</button>
          </li>)}</ul>
          <p className="mt-2 text-xs text-muted">Les demandes identiques dans la même zone sont regroupées automatiquement.</p>
        </div>}
        <div className="flex flex-wrap gap-2">
          <button className="ig-btn min-h-11" type="submit" disabled={busy || !zone || (draftCategory === "autre" && label.trim().length < 2)}>{busy ? "Enregistrement…" : "Enregistrer mon besoin"}</button>
          <button className="ig-btn-secondary min-h-11" type="button" disabled={busy} onClick={() => setCompose(false)}>Annuler</button>
        </div>
      </form>
    </section>}

    <section id="besoins-residents" className="scroll-mt-5 space-y-4" aria-labelledby="titre-besoins">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titre-besoins" className="text-xl font-bold">{mine ? "Mes besoins et mes soutiens" : "Les priorités des voisins"}</h2>
        <button type="button" className="ig-btn-secondary text-sm" aria-pressed={mine} onClick={() => { if (signedIn()) { setMine(!mine); setCompose(false); } }}>{mine ? "Voir tous les besoins" : `Mes contributions (${myCount})`}</button>
      </div>
      <label className="block text-sm font-semibold">Filtrer par besoin
        <select className="ig-input mt-2" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">Tous les services</option>
          {RESIDENT_NEED_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <p className="text-sm text-muted">{visible.length} besoin(s) · classement par nombre de soutiens{user && payload ? ` · ${payload.remaining} nouveau(x) soutien(s) disponible(s) aujourd’hui` : ""}.</p>
      {!payload && !error && <p role="status" className="text-sm text-muted">Chargement des besoins…</p>}
      {payload && !visible.length && <div className="surface-card p-6 text-sm text-muted">{mine ? "Aucune contribution dans cette sélection. Tu peux soutenir un besoin ou exprimer ce qui manque près de toi." : "Aucun besoin dans cette sélection pour le moment. Exprime le premier !"}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((need) => <ResidentNeedCard key={`${need.id}-${need.mySupport?.frequency ?? "none"}`} need={need} busy={busy}
          onSupport={(value) => { void mutate(`/api/resident-needs/${need.id}/support`, "PUT", { frequency: value }); }}
          onWithdraw={() => { void mutate(`/api/resident-needs/${need.id}/support`, "DELETE", undefined, "Ton soutien a été retiré."); }} />)}
      </div>
      <p className="text-xs leading-relaxed text-muted">Un soutien par compte et par besoin. Trois nouveaux soutiens par jour ; les modifications et retraits restent possibles. Les visites sont des intentions déclarées : « 3 et plus » compte pour au moins 3 visites, « de temps en temps » n’ajoute pas de visite hebdomadaire.</p>
    </section>
  </div>;
}

function FrequencySelect({ frequency, onChange, label }: { frequency: number; onChange: (value: number) => void; label?: string }) {
  return <select aria-label={label} className="ig-input mt-2" value={frequency} onChange={(event) => onChange(Number(event.target.value))}>{FREQUENCIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>;
}
function ResidentNeedCard({ need, busy, onSupport, onWithdraw }: { need: ResidentNeed; busy: boolean; onSupport: (frequency: number) => void; onWithdraw: () => void }) {
  const [frequency, setFrequency] = useState(need.mySupport?.frequency ?? 1);
  const category = RESIDENT_NEED_CATEGORIES.find((item) => item.id === need.category)!;
  return <article className="surface-card space-y-3 p-5">
    <p className="flex items-center gap-1 text-xs text-muted"><MapPin size={13} /> {residentZoneLabel(need.zone)}</p>
    <h3 className="text-lg font-bold">{category.emoji} {need.label}</h3>
    <p className="text-sm"><strong>{need.supporters} soutien(s)</strong> · au moins {need.visitsPerWeek} visite(s) par semaine déclarée(s)</p>
    {need.mySupport && <p className="text-sm font-semibold text-ig-blue">Tu soutiens ce besoin.</p>}
    <label className="block text-sm">Ma fréquence de visite souhaitée
      <FrequencySelect frequency={frequency} onChange={setFrequency} label={`Fréquence pour ${need.label} — ${residentZoneLabel(need.zone)}`} />
    </label>
    <div className="flex flex-wrap gap-2">
      <button type="button" className="ig-btn min-h-10 text-sm" disabled={busy || (Boolean(need.mySupport) && frequency === need.mySupport?.frequency)} onClick={() => onSupport(frequency)}><Heart size={15} />{need.mySupport ? "Modifier ma fréquence" : "Moi aussi"}</button>
      {need.mySupport && <button type="button" className="ig-btn-secondary min-h-10 text-sm" disabled={busy} onClick={onWithdraw}>Retirer mon soutien</button>}
    </div>
  </article>;
}

function ResidentNeedsMap({ needs, zone, onPick }: { needs: ResidentNeed[]; zone: ResidentZone | null; onPick: (lat: number, lng: number) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((module) => {
      if (cancelled || !element.current) return;
      const L = module.default; leafletRef.current = L;
      const map = L.map(element.current, { scrollWheelZoom: true, touchZoom: true, doubleClickZoom: true, minZoom: 10, maxZoom: 19 });
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
      map.attributionControl.setPrefix(false).addAttribution(SAINT_ROCH_ATTRIBUTION);
      const ring = SAINT_ROCH_GEOMETRY.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
      L.polygon(ring, { color: "#7552de", weight: 2, dashArray: "6 6", fillOpacity: 0.04, interactive: false }).addTo(map);
      map.fitBounds(L.latLngBounds(ring).pad(0.05));
      map.on("click", (event: Leaflet.LeafletMouseEvent) => onPick(event.latlng.lat, event.latlng.lng));
      layer.current = L.layerGroup().addTo(map); setReady(true);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, [onPick]);
  useEffect(() => {
    const L = leafletRef.current;
    if (!ready || !L || !layer.current) return;
    layer.current.clearLayers();
    for (const need of needs) {
      const circle = L.circle([need.zone.lat, need.zone.lng], { radius: need.zone.radiusMeters, bubblingMouseEvents: false, color: "#e07000", fillColor: "#ff8a00", fillOpacity: 0.12, weight: 2 });
      const text = document.createElement("span"); text.textContent = `${need.label} · ${need.supporters} soutien(s) · rayon ${need.zone.radiusMeters} m`;
      circle.bindTooltip(text).on("click", () => onPick(need.zone.lat, need.zone.lng)).addTo(layer.current);
    }
    if (zone) {
      L.circle([zone.lat, zone.lng], { radius: zone.radiusMeters, color: "#7552de", fillOpacity: 0.2, weight: 3, interactive: false }).addTo(layer.current);
      const marker = L.marker([zone.lat, zone.lng], { draggable: true, title: "Déplacer le centre de ma zone", icon: L.divIcon({ className: "", html: '<span style="display:block;width:24px;height:24px;background:#7552de;border:3px solid white;border-radius:50%;box-shadow:0 1px 5px #333"></span>', iconSize: [24,24], iconAnchor: [12,12] }) });
      marker.on("dragend", () => { const position = marker.getLatLng(); onPick(position.lat, position.lng); }).addTo(layer.current);
    }
  }, [ready, needs, zone, onPick]);
  return <div><div ref={element} className="h-[340px] w-full bg-soft md:h-[420px]" aria-label="Carte de sélection libre de ma zone à Saint-Roch" />{error && <p role="alert" className="p-3 text-sm">Carte indisponible. Réessaie pour choisir une zone.</p>}</div>;
}
