"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bike, Bus, Footprints, Navigation } from "lucide-react";
import { PARKING_COLOR, PARKING_TYPE, places } from "@/lib/y-aller-ui";
import type { BikeStation, BusStop, LatLng, NearParking } from "@/lib/y-aller-types";
import { addBaseTiles } from "@/lib/map-tiles";

type Around = {
  found: boolean;
  place?: LatLng & { label: string | null };
  parkings?: NearParking[];
  busStops?: (BusStop & { walkMin: number })[];
  bikeStations?: (BikeStation & { walkMin: number })[];
};

/** Bloc « Comment y aller » d'un événement : mini-carte, stationnements, bus et àVélo les plus proches, bouton Itinéraire. */
export function HowToGetThere({ place }: { place: string }) {
  const [data, setData] = useState<Around | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/y-aller/autour?lieu=${encodeURIComponent(place)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { found: false }))
      .then((d: Around) => alive && setData(d))
      .catch(() => alive && setData({ found: false }));
    return () => {
      alive = false;
    };
  }, [place]);

  // Mini-carte (non interactive : un toucher ouvre « Y aller »)
  useEffect(() => {
    if (!data?.found || !data.place || !box.current) return;
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !box.current) return;
      const p = data.place!;
      map = L.map(box.current, { center: [p.lat, p.lng], zoom: 16, zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, touchZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false });
      addBaseTiles(L, map);
      const icon = (html: string, w: number, h: number, ay = h / 2) => L.divIcon({ html, className: "", iconSize: [w, h], iconAnchor: [w / 2, ay] });
      const pts: [number, number][] = [[p.lat, p.lng]];
      for (const k of data.parkings ?? []) {
        L.marker([k.lat, k.lng], { icon: icon(`<div class="ya-p" style="--c:${PARKING_COLOR[k.kind]}"><b>P</b></div>`, 28, 28), interactive: false }).addTo(map);
        pts.push([k.lat, k.lng]);
      }
      for (const s of data.busStops?.slice(0, 1) ?? []) L.marker([s.lat, s.lng], { icon: icon('<div class="ya-bus"></div>', 16, 16), interactive: false }).addTo(map);
      for (const b of data.bikeStations?.slice(0, 1) ?? []) L.marker([b.lat, b.lng], { icon: icon(`<div class="ya-bike"><span>🚲</span><b>${b.bikes ?? ""}</b></div>`, 30, 26), interactive: false }).addTo(map);
      L.marker([p.lat, p.lng], { icon: icon('<div class="ya-to"><span></span></div>', 36, 46, 44), interactive: false, zIndexOffset: 1000 }).addTo(map);
      map.fitBounds(L.latLngBounds(pts), { padding: [28, 28], maxZoom: 17 });
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [data]);

  const href = data?.place ? `/y-aller?vers=${data.place.lat.toFixed(6)},${data.place.lng.toFixed(6)}&nom=${encodeURIComponent(place)}` : "/y-aller";
  const stop = data?.busStops?.[0];
  const bike = data?.bikeStations?.[0];

  return (
    <section className="surface-card p-5 md:p-6" aria-labelledby="y-aller-titre">
      <div className="flex items-center justify-between gap-3">
        <h2 id="y-aller-titre" className="text-lg font-bold">🧭 Comment y aller</h2>
        <Link href={href} className="ig-btn min-h-10 px-4 text-sm"><Navigation size={15} /> Itinéraire</Link>
      </div>

      {data === null ? (
        <div className="mt-3 space-y-2" aria-label="Chargement">
          <div className="h-36 animate-pulse rounded-2xl bg-soft" />
          <div className="h-12 animate-pulse rounded-xl bg-soft" />
        </div>
      ) : !data.found ? (
        <p className="mt-2 text-sm text-muted">Lieu à préciser. Ouvre « Itinéraire » pour voir les stationnements, les bus et les vélos du quartier.</p>
      ) : (
        <>
          <Link href={href} aria-label="Ouvrir l'itinéraire" className="relative mt-3 block h-36 overflow-hidden rounded-2xl border border-line">
            <div ref={box} className="pointer-events-none absolute inset-0 z-0 bg-soft" />
          </Link>
          <ul className="mt-3 space-y-2">
            {data.parkings?.slice(0, 2).map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl bg-soft px-3 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-black text-white" style={{ background: PARKING_COLOR[p.kind] }}>P</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                  <span className="block truncate text-xs text-muted">{[places(p), PARKING_TYPE[p.type], p.kind === "ville" ? "Municipal" : null].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-bold"><Footprints size={13} /> {p.walkMin} min</span>
              </li>
            ))}
            {stop && (
              <li className="flex items-center gap-3 rounded-xl bg-soft px-3 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f08c00] text-white"><Bus size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">Arrêt {stop.name}</span>
                  <span className="block truncate text-xs text-muted">Lignes {stop.lines.join(", ")}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-bold"><Footprints size={13} /> {stop.walkMin} min</span>
              </li>
            )}
            {bike && (
              <li className="flex items-center gap-3 rounded-xl bg-soft px-3 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#22a06b] text-white"><Bike size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">àVélo · {bike.name}</span>
                  <span className="block truncate text-xs text-muted">{bike.bikes != null ? `${bike.bikes} vélo${bike.bikes > 1 ? "s" : ""} libre${bike.bikes > 1 ? "s" : ""} maintenant` : "Station de vélos en libre-service"}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-bold"><Footprints size={13} /> {bike.walkMin} min</span>
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
