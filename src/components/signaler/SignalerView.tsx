"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Flag, Lock, ShieldCheck } from "lucide-react";
import "./signaler.css";
import { REPORT_CATEGORIES, isGuest } from "@/lib/constants";
import { loginHref, useSession } from "@/lib/session";
import type { Report } from "@/lib/types";
import { useIsSdc } from "@/lib/use-sdc";
import { MyReports } from "./MyReports";
import { ReportFlow } from "./ReportFlow";
import { CATEGORY_ICON } from "./report-ui";
import { SdcReports } from "./SdcReports";

type Tab = "signaler" | "mes" | "suivi";
type Stats = { days: number; total: number; inProgress: number; resolved: number; byCategory: { id: string; total: number; resolved: number }[] };

/** Page /signaler : nouveau signalement, « Mes signalements » et (compte SDC) le suivi de tout le quartier. */
export function SignalerView() {
  const { user, loading } = useSession();
  const sdc = useIsSdc();
  const [tab, setTab] = useState<Tab>("signaler");
  const [mine, setMine] = useState<Report[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const loadMine = useCallback(async () => {
    const res = await fetch("/api/reports", { cache: "no-store" }).catch(() => null);
    if (res?.ok) setMine((await res.json()).reports);
  }, []);
  const loadStats = useCallback(async () => {
    const res = await fetch("/api/reports/stats", { cache: "no-store" }).catch(() => null);
    if (res?.ok) setStats(await res.json());
  }, []);
  useEffect(() => { const t = setTimeout(() => void loadStats(), 0); return () => clearTimeout(t); }, [loadStats]);
  useEffect(() => {
    if (!user || isGuest(user.accountType)) return;
    const t = setTimeout(() => void loadMine(), 0);
    return () => clearTimeout(t);
  }, [user, loadMine]);

  const canReport = !!user && !isGuest(user.accountType);
  const tabs: { id: Tab; label: string; n?: number; icon: typeof Flag }[] = [
    { id: "signaler", label: "Signaler", icon: Flag },
    { id: "mes", label: "Mes signalements", n: mine?.length, icon: ClipboardList },
    ...(sdc ? [{ id: "suivi" as const, label: "Suivi SDC", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="signaler-page mx-auto max-w-[880px] px-4 pb-16 pt-6 md:px-8 md:pt-10">
      <header className="sg-hero">
        <p className="sg-eyebrow"><Lock size={12} /> Privé · jamais dans les publications</p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Signaler</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Quelque chose ne va pas dans Saint-Roch ? Dis-le à l&apos;endroit exact. La SDC reçoit ton signalement, sans ton nom, et tu suis chaque étape.
        </p>
        {stats && stats.total > 0 && (
          <div className="sg-stats" aria-label={`Les ${stats.days} derniers jours`}>
            <p><strong>{stats.total}</strong> signalement{stats.total > 1 ? "s" : ""} en {stats.days} jours · <strong>{stats.resolved}</strong> réglé{stats.resolved > 1 ? "s" : ""}</p>
            <ul>
              {REPORT_CATEGORIES.map((c) => {
                const s = stats.byCategory.find((x) => x.id === c.id);
                const Icon = CATEGORY_ICON[c.id];
                const pct = stats.total ? Math.round(((s?.total ?? 0) / stats.total) * 100) : 0;
                return (
                  <li key={c.id} style={{ "--sg-accent": c.color } as React.CSSProperties} title={`${c.label} : ${s?.total ?? 0}`}>
                    <Icon size={14} aria-hidden="true" /><span className="sg-stat-label">{c.label}</span>
                    <span className="sg-stat-bar"><span style={{ width: `${pct}%` }} /></span><span className="sg-stat-n">{s?.total ?? 0}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </header>

      {loading ? (
        <div className="sg-card mt-6 h-64 animate-pulse" />
      ) : !canReport ? (
        <div className="sg-card sg-empty mt-6">
          <span className="sg-empty-icon"><Flag size={28} /></span>
          <p className="text-lg font-bold">{user ? "Les signalements demandent un compte résident" : "Connecte-toi pour signaler"}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">On pourra ainsi te dire où en est ton signalement. Ton nom n&apos;est jamais montré.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href={`/inscription?next=${encodeURIComponent("/signaler")}`} className="ig-btn">Créer un compte</Link>
            {!user && <Link href={loginHref("/signaler")} className="ig-btn-secondary">J&apos;ai déjà un compte</Link>}
          </div>
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Signaler" className="sg-tabs">
            {tabs.map((t, i) => {
              const Icon = t.icon;
              return (
                <button key={t.id} id={`sg-tab-${t.id}`} type="button" role="tab" aria-selected={tab === t.id} aria-controls="sg-tabpanel" tabIndex={tab === t.id ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  onKeyDown={(e) => {
                    const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i + tabs.length - 1) % tabs.length : null;
                    if (next === null) return;
                    e.preventDefault(); setTab(tabs[next].id); document.getElementById(`sg-tab-${tabs[next].id}`)?.focus();
                  }}>
                  <Icon size={16} /> {t.label}{t.n ? <span className="sg-tab-n">{t.n}</span> : null}
                </button>
              );
            })}
          </div>
          <div id="sg-tabpanel" role="tabpanel" aria-labelledby={`sg-tab-${tab}`} className="mt-5">
            {tab === "signaler" && (
              <ReportFlow onSeeMine={() => setTab("mes")} onCreated={(r) => { setMine((m) => [r, ...(m ?? [])]); void loadStats(); }} />
            )}
            {tab === "mes" && <MyReports reports={mine} onNew={() => setTab("signaler")} onRemoved={(id) => { setMine((m) => m?.filter((r) => r.id !== id) ?? null); void loadStats(); }} />}
            {tab === "suivi" && sdc && <SdcReports />}
          </div>
        </>
      )}
    </div>
  );
}
