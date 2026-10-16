"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ImagePlus, LoaderCircle, Lock, Phone, ShieldCheck, X } from "lucide-react";
import { MAX_REPORT_PHOTOS, REPORT_CATEGORIES, REPORT_DESCRIPTION_MIN, reportCategoryOf, reportSubtypeOf, type ReportCategoryId } from "@/lib/constants";
import { toast } from "@/lib/toast";
import type { Report } from "@/lib/types";
import { compressImage } from "../ImagePicker";
import { PlacePicker, type PickedPlace } from "./PlacePicker";
import { CATEGORY_ICON, CategoryBadge, momentOptions } from "./report-ui";
import { Select } from "./Select";

type Photo = { blob: Blob; url: string };
type Draft = { category: ReportCategoryId | null; subtype: string | null; place: PickedPlace | null; description: string; moment: string | null };
const EMPTY: Draft = { category: null, subtype: null, place: null, description: "", moment: null };
const DRAFT_KEY = "complices:signalement-brouillon";
const STEPS = ["Quoi ?", "Où ?", "Détails"] as const;
const readDraft = (): Draft => { try { return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "{}") }; } catch { return EMPTY; } };

/** Nouveau signalement en 3 étapes : catégorie (+ précision), endroit sur la carte, description (+ moment, photos). */
export function ReportFlow({ onCreated, onSeeMine }: { onCreated: (r: Report) => void; onSeeMine: () => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Report | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const photosRef = useRef(photos);
  useEffect(() => { photosRef.current = photos; });

  // Brouillon gardé le temps de l'onglet (on peut recharger la page sans tout perdre)
  useEffect(() => { const t = setTimeout(() => setDraft(readDraft()), 0); return () => clearTimeout(t); }, []);
  useEffect(() => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* stockage indisponible */ } }, [draft]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const cat = reportCategoryOf(draft.category);
  const accent = cat?.color ?? "var(--blue)";
  const descOk = draft.description.trim().length >= REPORT_DESCRIPTION_MIN;
  const canGo = [!!cat, !!draft.place, descOk];
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  function go(to: number) {
    setError(null);
    setStep(to);
    top.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  function chooseCategory(id: ReportCategoryId) {
    const next = reportCategoryOf(id)!;
    set({ category: id, subtype: draft.category === id ? draft.subtype : null });
    if (!next.photos && photos.length) { photos.forEach((p) => URL.revokeObjectURL(p.url)); setPhotos([]); }
  }
  async function addPhotos(files: FileList | null) {
    if (!files) return;
    const added: Photo[] = [];
    for (const f of Array.from(files).slice(0, MAX_REPORT_PHOTOS - photos.length)) {
      if (!f.type.startsWith("image/")) continue;
      const blob = await compressImage(f).catch(() => null);
      if (blob) added.push({ blob, url: URL.createObjectURL(blob) });
    }
    setPhotos((cur) => [...cur, ...added].slice(0, MAX_REPORT_PHOTOS));
  }
  function removePhoto(i: number) {
    setPhotos((cur) => { URL.revokeObjectURL(cur[i].url); return cur.filter((_, n) => n !== i); });
  }

  async function submit() {
    if (!cat || !draft.place || !descOk) return;
    setSending(true);
    setError(null);
    const data = { category: cat.id, subtype: draft.subtype, description: draft.description.trim(), moment: draft.moment, address: draft.place.address, lat: draft.place.lat, lng: draft.place.lng };
    let body: BodyInit;
    const headers: HeadersInit = {};
    if (photos.length && cat.photos) {
      const form = new FormData();
      form.set("data", JSON.stringify(data));
      photos.forEach((p, i) => form.append("photos", p.blob, `photo-${i + 1}.jpg`));
      body = form;
    } else {
      body = JSON.stringify(data);
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch("/api/reports", { method: "POST", headers, body }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setSending(false);
    if (!res?.ok) return setError(d?.error ?? "Envoi impossible. Vérifie ta connexion et réessaie.");
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setDraft(EMPTY);
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* rien */ }
    setDone(d.report);
    onCreated(d.report);
    toast("Signalement envoyé");
  }

  if (done) {
    const c = reportCategoryOf(done.category);
    return (
      <div className="sg-card sg-done" style={{ "--sg-accent": c?.color } as React.CSSProperties}>
        <span className="sg-done-check" aria-hidden="true"><Check size={34} strokeWidth={3} /></span>
        <h2 className="text-xl font-bold">Merci, c&apos;est envoyé</h2>
        <p className="mt-1 text-sm text-muted">Ton signalement est entre de bonnes mains. Tu verras ici quand il avance.</p>
        <p className="sg-ref">N° de suivi <strong>{done.ref}</strong></p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" className="ig-btn" onClick={onSeeMine}>Suivre mes signalements</button>
          <button type="button" className="ig-btn-secondary" onClick={() => { setDone(null); go(0); }}>Signaler autre chose</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={top} className="sg-card scroll-mt-24" style={{ "--sg-accent": accent } as React.CSSProperties}>
      <ol className="sg-steps" aria-label="Étapes du signalement">
        {STEPS.map((label, i) => {
          const reachable = i <= step || canGo.slice(0, i).every(Boolean);
          return (
            <li key={label} data-state={i < step ? "done" : i === step ? "current" : "todo"}>
              <button type="button" disabled={!reachable || i === step} onClick={() => go(i)} aria-current={i === step ? "step" : undefined}>
                <span className="sg-step-dot">{i < step ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
                <span className="sg-step-label">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div key={step} className="sg-panel">
        {step === 0 && (
          <section aria-labelledby="sg-q1">
            <h2 id="sg-q1" className="sg-question">Qu&apos;est-ce que tu veux signaler ?</h2>
            <div role="radiogroup" aria-labelledby="sg-q1" className="sg-categories">
              {REPORT_CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICON[c.id];
                const on = draft.category === c.id;
                return (
                  <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => chooseCategory(c.id)}
                    className="sg-category" style={{ "--sg-accent": c.color } as React.CSSProperties}>
                    <span className="sg-category-icon"><Icon size={24} /></span>
                    <span className="sg-category-text">
                      <span className="sg-category-label">{c.label}</span>
                      <span className="sg-category-hint">{c.hint}</span>
                    </span>
                    <span className="sg-category-check" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
                  </button>
                );
              })}
            </div>
            {cat && (
              <div className="sg-reveal mt-5 space-y-4">
                <Select label="Précision" optional accent={cat.color} value={draft.subtype} placeholder="Choisis une précision"
                  options={cat.subtypes.map((s) => ({ value: s.id, label: s.label }))} onChange={(v) => set({ subtype: v })} />
                <p className="sg-help"><Phone size={16} className="shrink-0" /> <span>{cat.help}</span></p>
                {cat.id === "itinerance" && (
                  <p className="sg-help is-soft"><ShieldCheck size={16} className="shrink-0" />
                    <span>On signale une situation, jamais une personne : pas de nom, pas de description physique, pas de photo. Le signalement sert à envoyer de l&apos;aide.</span>
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="sg-q2">
            <h2 id="sg-q2" className="sg-question">Où est-ce ?</h2>
            <PlacePicker value={draft.place} color={accent} onChange={(place) => set({ place })} />
          </section>
        )}

        {step === 2 && cat && (
          <section aria-labelledby="sg-q3" className="space-y-5">
            <h2 id="sg-q3" className="sg-question">Décris la situation</h2>
            <div>
              <label htmlFor="sg-desc" className="sg-label">Description</label>
              <textarea id="sg-desc" rows={5} maxLength={500} value={draft.description} onChange={(e) => set({ description: e.target.value })}
                placeholder={cat.placeholder} className="sg-textarea" aria-describedby="sg-desc-count" required />
              <p id="sg-desc-count" className="sg-count" data-ok={descOk}>
                {descOk ? <><Check size={13} /> Parfait</> : `Encore ${REPORT_DESCRIPTION_MIN - draft.description.trim().length} caractères au moins`}
                <span className="ml-auto">{draft.description.length}/500</span>
              </p>
            </div>
            <Select label="Quand ça arrive ?" optional accent={cat.color} value={draft.moment} placeholder="Choisis un moment" options={momentOptions} onChange={(v) => set({ moment: v })} />
            {cat.photos ? (
              <div>
                <span className="sg-label">Photos <span className="sg-optional">· facultatif, {MAX_REPORT_PHOTOS} au plus</span></span>
                <div className="sg-photos">
                  {photos.map((p, i) => (
                    <div key={p.url} className="sg-photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={`Photo ${i + 1}`} />
                      <button type="button" onClick={() => removePhoto(i)} aria-label={`Retirer la photo ${i + 1}`}><X size={14} /></button>
                    </div>
                  ))}
                  {photos.length < MAX_REPORT_PHOTOS && (
                    <label className="sg-photo-add">
                      <ImagePlus size={22} /><span>Ajouter</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple capture="environment" className="sr-only" onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
                    </label>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted">Photographie l&apos;endroit, pas les gens ni les plaques d&apos;immatriculation.</p>
              </div>
            ) : (
              <p className="sg-help is-soft"><ShieldCheck size={16} className="shrink-0" /> <span>Pas de photo pour l&apos;itinérance : on protège la personne.</span></p>
            )}

            <div className="sg-recap">
              <CategoryBadge category={cat.id} size={44} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{cat.label}{draft.subtype ? ` · ${reportSubtypeOf(cat.id, draft.subtype)?.label}` : ""}</p>
                <p className="truncate text-sm text-muted">{draft.place?.address ?? "Point choisi sur la carte"}</p>
              </div>
              <button type="button" className="sg-link" onClick={() => go(1)}>Modifier</button>
            </div>
            <p className="flex items-start gap-2 text-xs text-muted"><Lock size={14} className="mt-0.5 shrink-0" />
              Ton signalement est privé : il n&apos;apparaît jamais dans les publications. Seule la SDC le voit, sans ton nom, pour le traiter.</p>
          </section>
        )}
      </div>

      {error && <p role="alert" className="sg-alert mt-4">{error}</p>}

      <div className="sg-nav">
        {step > 0 ? (
          <button type="button" className="ig-btn-secondary" onClick={() => go(step - 1)}><ArrowLeft size={16} /> Retour</button>
        ) : <span />}
        {step < 2 ? (
          <button type="button" className="ig-btn sg-primary" disabled={!canGo[step]} onClick={() => go(step + 1)}>
            Continuer <ArrowRight size={16} />
          </button>
        ) : (
          <button type="button" className="ig-btn sg-primary" disabled={sending || !descOk} onClick={() => void submit()}>
            {sending ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />} Envoyer le signalement
          </button>
        )}
      </div>
    </div>
  );
}
