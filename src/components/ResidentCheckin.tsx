"use client";
import { notifyResidentProgress } from "@/lib/resident-feedback";
import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useSession } from "@/lib/session";
import { isResidentAccount } from "@/lib/resident-progress-options";
import { AuthPrompt } from "./AuthPrompt";
export function ResidentCheckin({ id }: { id: string }) {
  const { user, loading } = useSession();
  const [activity, setActivity] = useState<{
    title: string;
    place: string;
  } | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user || !isResidentAccount(user.accountType)) return;
    let active = true;
    fetch(`/api/resident-progress/checkin/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (active) {
          setActivity(d.activity);
          setUrl(window.location.href);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, user]);
  if (loading) return <p className="p-8">Chargement…</p>;
  if (!user)
    return (
      <AuthPrompt
        title="Check-in résident"
        text="Connecte-toi pour enregistrer ta participation."
        next={`/checkin/${id}`}
      />
    );
  if (!isResidentAccount(user.accountType))
    return <p className="p-8">Ce check-in est réservé aux résidents.</p>;
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/resident-progress/checkin/${id}`, {
        method: "POST",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setResult(`Check-in enregistré : +${d.points} points.`);
      notifyResidentProgress();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto max-w-lg space-y-5 p-8">
      <h1 className="text-3xl font-bold">Check-in</h1>
      {error && <p role="alert">{error}</p>}
      {activity && (
        <>
          <h2 className="text-xl font-semibold">{activity.title}</h2>
          <p>{activity.place}</p>
          {url && (
            <div className="inline-block rounded-xl bg-white p-5">
              <QRCodeSVG value={url} size={220} title="QR du check-in" />
            </div>
          )}
          <p>
            +10 points pour ta participation.
          </p>
          {result ? (
            <p role="status">{result}</p>
          ) : (
            <button
              className="rounded-xl bg-ig-blue px-5 py-3 font-semibold text-white disabled:opacity-50"
              disabled={busy}
              onClick={() => void submit()}
            >
              Enregistrer mon check-in
            </button>
          )}
        </>
      )}
      <Link className="block text-ig-blue" href="/moi">
        Retour à mon profil
      </Link>
    </section>
  );
}
