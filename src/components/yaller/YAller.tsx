"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown, Bike, Bus, CalendarDays, Car, Check, ChevronDown, ChevronUp, ExternalLink, Footprints, LoaderCircle,
  LocateFixed, MapPin, Navigation, SquareParking, X, Zap, Layers as LayersIcon,
} from "lucide-react";
import { useNow } from "@/lib/now";
import { toast } from "@/lib/toast";
import { MODES, PARKING_COLOR, PARKING_KIND, PARKING_TYPE, charge, clock, duration, meters, modeOf, places } from "@/lib/y-aller-ui";
import type { GoEvent, Layers, Mode, NearParking, Place, Trip } from "@/lib/y-aller-types";
import { GoMap, type Selected, type Show } from "./GoMap";
import { PlaceField } from "./PlaceField";
import { InterfaceIcon } from "@/components/InterfaceIcon";

type TripState = Trip | "loading" | "error";
const MODE_ICON = { auto: Car, bus: Bus, velo: Bike, marche: Footprints } as const;

/**
 * Onglet « Y aller » : d'où je pars, où je vais (événement, lieu, adresse), puis auto / bus / vélo / à pied.
 * En auto : où se garer (stationnements municipaux et publics) ; en bus : la ligne et les prochains passages ;
 * en vélo : les stations àVélo en direct. Sans trajet : la carte de tous les stationnements, vélos, bus et bornes.
 */
export function YAller({ initialTo }: { initialTo: Place | null }) {
  const now = useNow();
  const [layers, setLayers] = useState<Layers | null>(null);
  const [events, setEvents] = useState<GoEvent[]>([]);
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(initialTo);
  const [mode, setMode] = useState<Mode>("auto");
  const [trips, setTrips] = useState<Partial<Record<Mode, TripState>>>({});
  const [parkingId, setParkingId] = useState<string | null>(null);
  const [busIndex, setBusIndex] = useState(0);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [show, setShow] = useState<Show>({ parkings: true, velo: false, bus: false, bornes: false, events: true });
  const [sheetOpen, setSheetOpen] = useState(true);
  const [locating, setLocating] = useState(false);
  const gen = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDetailsElement>(null);
  const hasSelection = selected !== null;
  const [mapInset, setMapInset] = useState(0);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const desktop = window.matchMedia("(min-width: 768px)");
    const measure = () => setMapInset(selectionRef.current ? selectionRef.current.offsetHeight + (desktop.matches ? 16 : 0) : desktop.matches ? 0 : sheet.offsetHeight);
    const observer = new ResizeObserver(measure);
    observer.observe(sheet);
    if (selectionRef.current) observer.observe(selectionRef.current);
    desktop.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      desktop.removeEventListener("change", measure);
    };
  }, [hasSelection]);

  useEffect(() => {
    function closeFilters(event: PointerEvent) {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) filtersRef.current.open = false;
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (filtersRef.current?.open) {
        filtersRef.current.open = false;
        filtersRef.current.querySelector("summary")?.focus();
      } else {
        setSelected(null);
      }
    }
    document.addEventListener("pointerdown", closeFilters);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeFilters);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  // Données de la carte (les vélos àVélo sont en direct : on rafraîchit chaque minute)
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/y-aller/couches", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Layers | null) => alive && d && setLayers(d))
        .catch(() => {});
    load();
    fetch("/api/y-aller/evenements", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d: { events: GoEvent[] }) => alive && setEvents(d.events))
      .catch(() => {});
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // Calcule les 4 trajets en même temps (on voit tout de suite la durée de chaque mode)
  function plan(f: Place | null, t: Place | null, parking: string | null = parkingId, only?: Mode) {
    if (!f || !t) {
      gen.current++;
      setTrips({});
      return;
    }
    if (!only) gen.current++;
    const myGen = gen.current;
    const modes = only ? [only] : MODES.map((m) => m.id);
    setTrips((prev) => ({ ...(only ? prev : {}), ...Object.fromEntries(modes.map((m) => [m, "loading"])) }));
    for (const m of modes) {
      const q = `mode=${m}&from=${f.lat},${f.lng}&to=${t.lat},${t.lng}${m === "auto" && parking ? `&parking=${encodeURIComponent(parking)}` : ""}`;
      fetch(`/api/y-aller/trajet?${q}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((trip: Trip) => myGen === gen.current && setTrips((p) => ({ ...p, [m]: trip })))
        .catch(() => myGen === gen.current && setTrips((p) => ({ ...p, [m]: "error" })));
    }
  }

  function pickFrom(p: Place | null) {
    setFrom(p);
    setBusIndex(0);
    plan(p, to);
  }
  function pickTo(p: Place | null) {
    setTo(p);
    setParkingId(null);
    setBusIndex(0);
    setSelected(null);
    plan(from, p, null);
    if (p) setSheetOpen(true);
  }
  function swap() {
    setFrom(to);
    setTo(from);
    setParkingId(null);
    plan(to, from, null);
  }
  function chooseParking(p: NearParking | Selected["item"]) {
    setParkingId(p.id);
    setMode("auto");
    plan(from, to, p.id, "auto");
  }
  function locate() {
    if (!("geolocation" in navigator)) return toast("Ta position n'est pas disponible sur cet appareil");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        pickFrom({ label: "Ma position", detail: null, lat: pos.coords.latitude, lng: pos.coords.longitude, kind: "adresse" });
      },
      () => {
        setLocating(false);
        toast("Position refusée ou indisponible : entre ton adresse de départ");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const current = trips[mode];
  const trip = typeof current === "object" ? current : null;
  const shownTrip = useMemo<Trip | null>(() => {
    if (!trip) return null;
    if (trip.mode === "bus" && trip.bus?.[busIndex]) return { ...trip, legs: trip.bus[busIndex].legs };
    return trip;
  }, [trip, busIndex]);
  const padBottom = useCallback(() => selectionRef.current ? selectionRef.current.offsetHeight + 24 : window.matchMedia("(min-width: 768px)").matches ? 24 : (sheetRef.current?.offsetHeight ?? 0), []);
  const chosenParking = trip?.mode === "auto" ? (trip.parking?.id ?? null) : null;
  const upcoming = events.slice(0, 6);

  return (
    <div className="ya-travel-layout relative -mb-1 h-[calc(100dvh-136px-env(safe-area-inset-bottom))] overflow-hidden md:-mb-8 md:flex md:h-dvh">
      {/* ---------- Panneau (feuille du bas sur téléphone, colonne à gauche sur ordinateur) ---------- */}
      <section
        ref={sheetRef}
        aria-label="Comment y aller"
        data-selected={hasSelection || undefined}
        className={`ya-sheet absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl border-t border-line bg-bg shadow-[0_-12px_40px_rgba(0,0,0,.14)] transition-[max-height] duration-300 md:static md:z-auto md:max-h-none md:w-[360px] lg:w-[400px] md:shrink-0 md:rounded-none md:border-r md:border-t-0 md:shadow-none ${sheetOpen ? "max-h-[56%]" : "max-h-[132px]"}`}
      >
        <button type="button" onClick={() => setSheetOpen((o) => !o)} aria-expanded={sheetOpen} aria-label={sheetOpen ? "Réduire le panneau" : "Agrandir le panneau"} className="flex w-full shrink-0 flex-col items-center pb-1 pt-2 md:hidden">
          <span className="h-1.5 w-10 rounded-full bg-line" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 md:px-5 md:pt-6">
          <header className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight md:text-2xl"><Navigation size={22} className="text-ig-blue" /> Y aller</h1>
            </div>
            <button type="button" onClick={() => setSheetOpen((o) => !o)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-soft md:hidden" aria-label={sheetOpen ? "Voir la carte" : "Voir le panneau"}>
              {sheetOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </header>

          {/* Départ → arrivée */}
          <div className="relative space-y-2">
            <PlaceField
              label="Je pars de"
              placeholder="Je pars de… (adresse, lieu)"
              value={from}
              onPick={pickFrom}
              dot={<span className="block h-3 w-3 rounded-full border-[3px] border-[#1a73e8] bg-bg" />}
              action={
                <button type="button" onClick={locate} aria-label="Utiliser ma position" title="Ma position" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#1a73e8] hover:bg-hov">
                  {locating ? <LoaderCircle size={17} className="animate-spin" /> : <LocateFixed size={17} />}
                </button>
              }
            />
            <PlaceField
              label="Je vais à"
              placeholder="Je vais à… (événement, lieu, adresse)"
              value={to}
              onPick={pickTo}
              dot={<MapPin size={17} className="text-[#ea4335]" fill="currentColor" fillOpacity={0.15} />}
            />
            <span className="pointer-events-none absolute left-[21px] top-[42px] h-5 border-l-2 border-dotted border-line" aria-hidden />
            {(from || to) && (
              <button type="button" onClick={swap} aria-label="Inverser départ et arrivée" className="absolute -right-1 top-[34px] z-10 grid h-8 w-8 place-items-center rounded-full border border-line bg-bg text-muted shadow-sm transition hover:text-fg active:rotate-180">
                <ArrowUpDown size={15} />
              </button>
            )}
          </div>

          {/* Raccourcis : les prochains événements */}
          {!to && upcoming.length > 0 && (
            <details className="ya-quiet-details mt-4">
              <summary>Événements à venir</summary>
              <div className="ya-chips -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
                {upcoming.map((ev, i) => (
                  <button key={ev.id} type="button" onClick={() => pickTo({ label: ev.title, detail: ev.place, lat: ev.lat, lng: ev.lng, kind: "evenement" })}
                    className="flex max-w-[240px] shrink-0 items-center gap-2 rounded-full border border-line bg-bg py-1.5 pl-1.5 pr-3 text-left text-xs font-semibold transition hover:bg-soft active:scale-95">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${ev.status === "live" ? "bg-ig-red" : "bg-ig-blue"}`}>{i + 1}</span>
                    <span className="truncate">{ev.title}</span>
                  </button>
                ))}
              </div>
            </details>
          )}

          {/* Modes avec la durée de chacun */}
          {from && to && (
            <div className="mt-4 grid grid-cols-4 gap-1.5 rounded-2xl bg-soft p-1" role="tablist" aria-label="Moyen de transport">
              {MODES.map((m) => {
                const t = trips[m.id];
                const Icon = MODE_ICON[m.id];
                const on = mode === m.id;
                return (
                  <button key={m.id} type="button" role="tab" aria-selected={on} onClick={() => { setMode(m.id); setSelected(null); }}
                    className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-semibold transition ${on ? "bg-bg shadow-sm" : "text-muted hover:text-fg"}`}
                    style={on ? { color: m.color } : undefined}>
                    <Icon size={19} />
                    <span>{m.label}</span>
                    <span className={`text-[11px] ${on ? "text-fg" : ""}`}>
                      {t === "loading" || t === undefined ? <LoaderCircle size={11} className="mt-0.5 animate-spin" /> : t === "error" || !t.ok ? "—" : duration(t.duration)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {from && to ? (
            <div className="mt-4 animate-fade-in" key={mode}>
              {current === "loading" || current === undefined ? (
                <div className="space-y-2" aria-label="Calcul du trajet">
                  {[0, 1, 2].map((k) => <div key={k} className="h-16 animate-pulse rounded-2xl bg-soft" />)}
                </div>
              ) : current === "error" ? (
                <p className="rounded-2xl bg-soft p-4 text-sm text-muted">Le trajet n&apos;a pas pu être calculé. Vérifie ta connexion et réessaie.</p>
              ) : (
                <TripDetails trip={current} now={now} busIndex={busIndex} onBus={setBusIndex} onParking={chooseParking} />
              )}
            </div>
          ) : (
            <Explore layers={layers} show={show} setShow={setShow} />
          )}
        </div>
      </section>

      {/* ---------- Carte ---------- */}
      <div className="absolute inset-0 md:relative md:flex-1" style={{ "--ya-panel-height": mapInset + "px" } as React.CSSProperties}>
        <GoMap
          layers={layers}
          show={show}
          events={events}
          from={from}
          to={to}
          trip={shownTrip}
          selectedId={selected?.item.id ?? null}
          chosenParkingId={chosenParking}
          onSelect={setSelected}
          padBottom={padBottom}
          bottomInset={mapInset}
          focusedPlace={selected?.item ?? null}
        />
        {/* Couches (raccourci sur la carte) */}
        <details ref={filtersRef} className="ya-map-layers">
          <summary><LayersIcon size={17} strokeWidth={1.8} /> Afficher</summary>
          <div className="ya-layers-menu">
          <LayerToggle on={show.parkings} onClick={() => setShow((s) => ({ ...s, parkings: !s.parkings }))} label="Stationnements" icon={<SquareParking size={16} />} color="#0096d6" />
          <LayerToggle on={show.velo} onClick={() => setShow((s) => ({ ...s, velo: !s.velo }))} label="Vélos" icon={<Bike size={16} />} color="#22a06b" />
          <LayerToggle on={show.bus} onClick={() => setShow((s) => ({ ...s, bus: !s.bus }))} label="Bus" icon={<Bus size={16} />} color="#f08c00" />
          <LayerToggle on={show.bornes} onClick={() => setShow((s) => ({ ...s, bornes: !s.bornes }))} label="Bornes" icon={<Zap size={16} />} color="#e0a800" />
          <LayerToggle on={show.events} onClick={() => setShow((s) => ({ ...s, events: !s.events }))} label="Événements" icon={<CalendarDays size={16} />} color="#d64656" />
          </div>
        </details>
        {selected && (
          <SelectedCard
            panelRef={selectionRef}
            sel={selected}
            canPark={!!(from && to)}
            onClose={() => setSelected(null)}
            onGo={(p) => pickTo(p)}
            onPark={(p) => { chooseParking(p); setSelected(null); }}
          />
        )}
      </div>
    </div>
  );
}

function LayerToggle({ on, onClick, label, icon, color }: { on: boolean; onClick: () => void; label: string; icon: React.ReactNode; color: string }) {
  return (
    <label className="ya-layer-option">
      <span style={{ color }}>{icon}</span>
      <span>{label}</span>
      <input type="checkbox" checked={on} onChange={onClick} aria-label={label} />
    </label>
  );
}

// ---------- Sans trajet : ce qu'il y a dans le quartier ----------
function Explore({ layers, show, setShow }: { layers: Layers | null; show: Show; setShow: (f: (s: Show) => Show) => void }) {
  const s = layers?.stats;
  return (
    <details className="ya-quiet-details mt-4">
      <summary>Dans le quartier</summary>
      <div className="space-y-4 pt-3">
      <div>
        <div className="grid grid-cols-2 gap-2">
          <Stat on={show.parkings} onClick={() => setShow((x) => ({ ...x, parkings: !x.parkings }))} color="#0096d6" icon={<SquareParking size={18} />}
            value={s ? s.villePlaces.toLocaleString("fr-CA") : "…"} label={s ? `places dans ${s.villeLots} stationnements municipaux` : "stationnements municipaux"} />
          <Stat on={show.parkings} onClick={() => setShow((x) => ({ ...x, parkings: !x.parkings }))} color="#1a73e8" icon={<SquareParking size={18} />}
            value={s ? `+ ${s.otherLots}` : "…"} label={s ? `autres stationnements publics (≈ ${s.otherPlaces.toLocaleString("fr-CA")} places)` : "autres stationnements"} />
          <Stat on={show.velo} onClick={() => setShow((x) => ({ ...x, velo: !x.velo }))} color="#22a06b" icon={<Bike size={18} />}
            value={s ? (s.bikesNow ?? s.bikeStations).toLocaleString("fr-CA") : "…"} label={s?.bikesNow != null ? `vélos àVélo libres maintenant (${s.bikeStations} stations)` : "stations àVélo"} />
          <Stat on={show.bus} onClick={() => setShow((x) => ({ ...x, bus: !x.bus }))} color="#f08c00" icon={<Bus size={18} />}
            value={s ? String(s.busLines) : "…"} label="lignes de bus du RTC passent par le quartier" />
        </div>
      </div>
      <Legend />
      {layers && <p className="text-[10px] leading-relaxed text-muted">Sources : {layers.sources.join(" · ")}.</p>}
      </div>
    </details>
  );
}

function Stat({ value, label, icon, color, on, onClick }: { value: string; label: string; icon: React.ReactNode; color: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`rounded-2xl border p-3 text-left transition active:scale-[.98] ${on ? "border-transparent bg-soft" : "border-line opacity-60"}`}>
      <span className="grid h-8 w-8 place-items-center rounded-xl text-white" style={{ background: color }}>{icon}</span>
      <span className="mt-2 block text-xl font-bold tracking-tight">{value}</span>
      <span className="block text-[11px] leading-snug text-muted">{label}</span>
    </button>
  );
}

function Legend() {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-2xl bg-soft p-3 text-[11px] text-muted">
      <span className="flex items-center gap-2"><span className="ya-evt is-legend is-live"><span>1</span></span> En direct</span>
      <span className="flex items-center gap-2"><span className="ya-evt is-legend"><span>2</span></span> À venir</span>
      <span className="flex items-center gap-2"><span className="ya-p is-legend" style={{ "--c": PARKING_COLOR.ville } as React.CSSProperties}><b>P</b></span> Municipal</span>
      <span className="flex items-center gap-2"><span className="ya-p is-legend" style={{ "--c": PARKING_COLOR.public } as React.CSSProperties}><b>P</b></span> Public</span>
      <span className="flex items-center gap-2"><span className="ya-bike is-legend"><span><InterfaceIcon symbol="🚲" size={12} /></span><b>5</b></span> Vélos libres</span>
      <span className="flex items-center gap-2"><span className="ya-bus is-legend" /> Arrêt de bus</span>
    </div>
  );
}

// ---------- Détail du trajet selon le mode ----------
function TripDetails({ trip, now, busIndex, onBus, onParking }: { trip: Trip; now: number | null; busIndex: number; onBus: (i: number) => void; onParking: (p: NearParking) => void }) {
  const m = modeOf(trip.mode);
  const arrival = now ? clock(now + trip.duration * 1000) : null;
  return (
    <div className="space-y-4">
      {trip.ok && (
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-bold tracking-tight" style={{ color: m.color }}>{duration(trip.duration)}</p>
            <p className="text-xs text-muted">
              {trip.mode === "bus" && trip.bus?.[busIndex] ? `Arrivée vers ${clock(trip.bus[busIndex].arrival)}` : arrival ? `Arrivée vers ${arrival}` : ""} · {meters(trip.distance)}
              {trip.mode === "auto" && trip.parking ? ` · dont ${trip.parking.walkMin} min à pied` : ""}
            </p>
          </div>
          <span className="text-3xl" aria-hidden><InterfaceIcon symbol={m.emoji} size={22} /></span>
        </div>
      )}
      {trip.approx && <p className="rounded-xl bg-soft px-3 py-2 text-xs text-muted">Trajet estimé à vol d&apos;oiseau.</p>}
      {trip.message && <p className="rounded-2xl bg-soft p-4 text-sm text-muted">{trip.message}</p>}

      {trip.mode === "auto" && trip.parkings && trip.parkings.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Où te garer</p>
          <ul className="space-y-2">
            {trip.parkings.map((p) => {
              const on = p.id === trip.parking?.id;
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => onParking(p)} aria-pressed={on}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[.99] ${on ? "border-ig-blue bg-ig-blue/5 ring-1 ring-ig-blue" : "border-line hover:bg-soft"}`}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-black text-white" style={{ background: PARKING_COLOR[p.kind] }}>P</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {[places(p), PARKING_TYPE[p.type], PARKING_KIND[p.kind], p.fee === false ? "Gratuit" : charge(p.charge) ?? (p.fee ? "Payant" : null)].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="flex items-center gap-1 text-sm font-bold"><Footprints size={14} /> {p.walkMin} min</span>
                      {on && <span className="mt-0.5 flex items-center justify-end gap-1 text-[11px] font-semibold text-ig-blue"><Check size={12} /> choisi</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] text-muted">Touche un stationnement pour y aller. Les « P » sur la carte montrent tous les autres.</p>
        </div>
      )}

      {trip.mode === "bus" && trip.bus && trip.bus.length > 0 && (
        <ul className="space-y-2">
          {trip.bus.map((b, i) => {
            const on = i === busIndex;
            const wait = now ? Math.round((new Date(b.departures[0]).getTime() - now) / 60_000) : null;
            return (
              <li key={`${b.line}-${b.headsign}`}>
                <button type="button" onClick={() => onBus(i)} aria-pressed={on}
                  className={`w-full rounded-2xl border p-3 text-left transition active:scale-[.99] ${on ? "border-[#f08c00] bg-[#f08c00]/5 ring-1 ring-[#f08c00]" : "border-line hover:bg-soft"}`}>
                  <span className="flex items-center gap-2">
                    <span className="rounded-lg px-2 py-0.5 text-sm font-black" style={{ background: b.color, color: b.textColor }}>{b.line}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">→ {b.headsign}</span>
                    <span className="shrink-0 text-sm font-bold">{b.totalMin} min</span>
                  </span>
                  <span className="mt-2 block text-xs text-muted">
                    <b className="text-fg">{clock(b.departures[0])}</b>{wait != null && wait >= 0 ? ` (dans ${wait} min)` : ""}
                    {b.departures.length > 1 ? ` · puis ${b.departures.slice(1).map((d) => clock(d)).join(" · ")}` : ""}
                  </span>
                </button>
                {on && (
                  <ol className="ml-4 mt-2 space-y-1.5 border-l-2 border-dashed border-line pl-3 text-xs animate-fade-in">
                    <li><Footprints size={12} className="mr-1 inline" /> {b.from.walkMin} min à pied jusqu&apos;à l&apos;arrêt <b>{b.from.name}</b> <span className="text-muted">(n° {b.from.code})</span></li>
                    <li><Bus size={12} className="mr-1 inline" /> {b.rideMin} min de bus · {b.stops} arrêt{b.stops > 1 ? "s" : ""}</li>
                    <li><MapPin size={12} className="mr-1 inline" /> Descends à <b>{b.to.name}</b>, puis {b.to.walkMin} min à pied</li>
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {trip.mode === "velo" && (
        <div className="space-y-3">
          <BikeList title="àVélo près du départ (vélos libres)" list={trip.bikesFrom ?? []} field="bikes" empty="Aucune station àVélo à moins de 15 min à pied du départ." />
          <BikeList title="àVélo près de l'arrivée (places libres)" list={trip.bikesTo ?? []} field="docks" empty="Aucune station àVélo près de l'arrivée." />
          {trip.racks && trip.racks.length > 0 && (
            <p className="flex items-center gap-2 rounded-2xl bg-soft p-3 text-xs"><Bike size={16} className="text-[#22a06b]" /> {trip.racks.length} support{trip.racks.length > 1 ? "s" : ""} à vélo près de l&apos;arrivée (le plus proche à {trip.racks[0].walkMin} min à pied).</p>
          )}
        </div>
      )}

      {trip.mode === "marche" && trip.ok && <p className="rounded-2xl bg-soft p-3 text-xs text-muted">Le trajet à pied suit les rues et les sentiers.</p>}

      <a href={trip.externalUrl} target="_blank" rel="noopener noreferrer" className="ig-btn-secondary flex w-full items-center justify-center gap-2 text-sm">
        <ExternalLink size={15} /> {trip.mode === "bus" ? "Itinéraire détaillé (correspondances)" : "Ouvrir dans Google Maps"}
      </a>
    </div>
  );
}

function BikeList({ title, list, field, empty }: { title: string; list: NonNullable<Trip["bikesFrom"]>; field: "bikes" | "docks"; empty: string }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">{title}</p>
      {list.length === 0 ? <p className="text-xs text-muted">{empty}</p> : (
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#22a06b] text-sm font-black text-white">{s[field] ?? "?"}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{s.name}</span>
                <span className="block text-xs text-muted">{s[field] == null ? "Disponibilité inconnue" : `${s[field]} ${field === "bikes" ? "vélo" : "place"}${(s[field] ?? 0) > 1 ? "s" : ""} libre${(s[field] ?? 0) > 1 ? "s" : ""}${s.live ? " · en direct" : ""}`}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-sm font-bold"><Footprints size={14} /> {s.walkMin} min</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Fiche de l'élément touché sur la carte ----------
function SelectedCard({ sel, canPark, onClose, onGo, onPark, panelRef }: { sel: Selected; canPark: boolean; onClose: () => void; onGo: (p: Place) => void; onPark: (p: Selected["item"]) => void; panelRef: React.Ref<HTMLDivElement> }) {
  let icon: React.ReactNode;
  let title: string;
  let lines: (string | null)[] = [];
  let actions: React.ReactNode = null;
  const go = (label: string, detail: string | null, kind: Place["kind"]) => (
    <button type="button" onClick={() => { onGo({ label, detail, lat: sel.item.lat, lng: sel.item.lng, kind }); onClose(); }} className="ig-btn min-h-10 flex-1 px-4 text-sm">
      <Navigation size={15} /> Y aller
    </button>
  );
  switch (sel.kind) {
    case "parking": {
      const p = sel.item;
      icon = <span className="grid h-11 w-11 place-items-center rounded-xl text-lg font-black text-white" style={{ background: PARKING_COLOR[p.kind] }}>P</span>;
      title = p.name;
      lines = [[places(p), PARKING_TYPE[p.type], PARKING_KIND[p.kind]].filter(Boolean).join(" · "), p.address, [p.fee === false ? "Gratuit" : charge(p.charge) ?? (p.fee ? "Payant" : null), p.maxstay ? `Max. ${p.maxstay.replace("hours", "h").replace("hour", "h")}` : null, p.operator].filter(Boolean).join(" · ") || null];
      if (p.kind === "prive") {
        lines.push("Réservé à ses usagers : on ne peut pas s'y garer.");
        break;
      }
      actions = canPark ? (
        <button type="button" onClick={() => onPark(p)} className="ig-btn min-h-10 flex-1 px-4 text-sm"><Car size={15} /> Me garer ici</button>
      ) : go(p.name, p.address, "stationnement");
      break;
    }
    case "bike": {
      const b = sel.item;
      icon = <span className="grid h-11 w-11 place-items-center rounded-full bg-[#22a06b] text-xl"><InterfaceIcon symbol="🚲" size={24} /></span>;
      title = `àVélo · ${b.name}`;
      lines = [b.bikes != null ? `${b.bikes} vélo${b.bikes > 1 ? "s" : ""} et ${b.docks ?? "?"} place${(b.docks ?? 0) > 1 ? "s" : ""} libres${b.live ? " (en direct)" : ""}` : "Disponibilité inconnue", b.capacity ? `${b.capacity} bornes` : null];
      break;
    }
    case "bus": {
      const b = sel.item;
      icon = <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f08c00] text-white"><Bus size={20} /></span>;
      title = b.name;
      lines = [`Arrêt n° ${b.code}`, b.lines.length ? `Lignes : ${b.lines.join(", ")}` : null];
      break;
    }
    case "charger": {
      const c = sel.item;
      icon = <span className="grid h-11 w-11 place-items-center rounded-full bg-[#e0a800] text-white"><Zap size={20} /></span>;
      title = c.name;
      lines = [c.operator, c.capacity ? `${c.capacity} borne${c.capacity > 1 ? "s" : ""}` : null];
      break;
    }
    case "event": {
      const e = sel.item;
      icon = <span className={`grid h-11 w-11 place-items-center rounded-full text-base font-black text-white ${e.status === "live" ? "bg-ig-red" : "bg-ig-blue"}`}>{sel.n}</span>;
      title = e.title;
      lines = [e.status === "live" ? " En direct" : e.startsAt ? ` ${new Intl.DateTimeFormat("fr-CA", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" }).format(new Date(e.startsAt))}` : null, ` ${e.place}`, e.type, e.cost ? ` ${e.cost}` : null];
      actions = (
        <>
          {go(e.title, e.place, "evenement")}
          {e.href && <a href={e.href} className="ig-btn-secondary min-h-10 px-4 text-sm"><CalendarDays size={15} /> Voir</a>}
          {!e.href && e.url && <a href={e.url} target="_blank" rel="noopener noreferrer" className="ig-btn-secondary min-h-10 px-4 text-sm"><ExternalLink size={15} /> Site</a>}
        </>
      );
      break;
    }
  }
  return (
    <div ref={panelRef} className="ya-selection border border-line bg-bg p-4 shadow-xl ya-card-pop" role="region" aria-label={title}>
      <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug">{title}</p>
          {lines.filter(Boolean).map((l) => <p key={l} className="mt-0.5 text-xs text-muted">{l}</p>)}
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-soft"><X size={16} /></button>
      </div>
      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </div>
  );
}
