"use client";

import { useEffect, useRef, useState } from "react";
import type { Marker } from "maplibre-gl";
import { LoaderCircle, LocateFixed, MapPin, Search, X } from "lucide-react";
import { isInSaintRoch } from "@/lib/geo";
import { DistrictMap, type DistrictInstance } from "../vitrines/DistrictMap";

export type LatLng = { lat: number; lng: number };
export type PickedPlace = LatLng & { address: string | null };
type Result = { label: string; detail: string | null; lat: number; lng: number };

const PIN = (color: string) => `<div class="sg-pin" style="--sg-accent:${color}"><svg viewBox="0 0 40 52" width="40" height="52" aria-hidden="true"><path d="M20 2C10.1 2 2 10.1 2 20c0 13 18 30 18 30s18-17 18-30C38 10.1 29.9 2 20 2z"/><circle cx="20" cy="20" r="7" fill="#fff"/></svg></div>`;

/**
 * Étape « Où ? » : on touche la carte (ou on glisse l'épingle), on cherche une adresse, ou on prend sa position.
 * L'adresse lisible est retrouvée à partir du point. Seulement à l'intérieur de Saint-Roch.
 */
export function PlacePicker({ value, color, onChange }: { value: PickedPlace | null; color: string; onChange: (p: PickedPlace | null) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [instance, setInstance] = useState<DistrictInstance | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  // Recherche d'adresse (attend que l'on arrête de taper)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { const t = setTimeout(() => setResults([]), 0); return () => clearTimeout(t); }
    const controller = new AbortController();
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`/api/geo/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d: { results?: Result[] }) => { setResults((d.results ?? []).slice(0, 6)); setActive(0); setOpen(true); })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 250);
    return () => { clearTimeout(t); controller.abort(); };
  }, [query]);

  async function place(p: LatLng, known: string | null = null) {
    if (!isInSaintRoch(p.lng, p.lat)) {
      setMessage("Cet endroit est hors de Saint-Roch. Choisis un point dans la zone en pointillés.");
      return;
    }
    setMessage(null);
    onChangeRef.current({ ...p, address: known });
    instance?.map.easeTo({ center: [p.lng, p.lat], zoom: Math.max(instance.map.getZoom(), 16.5), duration: 450 });
    if (known) return;
    setResolving(true);
    const d = await fetch(`/api/geo/reverse?lat=${p.lat}&lng=${p.lng}`).then((r) => r.json()).catch(() => null) as { label?: string | null; detail?: string | null } | null;
    setResolving(false);
    onChangeRef.current({ ...p, address: d?.label ? [d.label, d.detail].filter(Boolean).join(" · ").slice(0, 160) : null });
  }
  const placeRef = useRef(place);
  useEffect(() => { placeRef.current = place; });

  function choose(r: Result) {
    setQuery(r.label);
    setOpen(false);
    void place({ lat: r.lat, lng: r.lng }, [r.label, r.detail].filter(Boolean).join(" · ").slice(0, 160));
  }

  function locate() {
    if (!navigator.geolocation) return setMessage("Ton appareil ne donne pas sa position. Touche la carte à la place.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); void place({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => { setLocating(false); setMessage("Position indisponible. Touche la carte à l'endroit exact."); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-3">
      <div className="sg-search" data-open={open && results.length > 0}>
        <Search size={18} className="sg-search-icon" aria-hidden="true" />
        <input
          role="combobox" aria-expanded={open && results.length > 0} aria-controls="sg-search-list" aria-autocomplete="list"
          aria-activedescendant={open && results.length ? `sg-search-${active}` : undefined} aria-label="Chercher une adresse à Saint-Roch"
          value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (!open || !results.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
            else if (e.key === "Enter") { e.preventDefault(); choose(results[active]); }
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Une adresse, un coin de rue, un lieu…" className="sg-search-input" autoComplete="off" enterKeyHint="search"
        />
        {searching ? <LoaderCircle size={17} className="sg-search-end animate-spin text-muted" /> : query && (
          <button type="button" className="sg-search-end" aria-label="Effacer la recherche" onClick={() => { setQuery(""); setResults([]); }}><X size={17} /></button>
        )}
        {open && results.length > 0 && (
          <ul id="sg-search-list" role="listbox" className="sg-select-list sg-search-list">
            {results.map((r, i) => (
              <li key={`${r.lat},${r.lng},${i}`} id={`sg-search-${i}`} role="option" aria-selected={i === active} data-active={i === active}
                className="sg-select-option" onPointerDown={(e) => e.preventDefault()} onClick={() => choose(r)} onPointerEnter={() => setActive(i)}>
                <MapPin size={16} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{r.label}</span>{r.detail && <span className="block truncate text-xs text-muted">{r.detail}</span>}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sg-map">
        <DistrictMap label="Carte de Saint-Roch : touche l'endroit du signalement">
          {(inst) => <PinLayer instance={inst} point={value} color={color} onReady={setInstance} onPick={(p) => void placeRef.current(p)} />}
        </DistrictMap>
        <button type="button" className="sg-locate" onClick={locate} disabled={locating}>
          {locating ? <LoaderCircle size={16} className="animate-spin" /> : <LocateFixed size={16} />} Ma position
        </button>
        {!value && <p className="sg-map-hint" aria-hidden="true">Touche la carte à l&apos;endroit exact</p>}
      </div>

      <div className="sg-place" data-set={!!value} role="status" aria-live="polite">
        <MapPin size={18} style={{ color: value ? color : undefined }} className={value ? "" : "text-muted"} />
        <span className="min-w-0 flex-1">
          {value ? (
            <>
              <span className="block truncate font-semibold">{resolving ? "Recherche de l'adresse…" : value.address ?? "Point choisi sur la carte"}</span>
              <span className="block text-xs text-muted">Tu peux glisser l&apos;épingle pour être plus précis·e.</span>
            </>
          ) : <span className="text-muted">Aucun endroit choisi pour l&apos;instant.</span>}
        </span>
        {value && <button type="button" className="sg-link" onClick={() => onChange(null)}>Retirer</button>}
      </div>
      {message && <p role="alert" className="sg-alert">{message}</p>}
    </div>
  );
}

/** Épingle déplaçable + clic sur la carte. Ne rend rien : agit sur la carte MapLibre. */
function PinLayer({ instance, point, color, onPick, onReady }: {
  instance: DistrictInstance; point: LatLng | null; color: string; onPick: (p: LatLng) => void; onReady: (i: DistrictInstance) => void;
}) {
  const marker = useRef<Marker | null>(null);
  const last = useRef<LatLng | null>(point);
  const pick = useRef(onPick);
  useEffect(() => { pick.current = onPick; });

  useEffect(() => {
    onReady(instance);
    const { map } = instance;
    const click = (e: { lngLat: { lat: number; lng: number } }) => pick.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    map.on("click", click);
    map.getCanvas().style.cursor = "crosshair";
    const cleanup = () => { map.off("click", click); marker.current?.remove(); marker.current = null; };
    instance.cleanups.add(cleanup);
    return () => { cleanup(); instance.cleanups.delete(cleanup); };
  }, [instance, onReady]);

  useEffect(() => {
    const { map, maplibregl } = instance;
    last.current = point;
    if (!point) { marker.current?.remove(); marker.current = null; return; }
    if (!marker.current) {
      const el = document.createElement("div");
      el.innerHTML = PIN(color);
      marker.current = new maplibregl.Marker({ element: el, anchor: "bottom", draggable: true }).setLngLat([point.lng, point.lat]).addTo(map);
      marker.current.on("dragend", () => {
        const p = marker.current!.getLngLat();
        // Glissée hors du quartier : l'épingle revient à sa place (le message d'erreur s'affiche quand même)
        if (!isInSaintRoch(p.lng, p.lat) && last.current) marker.current!.setLngLat([last.current.lng, last.current.lat]);
        pick.current({ lat: p.lat, lng: p.lng });
      });
    } else {
      marker.current.setLngLat([point.lng, point.lat]);
      const pin = marker.current.getElement().querySelector<HTMLElement>(".sg-pin");
      pin?.style.setProperty("--sg-accent", color);
    }
  }, [instance, point, color]);

  return null;
}
