"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import "../yaller/map3d.css";
import "../yaller/travel-map.css";
import "../yaller/compact-markers.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Cuboid, Globe, LocateFixed, LoaderCircle, Map as MapIcon } from "lucide-react";
import { createMap3D, set3DView, setSatelliteMode } from "@/lib/map3d";
import { SAINT_ROCH_BOUNDS } from "@/lib/saint-roch-boundary";

export type DistrictInstance = Awaited<ReturnType<typeof createMap3D>> & { cleanups: Set<() => void> };

const [[west, south], [east, north]] = SAINT_ROCH_BOUNDS;
const BOUNDS: [[number, number], [number, number]] = [
  [west - (east - west) * 0.05, south - (north - south) * 0.05],
  [east + (east - west) * 0.05, north + (north - south) * 0.05],
];
const duration = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;

export function DistrictMap({ label, children }: { label: string; children: (instance: DistrictInstance) => ReactNode }) {
  const element = useRef<HTMLDivElement>(null);
  const [instance, setInstance] = useState<DistrictInstance | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [satellite, setSatellite] = useState(false);
  const [threeD, setThreeD] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let created: DistrictInstance | null = null;
    let observer: ResizeObserver | undefined;
    const dispose = () => {
      observer?.disconnect();
      if (!created) return;
      const current = created;
      created = null;
      current.cleanups.forEach((cleanup) => cleanup());
      current.cleanups.clear();
      current.map.stop();
      current.map.remove();
    };
    void (async () => {
      if (!element.current) return;
      const result = await createMap3D(element.current, { controls: true, light: true, cooperative: true, signal: controller.signal });
      created = { ...result, cleanups: new Set() };
      if (controller.signal.aborted) { dispose(); return; }
      const { map } = created;
      map.setMaxBounds(BOUNDS);
      const lockZoom = () => {
        const camera = map.cameraForBounds(BOUNDS, { padding: 18 });
        if (camera?.zoom !== undefined) map.setMinZoom(Math.min(17, camera.zoom));
      };
      map.fitBounds(BOUNDS, { padding: 24, duration: 0 });
      lockZoom();
      map.on("pitchend", () => { if (!controller.signal.aborted) setThreeD(map.getPitch() > 10); });
      observer = new ResizeObserver(() => {
        if (controller.signal.aborted) return;
        map.resize();
        lockZoom();
      });
      observer.observe(element.current);
      setInstance(created);
    })().catch((error: unknown) => {
      dispose();
      if (controller.signal.aborted) return;
      console.error("Carte Vitrines indisponible:", error);
      setFailed(true);
    });
    return () => { controller.abort(); dispose(); };
  }, [attempt]);

  useEffect(() => {
    if (!instance) return;
    const apply = () => setSatelliteMode(instance.map, satellite);
    if (instance.map.isStyleLoaded()) apply();
    else instance.map.once("idle", apply);
    return () => { instance.map.off("idle", apply); };
  }, [instance, satellite]);

  function retry() {
    setInstance(null);
    setFailed(false);
    setSatellite(false);
    setThreeD(true);
    setAttempt((value) => value + 1);
  }
  function viewSatellite(active: boolean) {
    if (!instance) return;
    setSatellite(active);
  }

  return (
    <div className="ya-3d-map map-points vitrines-map">
      <div ref={element} className="ya-map3d-canvas bg-soft" role="application" aria-label={label} />
      {instance && children(instance)}
      <div className="ya-3d-controls" role="group" aria-label="Vue de la carte">
        <button type="button" disabled={!instance} onClick={() => viewSatellite(false)} aria-pressed={!satellite} title="Vue Plan"><MapIcon size={15} /> Plan</button>
        <button type="button" disabled={!instance} onClick={() => viewSatellite(true)} aria-pressed={satellite} title="Vue Satellite HD"><Globe size={15} /> Satellite</button>
        <div className="ya-3d-controls-divider" aria-hidden="true" />
        <button type="button" disabled={!instance} onClick={() => { if (instance) set3DView(instance.map, !threeD); setThreeD(!threeD); }} aria-pressed={threeD} title={threeD ? "Passer en vue 2D" : "Passer en vue 3D"}><Cuboid size={16} /> 3D</button>
        <button type="button" disabled={!instance} onClick={() => instance?.map.fitBounds(BOUNDS, { padding: 24, duration: duration() })} aria-label="Recentrer sur Saint-Roch" title="Recentrer sur Saint-Roch"><LocateFixed size={17} /></button>
      </div>
      {!instance && <div className="ya-3d-feedback" role="status">
        {failed ? <><span>Carte indisponible.</span><button type="button" onClick={retry}>Réessayer</button></> : <><LoaderCircle size={15} className="animate-spin" /> Chargement de la carte…</>}
      </div>}
    </div>
  );
}
