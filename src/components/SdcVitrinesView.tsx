"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, Check, Download, Footprints, MapPin, Search, ShieldCheck, Vote } from "lucide-react";
import { BOOKING_PROJECTS, WISHES, wishOf } from "@/lib/quartier";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { AuthPrompt } from "./AuthPrompt";

// Vue SDC des vitrines : la demande par local, preuve pour les propriétaires et les entrepreneurs.
// Données : /api/sdc/vitrines (code de Manuella, réservé aux comptes SDC).

type Booking = {
  id: string; project: string; title: string; weeks: number; startsOn: string; endsOn: string;
  status: "pending" | "confirmed"; applicant: { id: string; displayName: string };
};
type Local = {
  id: string; label: string; street: string; locationStatus: string; isDemo: boolean;
  votes: Record<string, number>; totalVotes: number; visits: number; bookings: Booking[];
};
type Payload = { vacancies: Local[]; ranking: { wish: string; votes: number }[]; addresses: Record<string, string> };
type Filter = "tous" | "votes" | "demandes";

const day = (d: string) => new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

export function SdcVitrinesView() {
  const { user, loading } = useSession();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [filter, setFilter] = useState<Filter>("tous");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/sdc/vitrines", { cache: "no-store" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r?.ok) return setError({ status: r?.status ?? 0, message: d?.error ?? "Chargement impossible." });
    setError(null);
    setData(d as Payload);
  }, []);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [user, load]);

  // Même nom que l'écran public : « Local 3 », numéroté dans sa rue
  const names = useMemo(() => {
    const m = new Map<string, string>();
    const perStreet = new Map<string, number>();
    for (const v of data?.vacancies ?? []) {
      const n = (perStreet.get(v.street) ?? 0) + 1;
      perStreet.set(v.street, n);
      m.set(v.id, v.isDemo ? v.label : `Local ${n}`);
    }
    return m;
  }, [data]);

  if (loading) return <p className="p-10 text-center text-muted">Chargement…</p>;
  if (!user) return <AuthPrompt title="Vue SDC" text="Connecte-toi avec le compte de la SDC pour voir la demande par local." next="/sdc/vitrines" />;
  if (error?.status === 403)
    return (
      <div className="mx-auto my-12 max-w-sm px-6 text-center">
        <ShieldCheck size={36} className="mx-auto text-muted" />
        <h1 className="mt-4 text-lg font-semibold">Réservé à la SDC</h1>
        <p className="mt-2 text-sm text-muted">Cet écran montre les demandes et les noms des demandeurs : seul le compte de la SDC y a accès.</p>
        <Link href="/vitrines" className="ig-btn mt-6 inline-flex">Voir les vitrines</Link>
      </div>
    );
  if (error) return <p role="alert" className="p-10 text-center text-muted">{error.message}</p>;
  if (!data) return <div className="mx-auto max-w-[1100px] space-y-3 px-4 py-8">{[0, 1, 2].map((k) => <div key={k} className="h-24 animate-pulse rounded-xl bg-hov" />)}</div>;

  const all = data.vacancies;
  const pending = all.flatMap((v) => v.bookings.filter((b) => b.status === "pending"));
  const confirmed = all.flatMap((v) => v.bookings.filter((b) => b.status === "confirmed"));
  const votes = all.reduce((n, v) => n + v.totalVotes, 0);
  const visits = all.reduce((n, v) => n + v.visits, 0);
  const maxRank = Math.max(1, ...data.ranking.map((r) => r.votes));
  const q = query.trim().toLowerCase();
  const list = all
    .filter((v) => (filter === "votes" ? v.totalVotes > 0 : filter === "demandes" ? v.bookings.length > 0 : true))
    .filter((v) => !q || `${names.get(v.id)} ${v.street} ${data.addresses[v.id] ?? ""}`.toLowerCase().includes(q))
    .sort((a, b) => b.totalVotes - a.totalVotes || b.bookings.length - a.bookings.length || 0);

  async function post(url: string, body: unknown, key: string, ok: string) {
    setBusy(key);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(null);
    if (!r?.ok) return toast(d?.error ?? "Action impossible. Réessaie.");
    toast(ok);
    await load();
  }

  function exportCsv() {
    const rows = [["Local", "Rue", "Adresse vérifiée", "Votes", "Visites promises par semaine", "Souhait n° 1", "Demandes en attente", "Occupations confirmées"]];
    for (const v of [...all].sort((a, b) => b.totalVotes - a.totalVotes)) {
      const top = Object.entries(v.votes).sort((a, b) => b[1] - a[1])[0];
      rows.push([names.get(v.id) ?? v.label, v.street, data!.addresses[v.id] ?? "", String(v.totalVotes), String(v.visits),
        top ? `${wishOf(top[0])?.label ?? top[0]} (${top[1]})` : "", String(v.bookings.filter((b) => b.status === "pending").length),
        String(v.bookings.filter((b) => b.status === "confirmed").length)]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "demande-par-local-saint-roch.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const stats = [
    { n: all.length, label: "locaux vacants" },
    { n: votes, label: "votes « Ce que je veux ici »" },
    { n: visits, label: "visites promises par semaine" },
    { n: pending.length, label: "demandes d'occupation en attente" },
    { n: confirmed.length, label: "occupations confirmées" },
  ];

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-6 md:px-7 md:py-10">
      <header className="gallery-intro rounded-2xl border border-line px-6 py-7 md:px-8">
        <p className="flex items-center gap-1.5 text-sm font-medium text-muted"><ShieldCheck size={16} /> Vue SDC · Saint-Roch</p>
        <h1 className="mt-2 text-[28px] font-bold leading-tight md:text-[36px]">Demande par <span className="text-ig-blue">local</span></h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Ce que les gens veulent dans chaque local vacant, combien de fois ils y iraient, et qui veut l&apos;occuper en attendant : une preuve de demande à montrer aux propriétaires et aux entrepreneurs.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} className="ig-btn"><Download size={16} /> Exporter (CSV)</button>
          <Link href="/vitrines" className="ig-btn-secondary">Voir l&apos;écran public</Link>
        </div>
      </header>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <li key={s.label} className="surface-card p-4">
            <p className="text-2xl font-bold tabular-nums">{s.n}</p>
            <p className="mt-1 text-xs text-muted">{s.label}</p>
          </li>
        ))}
      </ul>

      <section className="surface-card p-5">
        <h2 className="flex items-center gap-2 font-bold"><Vote size={18} className="text-ig-blue" /> Ce que le quartier demande</h2>
        {data.ranking.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucun vote pour l&apos;instant.</p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {data.ranking.map((r) => (
              <li key={r.wish} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 truncate sm:w-36"> {wishOf(r.wish)?.label ?? r.wish}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-soft"><span className="block h-full rounded-full bg-ig-blue" style={{ width: `${(r.votes / maxRank) * 100}%` }} /></span>
                <span className="w-14 shrink-0 text-right font-semibold tabular-nums sm:w-16">{r.votes} vote{r.votes > 1 ? "s" : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Les locaux</h2>
          <label className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rue, local ou adresse" aria-label="Chercher un local" className="ig-input pl-9" />
          </label>
        </div>
        <div role="group" aria-label="Filtrer les locaux" className="flex flex-wrap gap-2">
          {([["tous", `Tous (${all.length})`], ["votes", `Avec des votes (${all.filter((v) => v.totalVotes > 0).length})`], ["demandes", `Avec des demandes (${all.filter((v) => v.bookings.length > 0).length})`]] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}
              className={`min-h-10 rounded-lg border px-3.5 text-sm font-medium transition ${filter === id ? "border-ig-blue bg-ig-blue text-white" : "border-line bg-bg hover:bg-soft"}`}>{label}</button>
          ))}
        </div>

        {list.length === 0 && <p className="surface-card p-6 text-center text-sm text-muted">Aucun local pour ce filtre.</p>}
        <ul className="grid gap-3 lg:grid-cols-2">
          {list.map((v) => {
            const wishes = Object.entries(v.votes).sort((a, b) => b[1] - a[1]);
            const max = Math.max(1, ...wishes.map(([, n]) => n));
            const verified = v.locationStatus === "verified";
            return (
              <li key={v.id} className="surface-card flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{names.get(v.id)}, {v.street}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted"><MapPin size={12} /> {verified ? data.addresses[v.id] ?? "Adresse vérifiée" : "Numéro civique à indiquer"}</p>
                  </div>
                  <p className="shrink-0 text-right text-xs text-muted"><span className="block text-lg font-bold text-fg tabular-nums">{v.totalVotes}</span>vote{v.totalVotes > 1 ? "s" : ""}</p>
                </div>

                {wishes.length > 0 ? (
                  <ul className="space-y-1.5">
                    {wishes.slice(0, 3).map(([w, n]) => (
                      <li key={w} className="flex items-center gap-2 text-xs">
                        <span className="w-28 shrink-0 truncate"> {wishOf(w)?.label ?? w}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-soft"><span className="block h-full rounded-full bg-ig-green" style={{ width: `${(n / max) * 100}%` }} /></span>
                        <span className="w-6 text-right tabular-nums">{n}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-muted">Pas encore de vote.</p>}
                {v.visits > 0 && <p className="flex items-center gap-1.5 text-xs"><Footprints size={13} className="text-ig-blue" /> environ <strong>{v.visits}</strong> visites promises par semaine</p>}

                {v.bookings.length > 0 && (
                  <ul className="space-y-2 border-t border-line pt-3">
                    {v.bookings.map((b) => {
                      const project = BOOKING_PROJECTS.find((p) => p.id === b.project);
                      return (
                        <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 font-medium"><CalendarRange size={14} className="shrink-0 text-ig-blue" /> {b.title}</span>
                            <span className="block text-xs text-muted"> {project?.label} · {b.applicant.displayName} · du {day(b.startsOn)} au {day(b.endsOn)} ({b.weeks} sem.)</span>
                          </span>
                          {b.status === "confirmed" ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-ig-green/15 px-2 py-1 text-xs font-semibold text-[#3f6d1f]"><Check size={13} /> Confirmée</span>
                          ) : (
                            <button type="button" disabled={!verified || busy === b.id} title={verified ? "" : "Indique d'abord le numéro civique du local"}
                              onClick={() => void post("/api/sdc/vitrines/confirmer", { bookingId: b.id }, b.id, "Occupation confirmée : elle apparaît dans le fil.")}
                              className="ig-btn min-h-9 px-3 py-1.5 text-xs disabled:opacity-50">{busy === b.id ? "…" : "Confirmer"}</button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {!verified && <AddressForm busy={busy === `adr-${v.id}`} onSubmit={(civic) => void post("/api/sdc/vitrines/adresse", { vacancyId: v.id, civic }, `adr-${v.id}`, "Adresse vérifiée : le local est placé sur la carte.")} />}
              </li>
            );
          })}
        </ul>
      </section>
      <p className="text-xs text-muted">Les souhaits possibles : {WISHES.map((w) => w.label).join(", ")}.</p>
    </div>
  );
}

function AddressForm({ busy, onSubmit }: { busy: boolean; onSubmit: (civic: string) => void }) {
  const [civic, setCivic] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (civic.trim()) onSubmit(civic.trim()); }} className="flex items-center gap-2 border-t border-line pt-3">
      <input value={civic} onChange={(e) => setCivic(e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" placeholder="N° civique" aria-label="Numéro civique du local" className="ig-input max-w-[120px] py-2" />
      <button type="submit" disabled={busy || !civic} className="ig-btn-secondary min-h-9 px-3 py-1.5 text-xs disabled:opacity-50">{busy ? "…" : "Vérifier l'adresse"}</button>
    </form>
  );
}
