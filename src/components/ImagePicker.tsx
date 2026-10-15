"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { MAX_IMAGES } from "@/lib/constants";

// Réduit l'image côté téléphone (1600 px max, JPEG) avant l'envoi : plus rapide sur le Wi-Fi du hackathon.
// Le ré-encodage retire aussi les métadonnées (dont la position GPS de la photo).
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Ce fichier n'est pas une image.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Compression impossible."))), "image/jpeg", 0.82),
  );
}

// Zone « Glisse tes photos ici » façon Instagram + vignettes.
export function ImagePicker({ images, onChange }: { images: string[]; onChange: (urls: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    const urls = [...images];
    try {
      for (const file of Array.from(files).slice(0, MAX_IMAGES - images.length)) {
        const form = new FormData();
        form.append("file", new File([await compressImage(file)], "image.jpg", { type: "image/jpeg" }));
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Envoi impossible.");
        urls.push(data.url);
        onChange([...urls]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      {images.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
          className={`flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-5 text-center transition ${drag ? "border-ig-blue bg-ig-blue/5" : "border-line bg-soft"}`}
        >
          <ImagePlus size={34} strokeWidth={1.3} className="text-muted" />
          <p className="text-sm font-semibold">Donne un visage à ton idée</p>
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="ig-btn">
            {busy ? "Envoi…" : "Sélectionner des photos"}
          </button>
          <p className="max-w-xs text-[11px] text-muted">Glisse tes photos ici, jusqu&apos;à {MAX_IMAGES} images. Sans photo, on crée une affiche en couleur.</p>
        </div>
      ) : (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {images.map((url) => (
            <div key={url} className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => onChange(images.filter((u) => u !== url))} aria-label="Retirer"
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white">
                <X size={14} />
              </button>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <button type="button" disabled={busy} onClick={() => input.current?.click()}
              className="grid h-28 w-28 shrink-0 place-items-center rounded-lg border border-dashed border-line bg-soft text-muted">
              {busy ? "Envoi…" : <ImagePlus size={28} />}
            </button>
          )}
        </div>
      )}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      {error && <p className="mt-2 text-sm text-ig-red">{error}</p>}
    </div>
  );
}
