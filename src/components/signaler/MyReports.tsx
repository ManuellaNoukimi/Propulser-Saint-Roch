"use client";

import { useState } from "react";
import { ChevronDown, Inbox, MapPin, MessageSquareText, Trash2 } from "lucide-react";
import { REPORT_STATUSES, reportCategoryOf, reportMomentOf, reportSubtypeOf } from "@/lib/constants";
import { toast } from "@/lib/toast";
import type { Report } from "@/lib/types";
import { CategoryBadge, StatusChip, StatusTrack, when } from "./report-ui";

type Filter = "tous" | (typeof REPORT_STATUSES)[number]["id"];

/** « Mes signalements » : chacun avec son numéro de suivi, où il en est, le mot de la SDC, et « Retirer ». */
export function MyReports({ reports, onRemoved, onNew }: { reports: Report[] | null; onRemoved: (id: string) => void; onNew: () => void }) {
  const [filter, setFilter] = useState<Filter>("tous");
  const [open, setOpen] = useState<string | null>(null);

  if (!reports) return <div className="sg-card space-y-3">{[0, 1, 2].map((k) => <div key={k} className="h-20 animate-pulse rounded-2xl bg-hov" />)}</div>;
  if (!reports.length) {
    return (
      <div className="sg-card sg-empty">
        <span className="sg-empty-icon"><Inbox size={28} /></span>
        <p className="text-lg font-bold">Aucun signalement pour l&apos;instant</p>
        <p className="mt-1 text-sm text-muted">Quand tu signales quelque chose, tu suis ici chaque étape.</p>
        <button type="button" className="ig-btn mt-5" onClick={onNew}>Faire un signalement</button>
      </div>
    );
  }

  const count = (f: Filter) => (f === "tous" ? reports.length : reports.filter((r) => r.status === f).length);
  const shown = filter === "tous" ? reports : reports.filter((r) => r.status === filter);
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Filtrer mes signalements" className="sg-segment">
        {(["tous", ...REPORT_STATUSES.map((s) => s.id)] as Filter[]).map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
            {f === "tous" ? "Tous" : REPORT_STATUSES.find((s) => s.id === f)!.label} <span className="sg-segment-n">{count(f)}</span>
          </button>
        ))}
      </div>
      {!shown.length && <p className="sg-card text-center text-sm text-muted">Rien dans cette liste.</p>}
      <ul className="space-y-3">
        {shown.map((r) => <MyReportCard key={r.id} report={r} open={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} onRemoved={onRemoved} />)}
      </ul>
    </div>
  );
}

function MyReportCard({ report: r, open, onToggle, onRemoved }: { report: Report; open: boolean; onToggle: () => void; onRemoved: (id: string) => void }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const c = reportCategoryOf(r.category);
  const sub = reportSubtypeOf(r.category, r.subtype);
  const moment = reportMomentOf(r.moment);

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/reports/${r.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return toast("Impossible de retirer ce signalement.");
    toast("Signalement retiré");
    onRemoved(r.id);
  }

  return (
    <li className="sg-item" data-open={open} style={{ "--sg-accent": c?.color } as React.CSSProperties}>
      <button type="button" className="sg-item-head" aria-expanded={open} onClick={onToggle}>
        <CategoryBadge category={r.category} />
        <span className="min-w-0 flex-1 text-left">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{c?.label ?? "Signalement"}{sub ? ` · ${sub.label}` : ""}</span>
            <StatusChip status={r.status} />
          </span>
          <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted"><MapPin size={12} className="shrink-0" /> {r.address ?? "Point sur la carte"}</span>
        </span>
        <ChevronDown size={18} className="sg-item-chevron shrink-0 text-muted" aria-hidden="true" />
      </button>
      {open && (
        <div className="sg-item-body">
          <StatusTrack status={r.status} />
          {r.statusNote && (
            <p className="sg-note"><MessageSquareText size={16} className="shrink-0" /><span><strong>Message de la SDC :</strong> {r.statusNote}</span></p>
          )}
          <p className="whitespace-pre-line text-sm">{r.description}</p>
          {r.photos.length > 0 && (
            <div className="sg-photos">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.photos.map((src, i) => <a key={src} href={src} target="_blank" rel="noreferrer" className="sg-photo"><img src={src} alt={`Photo ${i + 1} du signalement`} /></a>)}
            </div>
          )}
          <dl className="sg-meta">
            <div><dt>N° de suivi</dt><dd>{r.ref}</dd></div>
            <div><dt>Envoyé</dt><dd>{when(r.createdAt)}</dd></div>
            {moment && <div><dt>Quand</dt><dd>{moment.label}</dd></div>}
            {r.updatedAt && r.updatedAt !== r.createdAt && <div><dt>Mis à jour</dt><dd>{when(r.updatedAt)}</dd></div>}
          </dl>
          <div className="flex justify-end">
            {confirm ? (
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted">Retirer pour de bon ?</span>
                <button type="button" className="ig-btn-secondary text-sm" onClick={() => setConfirm(false)}>Annuler</button>
                <button type="button" disabled={busy} className="sg-danger" onClick={() => void remove()}>{busy ? "…" : "Retirer"}</button>
              </span>
            ) : (
              <button type="button" className="sg-link inline-flex items-center gap-1" onClick={() => setConfirm(true)}><Trash2 size={14} /> Retirer ce signalement</button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
