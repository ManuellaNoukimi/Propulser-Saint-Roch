"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, MapPin, RefreshCw, Save } from "lucide-react";
import { htmlMarker } from "@/lib/map3d";
import { REPORT_STATUSES, reportCategoryOf, reportMomentOf, reportSubtypeOf } from "@/lib/constants";
import { toast } from "@/lib/toast";
import type { Report } from "@/lib/types";
import { DistrictMap, type DistrictInstance } from "../vitrines/DistrictMap";
import { CategoryBadge, StatusChip, StatusTrack, categoryOptions, statusOptions, when } from "./report-ui";
import { Select } from "./Select";

/**
 * Suivi SDC : tous les signalements du quartier (auteurs anonymes), sur une carte et en liste,
 * filtrés par catégorie et par statut. La SDC fait avancer chaque signalement et laisse un mot à l'auteur.
 */
export function SdcReports() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>("recu");
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/sdc/signalements", { cache: "no-store" }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) return setError(d?.error ?? "Chargement impossible.");
    setError(null);
    setReports(d.reports);
  }, []);
  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t); }, [load]);

  const shown = useMemo(() => (reports ?? []).filter((r) => (!category || r.category === category) && (!status || r.status === status)), [reports, category, status]);
  const counts = useMemo(() => Object.fromEntries(REPORT_STATUSES.map((s) => [s.id, (reports ?? []).filter((r) => r.status === s.id).length])), [reports]);

  if (error) return <div className="sg-card text-center"><p className="font-semibold">{error}</p><button type="button" className="ig-btn-secondary mt-3" onClick={() => void load()}>Réessayer</button></div>;
  if (!reports) return <div className="sg-card flex items-center justify-center gap-2 py-12 text-sm text-muted"><LoaderCircle size={16} className="animate-spin" /> Chargement des signalements…</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {REPORT_STATUSES.map((s) => {
          const opt = statusOptions.find((o) => o.value === s.id)!;
          return (
            <button key={s.id} type="button" aria-pressed={status === s.id} onClick={() => setStatus(status === s.id ? null : s.id)} className="sg-kpi" style={{ "--sg-accent": opt.color } as React.CSSProperties}>
              <span className="sg-kpi-icon">{opt.icon}</span>
              <span className="sg-kpi-n">{counts[s.id]}</span>
              <span className="sg-kpi-label">{s.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1"><Select label="Catégorie" optional value={category} placeholder="Toutes les catégories" options={categoryOptions} onChange={setCategory} /></div>
        <div className="min-w-[200px] flex-1"><Select label="Statut" optional value={status} placeholder="Tous les statuts" options={statusOptions} onChange={setStatus} /></div>
        <button type="button" className="ig-btn-secondary min-h-12" onClick={() => void load()} aria-label="Actualiser"><RefreshCw size={16} /></button>
      </div>

      <div className="sg-map sg-map--sdc">
        <DistrictMap label="Carte des signalements de Saint-Roch">
          {(inst) => <ReportMarkers instance={inst} reports={shown} selected={selected} onSelect={setSelected} />}
        </DistrictMap>
      </div>

      <p className="text-sm text-muted">{shown.length} signalement{shown.length > 1 ? "s" : ""}{status ? ` · ${REPORT_STATUSES.find((s) => s.id === status)!.label.toLowerCase()}` : ""}</p>
      {!shown.length && <p className="sg-card text-center text-sm text-muted">Aucun signalement avec ces filtres.</p>}
      <ul className="space-y-3">
        {shown.map((r) => (
          <SdcReportCard key={r.id} report={r} open={selected === r.id} onToggle={() => setSelected(selected === r.id ? null : r.id)}
            onSaved={(next) => setReports((list) => list?.map((x) => (x.id === next.id ? next : x)) ?? null)} />
        ))}
      </ul>
    </div>
  );
}

function ReportMarkers({ instance, reports, selected, onSelect }: { instance: DistrictInstance; reports: Report[]; selected: string | null; onSelect: (id: string) => void }) {
  useEffect(() => {
    const { map, maplibregl } = instance;
    const markers = reports.map((r) => {
      const c = reportCategoryOf(r.category);
      const on = r.id === selected;
      return htmlMarker(maplibregl, map, r, `<span class="sg-dot${on ? " is-on" : ""}${r.status === "regle" ? " is-done" : ""}" style="--sg-accent:${c?.color ?? "#64748b"}"></span>`, {
        title: `${c?.label ?? "Signalement"} · ${r.address ?? r.ref}`,
        z: on ? 9 : r.status === "regle" ? 1 : 3,
        onClick: () => {
          onSelect(r.id);
          document.getElementById(`sg-sdc-${r.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        },
      });
    });
    const cleanup = () => markers.forEach((m) => m.remove());
    instance.cleanups.add(cleanup);
    return () => { cleanup(); instance.cleanups.delete(cleanup); };
  }, [instance, reports, selected, onSelect]);
  useEffect(() => {
    const r = reports.find((x) => x.id === selected);
    if (r) instance.map.easeTo({ center: [r.lng, r.lat], zoom: Math.max(instance.map.getZoom(), 16), duration: 450 });
  }, [instance, reports, selected]);
  return null;
}

function SdcReportCard({ report: r, open, onToggle, onSaved }: { report: Report; open: boolean; onToggle: () => void; onSaved: (r: Report) => void }) {
  const [status, setStatus] = useState<string | null>(r.status);
  const [note, setNote] = useState(r.statusNote ?? "");
  const [saving, setSaving] = useState(false);
  const c = reportCategoryOf(r.category);
  const sub = reportSubtypeOf(r.category, r.subtype);
  const moment = reportMomentOf(r.moment);
  const changed = status !== r.status || note.trim() !== (r.statusNote ?? "");

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/sdc/signalements/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note: note.trim() || null }) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setSaving(false);
    if (!res?.ok) return toast(d?.error ?? "Enregistrement impossible.");
    onSaved(d.report);
    toast("Signalement mis à jour");
  }

  return (
    <li id={`sg-sdc-${r.id}`} className="sg-item scroll-mt-24" data-open={open} style={{ "--sg-accent": c?.color } as React.CSSProperties}>
      <button type="button" className="sg-item-head" aria-expanded={open} onClick={onToggle}>
        <CategoryBadge category={r.category} />
        <span className="min-w-0 flex-1 text-left">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{c?.label ?? "Signalement"}{sub ? ` · ${sub.label}` : ""}</span>
            <StatusChip status={r.status} />
          </span>
          <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted"><MapPin size={12} className="shrink-0" /> {r.address ?? "Point sur la carte"} · {when(r.createdAt)}</span>
        </span>
        <span className="hidden text-xs font-semibold text-muted sm:inline">{r.ref}</span>
      </button>
      {open && (
        <div className="sg-item-body">
          <p className="whitespace-pre-line text-sm">{r.description}</p>
          {moment && <p className="text-xs text-muted">Moment : {moment.label}</p>}
          {r.photos.length > 0 && (
            <div className="sg-photos">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.photos.map((src, i) => <a key={src} href={src} target="_blank" rel="noreferrer" className="sg-photo"><img src={src} alt={`Photo ${i + 1}`} /></a>)}
            </div>
          )}
          <StatusTrack status={status ?? r.status} />
          <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
            <Select label="Statut" value={status} options={statusOptions} onChange={(v) => setStatus(v ?? r.status)} />
            <div>
              <label htmlFor={`note-${r.id}`} className="sg-label">Message pour l&apos;auteur <span className="sg-optional">· facultatif</span></label>
              <textarea id={`note-${r.id}`} rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className="sg-textarea" placeholder="Ex. : transmis aux travaux publics de la Ville, intervention prévue jeudi." />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" className="ig-btn" disabled={!changed || saving} onClick={() => void save()}>
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
