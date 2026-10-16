"use client";
import { useEffect, useState } from "react";
export function ResidentPublicProfile({ id }: { id: string }) {
  const [data, setData] = useState<{
    level: string;
    badges: { id: string; label: string; emoji: string; description: string }[];
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch(`/api/residents/${id}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <section className="mx-auto max-w-2xl space-y-5 p-8">
      <h1 className="text-3xl font-bold">Profil complice</h1>
      {error ? (
        <p role="alert">{error}</p>
      ) : !data ? (
        <p>Chargement…</p>
      ) : (
        <>
          <p className="text-xl font-semibold">{data.level}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.badges.map((b) => (
              <li key={b.id} className="rounded-xl border border-line p-4">
                <strong>
                   {b.label}
                </strong>
                <p className="mt-2 text-sm text-muted">{b.description}</p>
              </li>
            ))}
          </ul>
          {!data.badges.length && <p>Les premiers badges sont à venir.</p>}
        </>
      )}
    </section>
  );
}
