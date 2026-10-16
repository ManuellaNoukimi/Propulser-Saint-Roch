"use client";

import { useEffect, useRef, useState } from "react";
import type { Marker, Popup } from "maplibre-gl";
import { htmlMarker } from "@/lib/map3d";
import { streetKey } from "@/lib/street-key";
import { DistrictMap, type DistrictInstance } from "./DistrictMap";

type VacancyPoint = { id: string; label: string; street: string; lat: number | null; lng: number | null; locationStatus: string };
type MemberPoint = { id: string; name: string; street: string; address: string | null; lat: number | null; lng: number | null; locationStatus: string; isVacant: boolean; googleMapsUrl: string };
type Street = { name: string; key: string; lat: number; lng: number };
type Props = { vacancies: VacancyPoint[]; members: MemberPoint[]; selectedId: string; onSelect: (id: string) => void };

export function VacancyMap(props: Props) {
  const [streets, setStreets] = useState<Street[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/rues-saint-roch", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : { streets: [] })
      .then((data: { streets: Street[] }) => { if (!controller.signal.aborted) setStreets(data.streets); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return <DistrictMap label="Carte des locaux vacants et commerces de Saint-Roch">
    {(instance) => <VacancyMarkers {...props} streets={streets} instance={instance} />}
  </DistrictMap>;
}

function VacancyMarkers({ instance, vacancies, members, selectedId, onSelect, streets }: Props & { instance: DistrictInstance; streets: Street[] }) {
  const lastFocus = useRef("");
  useEffect(() => {
    const { map, maplibregl } = instance;
    const markers: Marker[] = [];
    const popups: Popup[] = [];
    for (const member of members) {
      if (member.isVacant || member.locationStatus !== "verified" || member.lat === null || member.lng === null) continue;
      const content = document.createElement("div");
      const title = document.createElement("strong"); title.textContent = member.name;
      const address = document.createElement("p"); address.textContent = member.address || member.street;
      const link = document.createElement("a"); link.href = member.googleMapsUrl; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = "Voir sur Google Maps";
      content.append(title, address, link);
      const popup = new maplibregl.Popup({ offset: 16, maxWidth: "260px" }).setDOMContent(content);
      popups.push(popup);
      markers.push(htmlMarker(maplibregl, map, { lat: member.lat, lng: member.lng }, '<span class="vitrines-business-pin"></span>', { title: member.name, onClick: () => { popup.setLngLat([member.lng!, member.lat!]).addTo(map); } }));
    }
    for (const vacancy of vacancies) {
      if (vacancy.locationStatus !== "verified" || vacancy.lat === null || vacancy.lng === null) continue;
      markers.push(htmlMarker(maplibregl, map, { lat: vacancy.lat, lng: vacancy.lng }, `<span class="vitrines-vacancy-pin${vacancy.id === selectedId ? " is-selected" : ""}"><img src="/icons/marker-store.svg" width="16" height="16" alt="" /></span>`, { title: vacancy.label, z: vacancy.id === selectedId ? 10 : 2, onClick: () => onSelect(vacancy.id) }));
    }
    const byStreet = new Map<string, VacancyPoint[]>();
    for (const vacancy of vacancies) {
      if (vacancy.locationStatus === "verified" && vacancy.lat !== null && vacancy.lng !== null) continue;
      const key = streetKey(vacancy.street);
      byStreet.set(key, [...(byStreet.get(key) ?? []), vacancy]);
    }
    for (const [key, list] of byStreet) {
      const street = streets.find((item) => item.key === key);
      if (!street) continue;
      const selected = list.some((vacancy) => vacancy.id === selectedId);
      const size = list.length >= 100 ? 26 : 24;
      const tip = document.createElement("div");
      const title = document.createElement("strong"); title.textContent = `${list.length} local${list.length > 1 ? "aux" : ""} déclaré${list.length > 1 ? "s" : ""} vacant${list.length > 1 ? "s" : ""}`;
      const where = document.createElement("p"); where.textContent = street.name;
      const note = document.createElement("small"); note.textContent = "Position approximative sur la rue.";
      tip.append(title, where, note);
      const popup = new maplibregl.Popup({ closeButton: false, offset: size / 2 + 4, maxWidth: "260px" }).setDOMContent(tip);
      popups.push(popup);
      const marker = htmlMarker(maplibregl, map, street, `<span class="vitrines-street-pin${selected ? " is-selected" : ""}" style="width:${size}px;height:${size}px">${list.length}</span>`, {
        title: `${street.name} : ${list.length} locaux déclarés vacants · position approximative`,
        z: selected ? 20 : 3,
        onClick: () => { popup.setLngLat([street.lng, street.lat]).addTo(map); onSelect(selected ? selectedId : list[0].id); },
      });
      marker.getElement().addEventListener("mouseenter", () => popup.setLngLat([street.lng, street.lat]).addTo(map));
      marker.getElement().addEventListener("mouseleave", () => popup.remove());
      marker.getElement().addEventListener("focus", () => popup.setLngLat([street.lng, street.lat]).addTo(map));
      marker.getElement().addEventListener("blur", () => popup.remove());
      markers.push(marker);
    }
    const cleanup = () => { popups.forEach((popup) => popup.remove()); markers.forEach((marker) => marker.remove()); };
    instance.cleanups.add(cleanup);
    return () => { instance.cleanups.delete(cleanup); cleanup(); };
  }, [instance, vacancies, members, selectedId, onSelect, streets]);

  useEffect(() => {
    const selected = vacancies.find((vacancy) => vacancy.id === selectedId);
    if (!selected) return;
    const point = selected.locationStatus === "verified" && selected.lat !== null && selected.lng !== null
      ? { lat: selected.lat, lng: selected.lng }
      : streets.find((street) => street.key === streetKey(selected.street));
    if (!point) return;
    const key = `${selectedId}:${point.lat}:${point.lng}`;
    if (lastFocus.current === key) return;
    lastFocus.current = key;
    instance.map.easeTo({ center: [point.lng, point.lat], duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450 });
  }, [instance, vacancies, selectedId, streets]);
  return null;
}
