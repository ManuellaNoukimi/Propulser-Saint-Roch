"use client";

import { useState } from "react";
import { MessageCircle, Store } from "lucide-react";
import "./vitrines/vitrines.css";
import { ResidentNeedsView } from "./ResidentNeedsView";
import { VitrinesView } from "./VitrinesView";

// Page /vitrines : locaux et besoins, avec les mêmes votes, demandes et soutiens.
// « Locaux vacants » : liste SDC, carte, « Ce que je veux ici », « L'occuper en attendant ».
// « Besoins des résidents » : ce qui manque, par zone, et « Moi aussi ».
const TABS = [
  { id: "locaux", label: "Locaux vacants", icon: Store },
  { id: "besoins", label: "Besoins des résidents", icon: MessageCircle },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function VitrinesPage() {
  const [tab, setTab] = useState<TabId>("locaux");
  return (
    <div className="vitrines-page">
      <header className="mx-auto max-w-[1240px] px-4 pt-7 md:px-8 md:pt-10 lg:px-10">
        <h1 className="text-2xl font-bold md:text-3xl">Vitrines</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">Des locaux à faire vivre, des besoins à partager.</p>
        <div role="tablist" aria-label="Vitrines" className="mt-7 flex gap-5 border-b border-line sm:gap-8">
          {TABS.map((t, index) => {
            const Icon = t.icon;
            return <button key={t.id} id={`vitrines-tab-${t.id}`} type="button" role="tab" aria-selected={tab === t.id} aria-controls={`vitrines-panel-${t.id}`} tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)}
              onKeyDown={(event) => {
                const next = event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : event.key === "ArrowRight" ? (index + 1) % TABS.length : event.key === "ArrowLeft" ? (index + TABS.length - 1) % TABS.length : null;
                if (next === null) return;
                event.preventDefault(); setTab(TABS[next].id);
                document.getElementById(`vitrines-tab-${TABS[next].id}`)?.focus();
              }}
              className={`-mb-px flex min-h-12 min-w-0 items-center gap-2 border-b-2 pb-3 pt-2 text-left text-xs font-semibold transition sm:text-sm ${tab === t.id ? "border-ig-blue text-ig-blue" : "border-transparent text-muted hover:text-fg"}`}>
              <Icon size={17} className="shrink-0" /> {t.label}
            </button>;
          })}
        </div>
      </header>
      <div id={`vitrines-panel-${tab}`} role="tabpanel" aria-labelledby={`vitrines-tab-${tab}`}>
        {tab === "locaux" ? <VitrinesView /> : <ResidentNeedsView />}
      </div>
    </div>
  );
}
