"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, ExternalLink, MapPin, Navigation, Store } from "lucide-react";

// Fiche publique d'un commerce ou organisme de la liste SDC (sans compte Complices).
type Entry = {
  id: string; name: string; activity: string; street: string; nonprofit: boolean; address: string | null;
  at: { lat: number; lng: number; exact: boolean; address: string } | null; googleMapsUrl: string; accountId: string | null;
};

export function SdcEntryView({ id }: { id: string }) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/annuaire/sdc/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { entry: Entry }) => setEntry(d.entry))
      .catch(() => setMissing(true));
  }, [id]);

  if (missing) return (
    <div className="mx-auto my-12 max-w-sm px-6 text-center">
      <p className="font-semibold">Fiche introuvable.</p>
      <Link href="/annuaire" className="ig-btn mt-5 inline-flex">Retour à l&apos;annuaire</Link>
    </div>
  );
  if (!entry) return <div className="mx-auto max-w-[720px] px-4 py-10"><div className="h-48 animate-pulse rounded-xl bg-hov" /></div>;

  const go = entry.at ? `/y-aller?vers=${entry.at.lat.toFixed(6)},${entry.at.lng.toFixed(6)}&nom=${encodeURIComponent(entry.name)}` : null;
  return (
    <div className="mx-auto max-w-[720px] space-y-5 px-4 py-6 md:py-10">
      <Link href="/annuaire" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-muted hover:text-fg"><ArrowLeft size={16} /> Annuaire</Link>
      <section className="gallery-intro rounded-2xl border border-line p-6 md:p-8">
        <span className="grid h-14 w-14 place-items-center rounded-xl bg-bg text-ig-blue"><Store size={26} /></span>
        <h1 className="mt-4 text-[26px] font-bold leading-tight md:text-[32px]">{entry.name}</h1>
        <p className="mt-1 text-muted">{entry.activity}{entry.nonprofit ? " · Organisme sans but lucratif" : ""}</p>
        <p className="mt-3 flex items-center gap-1.5 text-sm"><MapPin size={15} className="shrink-0 text-ig-blue" /> {entry.address ?? entry.street}, Saint-Roch</p>
        {entry.accountId && (
          <Link href={`/u/${entry.accountId}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ig-blue"><BadgeCheck size={16} /> Voir sa page sur Complices</Link>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          {go && <Link href={go} className="ig-btn"><Navigation size={16} /> Y aller</Link>}
          <a href={entry.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="ig-btn-secondary"><ExternalLink size={16} /> Google Maps</a>
        </div>
      </section>
      {!entry.accountId && (
        <section className="surface-card p-5">
          <h2 className="font-semibold">C&apos;est ton commerce ?</h2>
          <p className="mt-1 text-sm text-muted">Crée ton compte Entreprise : tu auras ta page, tu pourras publier tes promos et tes événements, et recevoir les messages du quartier.</p>
          <Link href="/inscription" className="ig-btn mt-4 inline-flex">Créer mon compte Entreprise</Link>
        </section>
      )}
    </div>
  );
}
