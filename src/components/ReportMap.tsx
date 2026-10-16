"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, Hash, List, LoaderCircle, LocateFixed, Lock, MapPin, MapPinPlus, Maximize2, Search, Trash2, X } from "lucide-react";
import {
  MAX_REPORT_PHOTOS,
  REPORT_CATEGORIES,
  REPORT_KINDS,
  REPORT_MOMENTS,
  reportCategoryOf,
  reportMomentOf,
  type ReportCategoryId,
  type ReportKindId,
  type ReportMomentId,
} from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { isInSaintRoch } from "@/lib/geo";
import { SAINT_ROCH_ATTRIBUTION, SAINT_ROCH_BOUNDS, SAINT_ROCH_CENTER, SAINT_ROCH_GEOMETRY } from "@/lib/saint-roch-boundary";
import { loginHref, useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import type { Report } from "@/lib/types";
import { compressImage } from "./ImagePicker";
import { addBaseTiles } from "@/lib/map-tiles";
import { InterfaceIcon } from "@/components/InterfaceIcon";

type LatLng = { lat: number; lng: number };
type Place = { label: string | null; detail: string | null };
type Mode = "browse" | "place" | "form" | "done"; // parcourir → placer la pastille → décrire → confirmation
type SearchResult = { label: string; detail: string | null; lat: number; lng: number };
type Me = LatLng & { accuracy: number };

const KIND_COLOR: Record<string, string> = { besoin: "#22a06b", probleme: "#ff3040" };
const PIN_PATH = "M20 2C10.1 2 2 10.1 2 20c0 13 18 30 18 30s18-17 18-30C38 10.1 29.9 2 20 2z";
const PIN_SIZE: [number, number] = [40, 52];
const PIN_ANCHOR: [number, number] = [20, 51]; // la pointe de la goutte
const SR_CENTER: LatLng = { lat: SAINT_ROCH_CENTER[1], lng: SAINT_ROCH_CENTER[0] };
const RING = (SAINT_ROCH_GEOMETRY.coordinates[0] as readonly (readonly number[])[]).map(([lng, lat]) => [lat, lng] as [number, number]);

// Exemples affichés dans le champ « Explique » selon la catégorie (des lieux, jamais des personnes).
const EXAMPLES: Record<string, string> = {
  epicerie: "Ex. : aucune épicerie à distance de marche pour les familles de la rue.",
  commerce: "Ex. : il manque une pharmacie ou un dépanneur près d'ici.",
  bancs: "Ex. : aucun banc pour se reposer entre l'arrêt d'autobus et le parc.",
  toilettes: "Ex. : pas de toilettes publiques près de la place.",
  eau: "Ex. : un point d'eau serait utile l'été pour les promeneurs.",
  verdure: "Ex. : coin très minéral, quelques arbres feraient du bien.",
  jeux: "Ex. : les enfants du secteur n'ont pas de jeux à proximité.",
  velo: "Ex. : aucun support à vélos devant les commerces.",
  accessibilite: "Ex. : trottoir sans bateau pavé, difficile en fauteuil ou en poussette.",
  activites: "Ex. : rien à faire ici le soir pour les jeunes.",
  lumiere: "Ex. : ce coin est très sombre le soir, les lampadaires sont éteints.",
  salete: "Ex. : des déchets s'accumulent près de l'entrée de la ruelle.",
  vol: "Ex. : plusieurs vélos volés à cet endroit ce mois-ci.",
  insecurite: "Ex. : passage peu éclairé où l'on ne se sent pas à l'aise le soir.",
  chaussee: "Ex. : nid-de-poule profond au milieu de la traverse.",
  chantier: "Ex. : le chantier bloque le trottoir sans détour indiqué.",
  bruit: "Ex. : bruit de machinerie très tôt le matin.",
  graffiti: "Ex. : graffitis sur le mur de la ruelle.",
};

// Vert = besoin, rouge = probleme ; le titre du repere conserve sa categorie.
function pinHtml(color: string, extra = "") {
  return `<div class="rpin ${extra}" style="--pin:${color}"><svg viewBox="0 0 40 52" aria-hidden="true"><path d="${PIN_PATH}"/></svg><span aria-hidden="true">&#8226;</span></div>`;
}

const keyOf = (p: LatLng) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
const addressOf = (p: Place | null) => (p?.label ? [p.label, p.detail].filter(Boolean).join(" · ").slice(0, 160) : null);

/** Distance à vol d'oiseau en km (pour « tu es à 4,2 km de Saint-Roch »). */
function distanceKm(a: LatLng, b: LatLng) {
  const rad = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Petite barre de progression des 3 étapes : Où ? → Quoi ? → Détails. */
function Steps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {[1, 2, 3].map((k) => (
        <span key={k} className={`h-1 flex-1 rounded-full transition-colors ${k <= step ? "bg-ig-blue" : "bg-sep"}`} />
      ))}
    </div>
  );
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className="grid h-12 w-12 place-items-center rounded-full border border-line bg-bg text-fg shadow-lg transition active:scale-90">
      {children}
    </button>
  );
}

/**
 * Onglet « Signaler », façon applis municipales (311) : on cherche une adresse ou on utilise sa position,
 * on place une pastille en déplaçant la carte, on choisit quoi signaler, on ajoute détails et photos.
 * Les signalements sont PRIVÉS : chaque personne ne voit que les siens (la vue par secteur pour la Ville viendra plus tard).
 */
export function ReportMap() {
  const router = useRouter();
  const { user, loading } = useSession();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const pinsRef = useRef<Leaflet.LayerGroup | null>(null);
  const meLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  // Dernières valeurs, lues par les événements de la carte (créés une seule fois)
  const userRef = useRef(user);
  const modeRef = useRef<Mode>("browse");
  const selectedRef = useRef<string | null>(null);

  const [ready, setReady] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [mode, setMode] = useState<Mode>("browse");
  const [center, setCenter] = useState<LatLng>(SR_CENTER);
  const [moving, setMoving] = useState(false);
  const [place, setPlace] = useState<{ key: string; value: Place } | null>(null); // dernière adresse trouvée
  const [draft, setDraft] = useState<{ pos: LatLng; place: Place | null } | null>(null);
  const [created, setCreated] = useState<Report | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [filter, setFilter] = useState<"tous" | ReportKindId>("tous");
  const [me, setMe] = useState<Me | null>(null);
  const [locating, setLocating] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    userRef.current = user;
    modeRef.current = mode;
    selectedRef.current = selectedId;
  }, [user, mode, selectedId]);

  // 1) Création de la carte (Leaflet chargé seulement dans le navigateur)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !container.current || mapRef.current) return;
      LRef.current = L;
      const [[w, s], [e, n]] = SAINT_ROCH_BOUNDS;
      const map = L.map(container.current, {
        center: [SR_CENTER.lat, SR_CENTER.lng],
        zoom: 15,
        minZoom: 13,
        maxZoom: 19,
        maxBounds: L.latLngBounds([s - 0.02, w - 0.03], [n + 0.02, e + 0.03]),
        zoomControl: false,
        attributionControl: true,
      });
      // Sur téléphone, on zoome avec deux doigts ; les boutons + / − seulement sur ordinateur
      if (window.matchMedia("(min-width: 768px)").matches) L.control.zoom({ position: "topright" }).addTo(map);
      map.attributionControl.setPrefix(false).addAttribution(SAINT_ROCH_ATTRIBUTION);

      // Fond détaillé (rues, parcs, commerces) en mode clair, sombre sinon
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      addBaseTiles(L, map);

      // Saint-Roch en clair, le reste grisé (masque), et le contour en bleu
      const world: [number, number][] = [[-89, -179], [-89, 179], [89, 179], [89, -179]];
      L.polygon([world, RING], { stroke: false, fillColor: dark ? "#000" : "#262626", fillOpacity: dark ? 0.45 : 0.18, interactive: false }).addTo(map);
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--blue").trim() || "#0096d6"; // couleur du thème
      L.polygon(RING, { color: accent, weight: 2.5, dashArray: "6 6", fill: false, interactive: false }).addTo(map);
      map.fitBounds(L.latLngBounds(RING), { padding: [24, 24] });

      pinsRef.current = L.layerGroup().addTo(map);
      meLayerRef.current = L.layerGroup().addTo(map);

      map.on("movestart", () => setMoving(true));
      map.on("moveend", () => {
        const c = map.getCenter();
        setCenter({ lat: c.lat, lng: c.lng });
        setMoving(false);
      });
      map.on("click", (ev: Leaflet.LeafletMouseEvent) => {
        const { lat, lng } = ev.latlng;
        if (modeRef.current === "place") {
          map.panTo([lat, lng]); // la pastille centrale vient à l'endroit touché
          return;
        }
        if (modeRef.current !== "browse") return;
        if (selectedRef.current) {
          setSelectedId(null); // premier toucher : on ferme la fiche ouverte
          return;
        }
        if (!userRef.current) {
          toast("Connecte-toi pour signaler un besoin");
          router.push(loginHref("/signaler"));
          return;
        }
        if (!isInSaintRoch(lng, lat)) {
          toast("Touche un endroit à l'intérieur de Saint-Roch (zone en pointillés)");
          return;
        }
        setMode("place");
        map.flyTo([lat, lng], Math.max(map.getZoom(), 17), { duration: 0.5 });
      });

      mapRef.current = map;
      const c = map.getCenter();
      setCenter({ lat: c.lat, lng: c.lng });
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [router]);

  // 2) Mes signalements
  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetch("/api/reports", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { reports: [] }))
      .then((d: { reports: Report[] }) => alive && setReports(d.reports))
      .catch(() => alive && setReports([]));
    return () => {
      alive = false;
    };
  }, [user]);

  const visibleReports = useMemo(() => (user ? reports : []), [user, reports]);
  const selected = visibleReports.find((r) => r.id === selectedId) ?? null;

  // 3) Pastilles (gouttes) de mes signalements
  useEffect(() => {
    const L = LRef.current;
    const layer = pinsRef.current;
    if (!ready || !L || !layer) return;
    layer.clearLayers();
    for (const r of visibleReports) {
      const c = reportCategoryOf(r.category);
      const extra = [r.id === selectedId && "rpin--on", r.id === newId && "rpin--new", mode === "place" && "rpin--dim"].filter(Boolean).join(" ");
      L.marker([r.lat, r.lng], {
        icon: L.divIcon({ html: pinHtml(KIND_COLOR[r.kind] ?? "#0095f6", extra), className: "", iconSize: PIN_SIZE, iconAnchor: PIN_ANCHOR }),
        keyboard: mode === "browse",
        interactive: mode === "browse",
        title: c?.label,
        riseOnHover: true,
        zIndexOffset: r.id === selectedId ? 1000 : 0,
      })
        .on("click", () => {
          setSelectedId(r.id);
          mapRef.current?.panTo([r.lat, r.lng]);
        })
        .addTo(layer);
    }
  }, [ready, visibleReports, selectedId, newId, mode]);

  // 4) Ma position : point bleu qui pulse + cercle de précision
  useEffect(() => {
    const L = LRef.current;
    const layer = meLayerRef.current;
    if (!ready || !L || !layer) return;
    layer.clearLayers();
    if (!me) return;
    L.circle([me.lat, me.lng], { radius: Math.min(me.accuracy, 300), color: "#1a73e8", weight: 1, opacity: 0.4, fillColor: "#1a73e8", fillOpacity: 0.12, interactive: false }).addTo(layer);
    L.marker([me.lat, me.lng], {
      icon: L.divIcon({ html: '<div class="me-dot"></div>', className: "", iconSize: [18, 18], iconAnchor: [9, 9] }),
      interactive: false,
      keyboard: false,
      zIndexOffset: -100,
    }).addTo(layer);
  }, [ready, me]);

  // 5) Adresse du point visé (centre de la carte en mode « place », ou point confirmé) : anti-rebond + annulation
  const inside = isInSaintRoch(center.lng, center.lat);
  const centerKey = keyOf(center);
  const targetKey = mode === "place" ? (moving ? null : centerKey) : mode === "form" && draft && !draft.place ? keyOf(draft.pos) : null;
  const placeKey = place?.key ?? null;
  useEffect(() => {
    if (!targetKey || placeKey === targetKey) return;
    const [lat, lng] = targetKey.split(",").map(Number);
    if (!isInSaintRoch(lng, lat)) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { label: null, detail: null }))
        .then((p: Place) => setPlace({ key: targetKey, value: { label: p.label ?? null, detail: p.detail ?? null } }))
        .catch((e: unknown) => {
          if ((e as Error)?.name !== "AbortError") setPlace({ key: targetKey, value: { label: null, detail: null } });
        });
    }, 450);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [targetKey, placeKey]);

  const placeFor = (p: LatLng) => (place?.key === keyOf(p) ? place.value : null);
  const placeHere = mode === "place" && !moving ? placeFor(center) : null;
  const placeLoading = mode === "place" && !moving && inside && !placeHere;
  const draftPlace = draft ? (draft.place ?? placeFor(draft.pos)) : null;

  // Échap : ferme ce qui est ouvert
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (listOpen) setListOpen(false);
      else if (mode !== "browse") {
        setMode("browse");
        setDraft(null);
      } else setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listOpen, mode]);

  /** Passe en mode « placer la pastille », éventuellement à un endroit précis. */
  function startPlacing(pos?: LatLng) {
    if (!user) {
      router.push(loginHref("/signaler"));
      return;
    }
    setSelectedId(null);
    setListOpen(false);
    setResults(null);
    setSearchMsg(null);
    setDraft(null);
    setMode("place");
    navigator.vibrate?.(10);
    const map = mapRef.current;
    if (!map) return;
    if (pos) map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 17), { duration: 0.6 });
    else if (!inside) map.flyTo([SR_CENTER.lat, SR_CENTER.lng], 16, { duration: 0.6 });
  }

  function confirmPlace() {
    if (!inside || moving) return;
    setDraft({ pos: center, place: placeHere });
    setMode("form");
  }

  function cancelFlow() {
    setMode("browse");
    setDraft(null);
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (query.length < 2) return;
    setSearching(true);
    setSearchMsg(null);
    setResults(null);
    const d: { results: SearchResult[]; unavailable?: boolean } = await fetch(`/api/geo/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .catch(() => ({ results: [], unavailable: true }));
    setSearching(false);
    if (d.unavailable) setSearchMsg("Recherche d'adresse indisponible pour l'instant (Internet ?). Tu peux déplacer la carte à la main.");
    else if (!d.results?.length) setSearchMsg("Aucun résultat dans Saint-Roch. Essaie un numéro et une rue, ex. « 350 rue Saint-Joseph Est ».");
    setResults(d.results ?? []);
  }

  function pickResult(r: SearchResult) {
    setResults(null);
    setSearchMsg(null);
    setQ(r.label);
    (document.activeElement as HTMLElement | null)?.blur();
    setPlace({ key: keyOf(r), value: { label: r.label, detail: r.detail } });
    if (user) startPlacing(r);
    else mapRef.current?.flyTo([r.lat, r.lng], 18, { duration: 0.6 });
  }

  function locate() {
    if (!("geolocation" in navigator)) return toast("Cet appareil ne donne pas sa position.");
    if (!window.isSecureContext) {
      return toast("La position exige une connexion sécurisée (https). Sur téléphone en http://…, déplace la carte à la main ");
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        setMe({ ...pos, accuracy: p.coords.accuracy });
        if (!isInSaintRoch(pos.lng, pos.lat)) {
          const d = distanceKm(pos, SR_CENTER);
          const km = d < 10 ? d.toFixed(1).replace(".", ",") : String(Math.round(d));
          toast(`Tu es à environ ${km} km de Saint-Roch : déplace la carte jusqu'au quartier pour signaler.`);
          return;
        }
        if (userRef.current && modeRef.current === "browse") startPlacing(pos);
        else mapRef.current?.flyTo([pos.lat, pos.lng], 17, { duration: 0.6 });
      },
      (err) => {
        setLocating(false);
        toast(err.code === err.PERMISSION_DENIED
          ? "Position refusée. Autorise-la dans les réglages, ou déplace la carte à la main."
          : "Position introuvable pour l'instant. Déplace la carte à la main.");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  }

  const fitAll = () => mapRef.current?.flyToBounds(RING, { padding: [24, 24], duration: 0.6 });

  async function remove(r: Report) {
    const res = await fetch(`/api/reports/${r.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return toast("Impossible de retirer ce signalement.");
    setReports((list) => list.filter((x) => x.id !== r.id));
    setSelectedId(null);
    toast("Signalement retiré");
  }

  function focus(r: Report) {
    setListOpen(false);
    setSelectedId(r.id);
    mapRef.current?.flyTo([r.lat, r.lng], 17, { duration: 0.6 });
  }

  function onCreated(r: Report) {
    setReports((list) => [r, ...list]);
    setCreated(r);
    setNewId(r.id);
    setDraft(null);
    setMode("done");
    navigator.vibrate?.([12, 40, 12]);
  }

  function showOnMap(r: Report) {
    setMode("browse");
    setSelectedId(r.id);
    mapRef.current?.flyTo([r.lat, r.lng], 17, { duration: 0.6 });
  }

  const counts = { besoin: visibleReports.filter((r) => r.kind === "besoin").length, probleme: visibleReports.filter((r) => r.kind === "probleme").length };
  const listed = filter === "tous" ? visibleReports : visibleReports.filter((r) => r.kind === filter);
  const onMapScreen = mode === "browse" || mode === "place";
  const createdCat = created ? reportCategoryOf(created.category) : null;

  return (
    <div className="relative -mb-1 h-[calc(100dvh-136px-env(safe-area-inset-bottom))] md:-mb-8 md:h-dvh">
      <div ref={container} className="absolute inset-0 z-0 bg-soft" role="application" aria-label="Carte de Saint-Roch : touche un endroit pour signaler" />

      {/* Recherche d'adresse (on cherche quand on valide : pas d'autocomplétion, règle d'OpenStreetMap) */}
      {onMapScreen && (
        <div className="absolute inset-x-3 top-3 z-[550] mx-auto max-w-md">
          <form onSubmit={runSearch} role="search"
            className="flex h-12 items-center gap-2 rounded-full border border-line bg-bg/95 pl-4 pr-1.5 shadow-lg backdrop-blur focus-within:border-ig-blue">
            <Search size={18} className="shrink-0 text-muted" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setResults(null);
                setSearchMsg(null);
              }}
              placeholder="Rechercher une adresse ou un lieu"
              aria-label="Rechercher une adresse dans Saint-Roch"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted focus-visible:outline-none md:text-sm"
            />
            {searching ? (
              <LoaderCircle size={18} className="mr-2.5 animate-spin text-muted" />
            ) : q ? (
              <button type="button" aria-label="Effacer la recherche" onClick={() => { setQ(""); setResults(null); setSearchMsg(null); }}
                className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-soft">
                <X size={18} />
              </button>
            ) : null}
          </form>
          {(searchMsg || (results && results.length > 0)) && (
            <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-bg shadow-xl animate-fade-in">
              {searchMsg && <p className="px-4 py-3 text-sm text-muted">{searchMsg}</p>}
              {results?.map((r) => (
                <button key={`${r.lat},${r.lng}`} type="button" onClick={() => pickResult(r)}
                  className="flex w-full items-center gap-3 border-t border-sep px-4 py-3 text-left first:border-t-0 hover:bg-soft">
                  <MapPin size={18} className="shrink-0 text-ig-blue" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{r.label}</span>
                    {r.detail && <span className="block truncate text-xs text-muted">{r.detail}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
          {mode === "browse" && !searchMsg && !results?.length && (
            <p className="pointer-events-none mt-2 flex w-fit items-center gap-1.5 rounded-full bg-bg/90 px-3 py-1.5 text-xs text-muted shadow backdrop-blur">
              <Lock size={12} /> Tes pastilles sont privées : toi seul·e les vois
            </p>
          )}
        </div>
      )}

      {/* Pastille centrale : on déplace la carte dessous (elle se soulève, puis retombe) */}
      {mode === "place" && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[450]" aria-hidden="true">
          <div key={moving ? "up" : centerKey} className={`center-pin ${moving ? "is-moving" : "is-landed"} ${!moving && !inside ? "is-out" : ""}`}>
            <svg viewBox="0 0 40 52"><path d={PIN_PATH} /></svg>
          </div>
          <div className={`center-pin-dot ${moving ? "is-moving" : ""}`} />
        </div>
      )}

      {/* Boutons ronds : ma position, tout Saint-Roch */}
      {onMapScreen && !selected && (
        <div className={`absolute right-3 z-[540] flex flex-col gap-2 ${mode === "place" ? "bottom-[calc(196px+env(safe-area-inset-bottom))] md:bottom-[204px]" : "bottom-[76px]"}`}>
          <MapButton label="Ma position" onClick={locate}>
            {locating ? <LoaderCircle size={20} className="animate-spin" /> : <LocateFixed size={20} />}
          </MapButton>
          <MapButton label="Voir tout Saint-Roch" onClick={fitAll}>
            <Maximize2 size={18} />
          </MapButton>
        </div>
      )}

      {/* Rangée du bas : mes signalements + bouton principal */}
      {mode === "browse" && !selected && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] flex items-end justify-between gap-2">
          {user ? (
            <button type="button" onClick={() => setListOpen(true)}
              className="pointer-events-auto flex h-12 items-center gap-2 rounded-full border border-line bg-bg px-4 text-sm font-semibold shadow-lg transition active:scale-95">
              <List size={16} /> Mes signalements
              <span className="rounded-full bg-sep px-2 py-0.5 text-xs">{visibleReports.length}</span>
            </button>
          ) : (
            <span />
          )}
          {!loading && (
            <button type="button" onClick={() => startPlacing()} className="ig-btn pointer-events-auto h-12 rounded-full px-5 shadow-lg">
              <MapPinPlus size={18} /> {user ? "Signaler ici" : "Se connecter pour signaler"}
            </button>
          )}
        </div>
      )}

      {/* Étape 1 : où ? */}
      {mode === "place" && (
        <div className="absolute inset-x-0 bottom-0 z-[600] md:inset-x-3 md:bottom-3">
          <div className="mx-auto max-w-md animate-sheet-up rounded-t-3xl border border-line bg-bg p-4 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-2xl md:rounded-3xl md:pb-4">
            <Steps step={1} />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">Étape 1 sur 3 · Où ?</p>
            <div className="mt-1.5 flex items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${moving || inside ? "bg-ig-blue/10 text-ig-blue" : "bg-ig-red/10 text-ig-red"}`}>
                <MapPin size={19} />
              </span>
              <div className="min-w-0 flex-1" aria-live="polite">
                <p className="truncate font-semibold">
                  {moving ? "On déplace la pastille…" : !inside ? "Hors de Saint-Roch" : (placeHere?.label ?? (placeLoading ? "Recherche de l'adresse…" : "Point choisi sur la carte"))}
                </p>
                <p className="truncate text-sm text-muted">
                  {!moving && !inside ? "Déplace la carte pour mettre la pastille dans la zone en pointillés." : (placeHere?.detail ?? "Glisse la carte : la pointe marque l'endroit exact.")}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={cancelFlow} className="ig-btn-secondary flex-1">Annuler</button>
              <button type="button" onClick={confirmPlace} disabled={moving || !inside} className="ig-btn flex-[2]">Confirmer cet endroit</button>
            </div>
          </div>
        </div>
      )}

      {/* Étapes 2 et 3 : quoi ? détails */}
      {mode === "form" && draft && (
        <ReportForm draft={draft} place={draftPlace} onEditPlace={() => setMode("place")} onCancel={cancelFlow} onCreated={onCreated} />
      )}

      {/* Confirmation, avec un numéro comme une requête 311 */}
      {mode === "done" && created && (
        <div className="absolute inset-x-0 bottom-0 z-[600] md:inset-x-3 md:bottom-3">
          <div role="status" className="relative mx-auto max-w-md animate-sheet-up rounded-t-3xl border border-line bg-bg p-5 pb-[calc(20px+env(safe-area-inset-bottom))] text-center shadow-2xl md:rounded-3xl md:pb-5">
            <button type="button" onClick={() => setMode("browse")} aria-label="Fermer" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full hover:bg-soft">
              <X size={20} />
            </button>
            <span className="success-check mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#1f8a3b] text-white">
              <Check size={34} strokeWidth={3} />
            </span>
            <h2 className="mt-3 text-lg font-bold">Merci ! Signalement enregistré</h2>
            <p className="mt-1 truncate text-sm text-muted">
               {createdCat?.label} · {created.address ?? "Point choisi sur la carte"}
            </p>
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-soft px-3 py-1 text-sm font-semibold">
              <Hash size={14} /> N° {created.ref}
            </p>
            <ol className="mx-auto mt-4 max-w-xs space-y-2 text-left text-sm">
              <li className="flex items-center gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#1f8a3b] text-white"><Check size={14} strokeWidth={3} /></span>
                <span><b>Reçu</b> · à l&apos;instant</span>
              </li>
              <li className="flex items-center gap-2.5 text-muted">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-line text-[11px] font-semibold">2</span>
                <span>Regroupé avec les signalements du secteur <i>(à venir)</i></span>
              </li>
              <li className="flex items-center gap-2.5 text-muted">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-line text-[11px] font-semibold">3</span>
                <span>Transmis à la Ville <i>(à venir)</i></span>
              </li>
            </ol>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted"><Lock size={12} /> Visible seulement par toi.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => showOnMap(created)} className="ig-btn-secondary flex-1">Voir sur la carte</button>
              <button type="button" onClick={() => startPlacing()} className="ig-btn flex-1">Signaler autre chose</button>
            </div>
          </div>
        </div>
      )}

      {/* Fiche d'un de mes signalements */}
      {mode === "browse" && selected && (
        <ReportDetail report={selected} onClose={() => setSelectedId(null)} onRemove={() => remove(selected)} />
      )}

      {/* Liste de mes signalements */}
      {listOpen && (
        <div className="fixed inset-0 z-[700] flex items-end justify-center bg-black/50 animate-fade-in md:items-center" onClick={() => setListOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Mes signalements" onClick={(e) => e.stopPropagation()}
            className="max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-bg pb-[env(safe-area-inset-bottom)] animate-sheet-up md:rounded-3xl">
            <div className="sticky top-0 z-10 border-b border-sep bg-bg px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="w-9" />
                <h2 className="font-semibold">Mes signalements</h2>
                <button type="button" onClick={() => setListOpen(false)} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-full hover:bg-soft"><X size={22} /></button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-sep p-1 text-sm">
                {([["tous", `Tous (${visibleReports.length})`], ["besoin", `Besoins (${counts.besoin})`], ["probleme", `Problèmes (${counts.probleme})`]] as const).map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}
                    className={`rounded-lg py-1.5 font-semibold transition ${filter === id ? "bg-bg shadow" : "text-muted"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {listed.length === 0 ? (
              <p className="p-8 text-center text-muted">
                {visibleReports.length === 0 ? "Aucun signalement pour l'instant. Touche « Signaler ici » pour en ajouter un." : "Rien dans cette catégorie."}
              </p>
            ) : (
              <ul className="divide-y divide-sep">
                {listed.map((r) => {
                  const c = reportCategoryOf(r.category);
                  return (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <button type="button" onClick={() => focus(r)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg text-white" style={{ background: KIND_COLOR[r.kind] }}><InterfaceIcon symbol={c?.emoji} size={22} /></span>
                        <span className="min-w-0">
                          <span className="block font-semibold">{c?.label}</span>
                          <span className="block truncate text-sm text-muted">{r.address || r.description || "Point choisi sur la carte"}</span>
                          <span className="block text-xs text-muted">
                            {timeAgo(r.createdAt, true)} · N° {r.ref}
                            {r.photos.length > 0 && ` · ${r.photos.length} photo${r.photos.length > 1 ? "s" : ""}`}
                          </span>
                        </span>
                      </button>
                      <button type="button" onClick={() => remove(r)} aria-label="Retirer" className="p-2 text-muted hover:text-ig-red"><Trash2 size={18} /></button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Fiche d'un signalement (photos privées, adresse, moment, numéro, statut). */
function ReportDetail({ report: r, onClose, onRemove }: { report: Report; onClose: () => void; onRemove: () => void }) {
  const c = reportCategoryOf(r.category);
  const m = reportMomentOf(r.moment);
  return (
    <div className="absolute inset-x-3 bottom-3 z-[600] mx-auto max-w-md animate-sheet-up rounded-3xl border border-line bg-bg p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl text-white" style={{ background: KIND_COLOR[r.kind] }}><InterfaceIcon symbol={c?.emoji} size={22} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{r.kind === "besoin" ? "Besoin" : "Problème"} · N° {r.ref}</p>
          <p className="font-semibold">{c?.label}</p>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
            <MapPin size={13} className="shrink-0" /> <span className="truncate">{r.address ?? "Point choisi sur la carte"}</span>
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-soft"><X size={20} /></button>
      </div>
      {r.description && <p className="mt-3 whitespace-pre-line">{r.description}</p>}
      {r.photos.length > 0 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {r.photos.map((src) => (
            <a key={src} href={src} target="_blank" rel="noreferrer" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="Photo du signalement" className="h-24 w-24 rounded-xl object-cover" />
            </a>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded-full bg-[#1f8a3b] px-2.5 py-1 font-semibold text-white">✓ Reçu</span>
        {m && <span className="rounded-full bg-soft px-2.5 py-1"> {m.label}</span>}
        <span className="rounded-full bg-soft px-2.5 py-1 text-muted">{timeAgo(r.createdAt, true)}</span>
      </div>
      <button type="button" onClick={onRemove} className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-ig-red">
        <Trash2 size={15} /> Retirer ce signalement
      </button>
    </div>
  );
}

type Photo = { blob: Blob; url: string };

/** Étapes 2 (quoi ?) et 3 (détails : explication, moment, photos), puis envoi. */
function ReportForm({ draft, place, onEditPlace, onCancel, onCreated }: {
  draft: { pos: LatLng; place: Place | null };
  place: Place | null;
  onEditPlace: () => void;
  onCancel: () => void;
  onCreated: (r: Report) => void;
}) {
  const [step, setStep] = useState<2 | 3>(2);
  const [kind, setKind] = useState<ReportKindId>("besoin");
  const [category, setCategory] = useState<ReportCategoryId | null>(null);
  const [description, setDescription] = useState("");
  const [moment, setMoment] = useState<ReportMomentId | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<Set<string>>(new Set()); // aperçus à libérer quand le panneau se ferme

  useEffect(() => {
    const urls = urlsRef.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const cat = category ? reportCategoryOf(category) : null;

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    const added: Photo[] = [];
    for (const f of Array.from(files).slice(0, MAX_REPORT_PHOTOS - photos.length)) {
      try {
        const blob = await compressImage(f); // 1600 px max, et la position GPS de la photo est retirée
        const url = URL.createObjectURL(blob);
        urlsRef.current.add(url);
        added.push({ blob, url });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Photo illisible.");
      }
    }
    setPhotos((cur) => [...cur, ...added].slice(0, MAX_REPORT_PHOTOS));
    setBusy(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  function removePhoto(url: string) {
    URL.revokeObjectURL(url);
    urlsRef.current.delete(url);
    setPhotos((cur) => cur.filter((p) => p.url !== url));
  }

  async function submit() {
    if (!category) return setStep(2);
    setSending(true);
    setError(null);
    const form = new FormData();
    form.append("data", JSON.stringify({ category, description, moment, address: addressOf(place), lat: draft.pos.lat, lng: draft.pos.lng }));
    photos.forEach((p, i) => form.append("photos", new File([p.blob], `photo-${i + 1}.jpg`, { type: "image/jpeg" })));
    const res = await fetch("/api/reports", { method: "POST", body: form }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setSending(false);
    if (!res?.ok) return setError(d?.error ?? (res ? `Erreur du serveur (${res.status}).` : "Envoi impossible : vérifie ta connexion."));
    onCreated(d.report);
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-[600] md:inset-x-3 md:bottom-3">
      <div role="dialog" aria-label="Nouveau signalement"
        className="mx-auto flex max-h-[min(80dvh,660px)] max-w-md animate-sheet-up flex-col rounded-t-3xl border border-line bg-bg shadow-2xl md:rounded-3xl">
        <div className="flex items-center gap-2 border-b border-sep px-3 py-2.5">
          <button type="button" onClick={step === 3 ? () => setStep(2) : onEditPlace} aria-label="Étape précédente" className="grid h-9 w-9 place-items-center rounded-full hover:bg-soft">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Étape {step} sur 3</p>
            <h2 className="font-semibold">{step === 2 ? "Quoi ?" : "Détails"}</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Annuler le signalement" className="grid h-9 w-9 place-items-center rounded-full hover:bg-soft">
            <X size={20} />
          </button>
        </div>
        <div className="px-4 pt-3">
          <Steps step={step} />
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {step === 2 ? (
            <>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-sep p-1">
                {REPORT_KINDS.map((k) => (
                  <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => { setKind(k.id); setCategory(null); }}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${kind === k.id ? "bg-bg shadow" : "text-muted"}`}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR[k.id] }} /> {k.label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted">{kind === "besoin" ? "Qu'est-ce qui manque ici ?" : "Qu'est-ce qui ne va pas ici ?"}</p>
              <div className="grid grid-cols-3 gap-2">
                {REPORT_CATEGORIES.filter((c) => c.kind === kind).map((c) => (
                  <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => { setCategory(c.id); setStep(3); }}
                    className={`flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center text-xs font-medium leading-tight transition active:scale-[0.97] ${category === c.id ? "border-ig-blue bg-ig-blue/10" : "border-line hover:bg-soft"}`}>
                    <span className="text-2xl"><InterfaceIcon symbol={c.emoji} size={22} /></span>
                    {c.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">On signale des lieux et des besoins, jamais des personnes.</p>
            </>
          ) : (
            <>
              {/* Rappel : où et quoi */}
              <div className="divide-y divide-sep rounded-2xl border border-line">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <MapPin size={18} className="shrink-0 text-ig-blue" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{place?.label ?? "Point choisi sur la carte"}</span>
                    {place?.detail && <span className="block truncate text-xs text-muted">{place.detail}</span>}
                  </span>
                  <button type="button" onClick={onEditPlace} className="text-sm font-semibold text-ig-blue">Modifier</button>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <span className="w-[18px] text-center text-lg"><InterfaceIcon symbol={cat?.emoji} size={18} /></span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {cat?.label} <span className="font-normal text-muted">· {kind === "besoin" ? "besoin" : "problème"}</span>
                  </span>
                  <button type="button" onClick={() => setStep(2)} className="text-sm font-semibold text-ig-blue">Changer</button>
                </div>
              </div>

              <label className="block">
                <span className="text-sm font-semibold">Explique en quelques mots <span className="font-normal text-muted">(facultatif)</span></span>
                <textarea maxLength={500} rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder={(category && EXAMPLES[category]) || (kind === "besoin" ? "Ce qui manque ici…" : "Ce qui ne va pas ici…")}
                  className="ig-input mt-1.5 resize-none" />
              </label>

              <fieldset>
                <legend className="text-sm font-semibold">Quand ? <span className="font-normal text-muted">(facultatif)</span></legend>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {REPORT_MOMENTS.map((m) => (
                    <button key={m.id} type="button" aria-pressed={moment === m.id} onClick={() => setMoment(moment === m.id ? null : m.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${moment === m.id ? "border-ig-blue bg-ig-blue/10 font-semibold" : "border-line"}`}>
                       {m.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <p className="text-sm font-semibold">Photos <span className="font-normal text-muted">(facultatif, {MAX_REPORT_PHOTOS} max.)</span></p>
                <div className="no-scrollbar mt-1.5 flex gap-2 overflow-x-auto">
                  {photos.map((p) => (
                    <div key={p.url} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removePhoto(p.url)} aria-label="Retirer la photo"
                        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_REPORT_PHOTOS && (
                    <button type="button" disabled={busy} onClick={() => fileInput.current?.click()}
                      className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-dashed border-line bg-soft text-muted">
                      {busy ? <LoaderCircle size={22} className="animate-spin" /> : <span className="flex flex-col items-center gap-1 text-[11px]"><Camera size={22} /> Ajouter</span>}
                    </button>
                  )}
                </div>
                <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
                <p className="mt-1.5 text-xs text-muted"> Photos privées. Évite les visages et les plaques d&apos;immatriculation.</p>
              </div>

              <p className="rounded-xl bg-soft px-3 py-2 text-xs text-muted">
 Urgence ou danger immédiat ? Compose le <b className="text-fg">911</b>.
              </p>
            </>
          )}
        </div>

        {step === 3 && (
          <div className="border-t border-sep p-4 pb-[calc(16px+env(safe-area-inset-bottom))] md:pb-4">
            {error && <p className="mb-2 text-sm text-ig-red" role="alert">{error}</p>}
            <button type="button" onClick={submit} disabled={sending || busy} className="ig-btn w-full py-3 text-base">
              {sending ? "Envoi…" : "Envoyer le signalement"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
