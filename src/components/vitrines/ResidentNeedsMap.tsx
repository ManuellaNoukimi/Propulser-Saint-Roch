"use client";

import { circle } from "@turf/circle";
import { useEffect } from "react";
import type { GeoJSONSource, MapMouseEvent, Marker } from "maplibre-gl";
import type { ResidentNeed, ResidentZone } from "@/lib/resident-need-options";
import { DistrictMap, type DistrictInstance } from "./DistrictMap";

type Props = { needs: ResidentNeed[]; zone: ResidentZone | null; onPick: (lat: number, lng: number) => void };

export function ResidentNeedsMap(props: Props) {
  return <DistrictMap label="Carte de sélection de ma zone à Saint-Roch">
    {(instance) => <NeedsLayers {...props} instance={instance} />}
  </DistrictMap>;
}

function NeedsLayers({ instance, needs, zone, onPick }: Props & { instance: DistrictInstance }) {
  useEffect(() => {
    const { map, maplibregl } = instance;
    const source = "resident-zones";
    const features: GeoJSON.Feature<GeoJSON.Polygon>[] = needs.map((need) => circle([need.zone.lng, need.zone.lat], need.zone.radiusMeters, { units: "meters", properties: { kind: "need", lat: need.zone.lat, lng: need.zone.lng, label: need.label, supporters: need.supporters, radius: need.zone.radiusMeters } }));
    if (zone) features.push(circle([zone.lng, zone.lat], zone.radiusMeters, { units: "meters", properties: { kind: "selection" } }));
    if (!map.getSource(source)) {
      map.addSource(source, { type: "geojson", data: { type: "FeatureCollection", features } });
      map.addLayer({ id: "resident-zones-fill", type: "fill", source, paint: { "fill-color": ["case", ["==", ["get", "kind"], "selection"], "#0096d6", "#ff8a00"], "fill-opacity": ["case", ["==", ["get", "kind"], "selection"], 0.2, 0.12] } });
      map.addLayer({ id: "resident-zones-line", type: "line", source, paint: { "line-color": ["case", ["==", ["get", "kind"], "selection"], "#0096d6", "#e07000"], "line-width": ["case", ["==", ["get", "kind"], "selection"], 3, 2] } });
    } else {
      (map.getSource(source) as GeoJSONSource).setData({ type: "FeatureCollection", features });
    }
    const atPoint = (event: MapMouseEvent) => map.queryRenderedFeatures(event.point, { layers: ["resident-zones-fill"] }).find((feature) => feature.properties.kind === "need");
    const pick = (event: MapMouseEvent) => {
      const need = atPoint(event);
      if (need) onPick(Number(need.properties.lat), Number(need.properties.lng));
      else onPick(event.lngLat.lat, event.lngLat.lng);
    };
    const popup = new maplibregl.Popup({ closeButton: false, offset: 10, maxWidth: "260px" });
    const hover = (event: MapMouseEvent) => {
      const need = atPoint(event);
      if (!need) { popup.remove(); map.getCanvas().style.cursor = ""; return; }
      map.getCanvas().style.cursor = "pointer";
      popup.setLngLat(event.lngLat).setText(`${need.properties.label} · ${need.properties.supporters} soutien(s) · rayon ${need.properties.radius} m`).addTo(map);
    };
    let marker: Marker | undefined;
    if (zone) {
      const element = document.createElement("div");
      element.className = "vitrines-zone-pin";
      element.title = "Déplacer le centre de ma zone";
      element.tabIndex = 0;
      element.setAttribute("role", "button");
      element.setAttribute("aria-label", element.title);
      marker = new maplibregl.Marker({ element, draggable: true }).setLngLat([zone.lng, zone.lat]).addTo(map);
      marker.on("dragend", () => {
        const position = marker!.getLngLat();
        onPick(position.lat, position.lng);
        marker!.setLngLat([zone.lng, zone.lat]);
      });
      element.addEventListener("click", (event) => event.stopPropagation());
      element.addEventListener("keydown", (event) => {
        const move = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[event.key];
        if (!move) return;
        event.preventDefault(); event.stopPropagation();
        const point = map.project([zone.lng, zone.lat]);
        const position = map.unproject([point.x + move[0], point.y + move[1]]);
        onPick(position.lat, position.lng);
      });
    }
    map.on("click", pick);
    map.on("mousemove", hover);
    const moving = () => { popup.remove(); };
    map.on("movestart", moving);
    const cleanup = () => {
      map.off("click", pick); map.off("mousemove", hover); map.off("movestart", moving);
      map.getCanvas().style.cursor = "";
      popup.remove(); marker?.remove();
    };
    instance.cleanups.add(cleanup);
    return () => { instance.cleanups.delete(cleanup); cleanup(); };
  }, [instance, needs, zone, onPick]);
  return null;
}
