import { Suspense } from "react";
import { SdcEntryView } from "@/components/SdcEntryView";

// Fiche d'un commerce de la liste SDC : params lus dans un <Suspense> (cacheComponents).
export default function SdcEntryPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-10 text-center text-muted">Chargement…</div>}>
      {params.then(({ id }) => (
        <SdcEntryView id={decodeURIComponent(id)} />
      ))}
    </Suspense>
  );
}
