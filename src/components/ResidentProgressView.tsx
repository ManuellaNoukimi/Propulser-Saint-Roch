"use client";
import { notifyResidentProgress } from "@/lib/resident-feedback";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/session";
import type { getResidentProgress } from "@/lib/resident-progress";
type Progress = ReturnType<typeof getResidentProgress>;
const panel = "rounded-2xl border border-line bg-bg p-5 sm:p-6";
const button =
  "rounded-xl bg-ig-blue px-4 py-2.5 font-semibold text-white disabled:opacity-50";
export function ResidentProgressView() {
  const { user } = useSession();
  const [data, setData] = useState<Progress | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [code, setCode] = useState("");
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/resident-progress", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Chargement impossible.");
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible.");
    }
  }, []);
  useEffect(() => {
    const first = setTimeout(() => void load(), 0); // hors du rendu (règle React 19 : pas de setState synchrone dans un effet)
    const focus = () => void load();
    window.addEventListener("focus", focus);
    return () => {
      clearTimeout(first);
      window.removeEventListener("focus", focus);
    };
  }, [load]);
  async function act(path: string, body?: unknown, method = "POST") {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/resident-progress${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Action impossible.");
      setNotice("Enregistré !");
      notifyResidentProgress();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!data)
    return (
      <div className="p-8">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button onClick={() => void load()}>Réessayer</button>
          </>
        ) : (
          "Chargement de ton profil…"
        )}
      </div>
    );
  const ratio = data.next
    ? Math.min(
        100,
        (100 * (data.score - data.level.minimum)) /
          (data.next.minimum - data.level.minimum),
      )
    : 100;
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">MON ESPACE RÉSIDENT</p>
          <h1 className="mt-2 text-3xl font-bold">
            Bonjour {user?.displayName}
          </h1>
          <p className="mt-2 text-muted">
            Tes petits gestes font grandir le quartier.
          </p>
        </div>
        <Link
          className="rounded-xl border border-line px-4 py-2"
          href="/moi/modifier"
        >
          Modifier mon compte
        </Link>
      </header>
      {error && (
        <p role="alert" className="rounded-xl bg-soft p-3 text-ig-red">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <section className={panel + " bg-soft"} aria-label="Mon score">
        <p className="font-semibold">{data.level.label}</p>
        <p className="my-3 text-5xl font-bold">
          {data.score} <span className="text-lg font-normal">points</span>
        </p>
        <div
          role="progressbar"
          aria-label="Progression vers le prochain niveau"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ratio)}
          className="h-3 overflow-hidden rounded-full bg-sep"
        >
          <div
            className="h-full rounded-full bg-ig-blue"
            style={{ width: `${ratio}%` }}
          />
        </div>
        <p className="mt-3">
          {data.next
            ? `Encore ${data.remaining} points pour devenir ${data.next.label} (${data.next.minimum} points).`
            : "Tu as atteint le plus haut niveau !"}
        </p>
        <p className="mt-2 text-sm text-muted">
          {data.today}/{data.dailyLimit} points gagnés aujourd’hui. Ton score ne
          baisse jamais. Aucun point pour les signalements.
        </p>
      </section>
      <section className={panel}>
        <h2 className="text-xl font-bold">Mes badges</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.badges.map((b) => (
            <div
              key={b.id}
              className={`rounded-xl border border-line p-4 ${b.earned ? "bg-soft" : "opacity-60"}`}
            >
              <p className="font-semibold">
                {b.emoji} {b.label}
              </p>
              <p className="mt-1 text-sm text-muted">{b.description}</p>
              <p className="mt-2 text-xs">
                {b.earned ? "Débloqué" : "À découvrir"}
              </p>
            </div>
          ))}
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={panel}>
          <h2 className="text-xl font-bold">Mon historique privé</h2>
          <p className="mt-2 text-sm text-muted">
            Tes 50 dernières actions. Visible uniquement par toi.
          </p>
          {data.history.length ? (
            <ul className="mt-4 space-y-3">
              {data.history.map((h) => (
                <li
                  key={h.id}
                  className="flex justify-between gap-3 border-b border-line pb-3"
                >
                  <div>
                    <p>{h.label}</p>
                    <time className="text-xs text-muted">
                      {new Date(h.createdAt).toLocaleDateString("fr-CA")}
                    </time>
                  </div>
                  <strong className="whitespace-nowrap">+{h.points} pts</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-muted">
              Ton histoire commence avec ta prochaine contribution.
            </p>
          )}
        </section>
        <div className="space-y-6">
          <section className={panel}>
            <h2 className="text-xl font-bold">Ma visibilité</h2>
            <label className="mt-4 flex items-start gap-3">
              <input
                type="checkbox"
                checked={data.publicProfile}
                disabled={busy}
                onChange={(e) =>
                  void act("", { publicProfile: e.target.checked }, "PATCH")
                }
              />
              <span>Partager publiquement mon niveau et mes badges</span>
            </label>
            <p className="mt-3 text-sm text-muted">
              Désactivé par défaut. Ton score, ton historique et tes lieux
              restent privés.
            </p>
            {data.publicProfile && (
              <Link
                className="mt-3 inline-block text-ig-blue"
                href={`/residents/${user?.id}`}
              >
                Voir mon profil public
              </Link>
            )}
          </section>
          <section className={panel}>
            <h2 className="text-xl font-bold">Inviter un ami</h2>
            <p className="mt-2 text-sm text-muted">
              +10 points lorsqu’un nouveau résident s’inscrit avec ton code.
            </p>
            <code className="mt-3 block break-all">{data.referralCode}</code>
            <button
              className={button + " mt-4"}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}/inscription?ref=${data.referralCode}`,
                  );
                  setNotice("Lien d’invitation copié.");
                } catch {
                  setError(
                    "La copie est indisponible. Utilise ton code ci-dessus.",
                  );
                }
              }}
            >
              Copier mon lien
            </button>
          </section>
        </div>
      </div>
      {data.helpToConfirm.length > 0 && (
        <section className={panel}>
          <h2 className="text-xl font-bold">Confirmer un coup de main reçu</h2>
          <ul className="mt-4 space-y-4">
            {data.helpToConfirm.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <p>
                  {h.displayName} — {h.title}
                  <span className="block text-sm text-muted">
                    {h.contribution} · confirme seulement l’aide réellement
                    reçue.
                  </span>
                </p>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void act(`/help/${h.id}`)}
                >
                  Confirmer l’aide
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={panel}>
          <h2 className="text-xl font-bold">Check-in QR · simulation</h2>
          <p className="mt-2 text-sm text-muted">
            +10 points, une seule fois par activité et au maximum une fois par
            lieu et par jour. Cette démonstration ne prouve pas une présence
            réelle.
          </p>
          <ul className="mt-4 max-h-60 space-y-3 overflow-auto">
            {data.activities.map((a) => (
              <li key={a.id}>
                <Link
                  className="text-ig-blue underline"
                  href={`/checkin/${a.id}`}
                >
                  {a.title}
                </Link>
                <p className="text-xs text-muted">{a.place}</p>
              </li>
            ))}
          </ul>
          {!data.activities.length && (
            <p className="mt-4">Aucune activité disponible.</p>
          )}
        </section>
        <section className={panel}>
          <h2 className="text-xl font-bold">Midi Complice · simulation</h2>
          <p className="mt-2 text-sm text-muted">
            +10 points, une fois par jour. Code de démonstration : MIDI-DEMO.
          </p>
          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void act("/midi", { code });
            }}
          >
            <input
              className="min-w-0 flex-1 rounded-xl border border-line bg-bg p-3"
              aria-label="Code Midi Complice"
              value={code}
              maxLength={80}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <button className={button} disabled={busy}>
              Valider
            </button>
          </form>
        </section>
      </div>
      <section className={panel}>
        <h2 className="text-xl font-bold">
          Ma carte récompense · démonstration
        </h2>
        <p className="mt-2">100 points : exemple de rabais de 10 %.</p>
        <p className="mt-2 text-sm text-muted">
          Carte simulée, sans valeur en caisse. Aucune offre commerciale réelle
          n’est activée. Tes points sont conservés.
        </p>
        {data.reward.card ? (
          <div className="mt-4 rounded-xl bg-soft p-5">
            <p className="text-xl font-bold">10 % · DÉMO</p>
            <code>{data.reward.card.code}</code>
          </div>
        ) : (
          <button
            className={button + " mt-4"}
            disabled={busy || !data.reward.available}
            onClick={() => void act("/reward")}
          >
            {data.reward.available
              ? "Créer ma carte de démonstration"
              : `Encore ${100 - data.score} points`}
          </button>
        )}
      </section>
    </div>
  );
}
