"use client";

import "./directory-map.css";
import { useEffect } from "react";
import type { Marker, Popup } from "maplibre-gl";
import { htmlMarker } from "@/lib/map3d";
import { DistrictMap, type DistrictInstance } from "./vitrines/DistrictMap";

// Carte de l'annuaire, au même style 3D que les cartes de Vie Saint-Roch (DistrictMap : Plan / Satellite / 3D,
// bloquée sur Saint-Roch) : un repère par compte Complices (couleur selon le type), et les commerces de la liste SDC
// regroupés par rue (le fichier ne donne que la rue : pastille au milieu de la rue, avec le nombre).
export type MapActor = { id: string; name: string; type: string; typeLabel: string; lat: number; lng: number; exact: boolean };
export type MapStreet = { street: string; count: number; lat: number; lng: number };
type Props = { actors: MapActor[]; streets: MapStreet[]; selectedStreet: string | null; onPickStreet: (street: string | null) => void };

const COLORS: Record<string, string> = { commerce: "#7ab648", entreprise: "#0096d6", organisme: "#1f3a4d" };

export function DirectoryMap(props: Props) {
  return (
    <div className="directory-map">
      <DistrictMap label="Carte des acteurs de Saint-Roch">
        {(instance) => <DirectoryMarkers {...props} instance={instance} />}
      </DistrictMap>
    </div>
  );
}

function DirectoryMarkers({ instance, actors, streets, selectedStreet, onPickStreet }: Props & { instance: DistrictInstance }) {
  useEffect(() => {
    const { map, maplibregl } = instance;
    const markers: Marker[] = [];
    const popups: Popup[] = [];

    for (const s of streets) {
      const selected = s.street === selectedStreet;
      const size = s.count >= 100 ? 28 : s.count >= 10 ? 24 : 20;
      const tip = document.createElement("div");
      const title = document.createElement("strong"); title.textContent = `${s.count} commerce${s.count > 1 ? "s" : ""}`;
      const where = document.createElement("p"); where.textContent = s.street;
      tip.append(title, where);
      const popup = new maplibregl.Popup({ closeButton: false, offset: size / 2 + 4, maxWidth: "260px" }).setDOMContent(tip);
      popups.push(popup);
      const marker = htmlMarker(maplibregl, map, s, `<span class="dir-street-pin${selected ? " is-selected" : ""}" style="width:${size}px;height:${size}px">${s.count}</span>`, {
        title: `${s.street} : ${s.count} commerce(s) · toucher pour filtrer la liste`,
        z: selected ? 20 : 3,
        onClick: () => onPickStreet(selected ? null : s.street),
      });
      const el = marker.getElement();
      el.addEventListener("mouseenter", () => popup.setLngLat([s.lng, s.lat]).addTo(map));
      el.addEventListener("mouseleave", () => popup.remove());
      el.addEventListener("focus", () => popup.setLngLat([s.lng, s.lat]).addTo(map));
      el.addEventListener("blur", () => popup.remove());
      markers.push(marker);
    }

    for (const a of actors) {
      const box = document.createElement("div");
      const name = document.createElement("strong"); name.textContent = a.name;
      const type = document.createElement("p"); type.textContent = a.typeLabel + (a.exact ? "" : " · rue seulement");
      const link = document.createElement("a"); link.href = `/u/${a.id}`; link.textContent = "Voir la page";
      box.append(name, type, link);
      const popup = new maplibregl.Popup({ offset: 14, maxWidth: "260px" }).setDOMContent(box);
      popups.push(popup);
      markers.push(htmlMarker(maplibregl, map, a, `<span class="dir-actor-pin${a.exact ? "" : " is-approx"}" style="background:${COLORS[a.type] ?? "#0096d6"}"></span>`, {
        title: `${a.name} · ${a.typeLabel}`,
        z: 10,
        onClick: () => { popup.setLngLat([a.lng, a.lat]).addTo(map); },
      }));
    }

    const cleanup = () => { popups.forEach((p) => p.remove()); markers.forEach((m) => m.remove()); };
    instance.cleanups.add(cleanup);
    return () => { instance.cleanups.delete(cleanup); cleanup(); };
  }, [instance, actors, streets, selectedStreet, onPickStreet]);

  // Rue choisie (depuis la carte ou la liste) : on recentre dessus
  useEffect(() => {
    const s = streets.find((x) => x.street === selectedStreet);
    if (!s) return;
    instance.map.easeTo({ center: [s.lng, s.lat], duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450 });
  }, [instance, streets, selectedStreet]);

  return null;
}
