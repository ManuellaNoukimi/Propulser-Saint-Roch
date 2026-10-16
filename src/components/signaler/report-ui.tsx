"use client";

import { CircleCheck, Clock3, Construction, HeartHandshake, Hourglass, Inbox, Moon, OctagonAlert, Repeat, SprayCan, Sun, Sunset, Trash2 } from "lucide-react";
import { REPORT_CATEGORIES, REPORT_MOMENTS, REPORT_STATUSES, reportCategoryOf, reportStatusOf, type ReportCategoryId } from "@/lib/constants";
import type { SelectOption } from "./Select";

// « Signaler » : icônes, couleurs et petits éléments partagés par le formulaire, « Mes signalements » et le suivi SDC.
export const CATEGORY_ICON: Record<ReportCategoryId, typeof Trash2> = {
  itinerance: HeartHandshake,
  proprete: Trash2,
  infraction: OctagonAlert,
  degat: Construction,
  vandalisme: SprayCan,
};
const MOMENT_ICON = { maintenant: Clock3, jour: Sun, soir: Sunset, nuit: Moon, toujours: Repeat } as const;
const STATUS_ICON = { recu: Inbox, "en-cours": Hourglass, regle: CircleCheck } as const;
export const STATUS_COLOR: Record<string, string> = { recu: "#64748b", "en-cours": "#e8590c", regle: "#22a06b" };

export const momentOptions: SelectOption<string>[] = REPORT_MOMENTS.map((m) => {
  const Icon = MOMENT_ICON[m.id];
  return { value: m.id, label: m.label, icon: <Icon size={17} /> };
});
export const statusOptions: SelectOption<string>[] = REPORT_STATUSES.map((s) => {
  const Icon = STATUS_ICON[s.id];
  return { value: s.id, label: s.label, hint: s.hint, icon: <Icon size={17} />, color: STATUS_COLOR[s.id] };
});
export const categoryOptions: SelectOption<string>[] = REPORT_CATEGORIES.map((c) => {
  const Icon = CATEGORY_ICON[c.id];
  return { value: c.id, label: c.label, hint: c.hint, icon: <Icon size={17} />, color: c.color };
});

/** Pastille ronde colorée avec l'icône de la catégorie. */
export function CategoryBadge({ category, size = 40 }: { category: string; size?: number }) {
  const c = reportCategoryOf(category);
  const Icon = c ? CATEGORY_ICON[c.id] : Trash2;
  return (
    <span className="sg-badge" style={{ "--sg-accent": c?.color ?? "#64748b", width: size, height: size } as React.CSSProperties} aria-hidden="true">
      <Icon size={Math.round(size * 0.48)} />
    </span>
  );
}

/** Étiquette de statut (Reçu · En traitement · Réglé). */
export function StatusChip({ status }: { status: string }) {
  const s = reportStatusOf(status);
  const Icon = STATUS_ICON[s.id];
  return (
    <span className="sg-status" style={{ "--sg-accent": STATUS_COLOR[s.id] } as React.CSSProperties}>
      <Icon size={13} aria-hidden="true" /> {s.label}
    </span>
  );
}

/** Ligne de suivi en 3 étapes : où en est le signalement. */
export function StatusTrack({ status }: { status: string }) {
  const at = REPORT_STATUSES.findIndex((s) => s.id === reportStatusOf(status).id);
  return (
    <ol className="sg-track" aria-label={`Suivi : ${REPORT_STATUSES[at].label}`}>
      {REPORT_STATUSES.map((s, i) => (
        <li key={s.id} data-done={i <= at} data-current={i === at} style={{ "--sg-accent": STATUS_COLOR[REPORT_STATUSES[at].id] } as React.CSSProperties}>
          <span className="sg-track-dot" aria-hidden="true" />
          <span className="sg-track-label">{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

const dayFormat = new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" });
export const when = (iso: string) => dayFormat.format(new Date(iso));
